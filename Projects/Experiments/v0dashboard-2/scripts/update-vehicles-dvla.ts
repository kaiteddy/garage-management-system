import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import axios from 'axios';
import { createPool as createDbPool } from './utils/db-utils';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// DVLA API Configuration
const DVLA_API_KEY = process.env.DVLA_API_KEY;
const DVLA_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

if (!DVLA_API_KEY) {
  console.error('Error: DVLA_API_KEY is not set in environment variables');
  process.exit(1);
}

// Create database connection pool
const dbPool = createDbPool();

interface VehicleRecord {
  id: string;
  registration: string;
  make?: string;
  model?: string;
  year?: number;
  mot_expiry_date?: string | null;
  tax_due_date?: string | null;
  last_checked?: Date | null;
}

async function getVehiclesToUpdate(limit: number = 10): Promise<VehicleRecord[]> {
  const client = await dbPool.connect();
  try {
    const result = await client.query<VehicleRecord>(`
      SELECT id, registration, make, model, year, mot_expiry_date, tax_due_date, last_checked
      FROM vehicles
      WHERE registration IS NOT NULL
        AND registration != ''
        AND (last_checked IS NULL OR last_checked < NOW() - INTERVAL '30 days')
      ORDER BY last_checked NULLS FIRST
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getDVLAData(registration: string): Promise<{
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  taxStatus?: string;
  motStatus?: string;
  motExpiryDate?: string;
  taxDueDate?: string;
  colour?: string;
  fuelType?: string;
  engineCapacity?: number;
  markedForExport?: boolean;
  typeApproval?: string;
  dateOfLastV5CIssued?: string;
} | null> {
  try {
    const response = await axios.post(
      DVLA_API_URL,
      { registrationNumber: registration.replace(/\s+/g, '') },
      {
        headers: {
          'x-api-key': DVLA_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log(`Vehicle ${registration} not found in DVLA database`);
      } else {
        console.error(`Error fetching DVLA data for ${registration}:`, error.response?.data || error.message);
      }
    } else {
      console.error(`Unexpected error for ${registration}:`, error);
    }
    return null;
  }
}

async function updateVehicle(vehicleId: string, updates: Partial<VehicleRecord>) {
  const client = await dbPool.connect();
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build the SET clause dynamically based on provided updates
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      console.log('No fields to update');
      return;
    }

    // Always update last_checked
    fields.push('last_checked = NOW()');

    const query = `
      UPDATE vehicles
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, registration, make, model, year, mot_expiry_date, tax_due_date, last_checked
    `;

    const result = await client.query(query, [...values, vehicleId]);
    
    if (result.rowCount === 0) {
      console.warn(`No vehicle found with ID: ${vehicleId}`);
    } else {
      console.log(`Updated vehicle ${result.rows[0].registration} (${result.rows[0].id})`);
    }
  } catch (error) {
    console.error(`Error updating vehicle ${vehicleId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateVehicles() {
  console.log('Starting vehicle data update from DVLA...');
  
  // Get vehicles that need updating (prioritizing those never checked or checked longest ago)
  const vehicles = await getVehiclesToUpdate(20);
  
  if (vehicles.length === 0) {
    console.log('No vehicles need updating at this time.');
    return;
  }
  
  console.log(`Found ${vehicles.length} vehicles to update.`);
  
  for (const vehicle of vehicles) {
    try {
      console.log(`\nProcessing ${vehicle.registration}...`);
      
      // Get data from DVLA
      const dvlaData = await getDVLAData(vehicle.registration);
      
      if (!dvlaData) {
        console.log(`No data returned from DVLA for ${vehicle.registration}`);
        // Still update last_checked to avoid checking too frequently
        await updateVehicle(vehicle.id, {});
        continue;
      }
      
      // Prepare updates
      const updates: Partial<VehicleRecord> = {};
      
      // Only update fields that are missing or different
      if (dvlaData.make && dvlaData.make !== vehicle.make) {
        updates.make = dvlaData.make;
      }
      
      if (dvlaData.model && dvlaData.model !== vehicle.model) {
        updates.model = dvlaData.model;
      }
      
      if (dvlaData.yearOfManufacture && dvlaData.yearOfManufacture !== vehicle.year) {
        updates.year = dvlaData.yearOfManufacture;
      }
      
      // Update MOT and tax dates if available
      if (dvlaData.motExpiryDate) {
        updates.mot_expiry_date = new Date(dvlaData.motExpiryDate).toISOString();
      }
      
      if (dvlaData.taxDueDate) {
        updates.tax_due_date = new Date(dvlaData.taxDueDate).toISOString();
      }
      
      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        console.log(`Updating ${vehicle.registration} with:`, updates);
        await updateVehicle(vehicle.id, updates);
      } else {
        console.log(`No updates needed for ${vehicle.registration}`);
        // Still update last_checked
        await updateVehicle(vehicle.id, {});
      }
      
      // Add a small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing vehicle ${vehicle.registration}:`, error);
      // Continue with next vehicle even if one fails
    }
  }
  
  console.log('\nVehicle data update completed.');
}

// Run the update
updateVehicles()
  .catch(console.error)
  .finally(async () => {
    await dbPool.end();
    process.exit(0);
  });
