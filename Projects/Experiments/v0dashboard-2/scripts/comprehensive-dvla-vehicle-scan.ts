#!/usr/bin/env tsx
/**
 * Comprehensive DVLA Vehicle Scanner
 * Scans ALL vehicles against DVLA API to populate MOT expiry dates and vehicle details
 * Updates MOT reminder system with complete data
 */

import { Pool } from 'pg';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

// Database configuration - use DIRECT_URL for migrations and scripts
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Configuration
const CONFIG = {
  batchSize: 25, // Optimal batch size for production
  concurrency: 1, // Keep concurrency low to respect API limits
  maxRetries: 3,
  retryDelay: 2000,
  requestDelay: 2000, // 2 seconds between requests to be conservative
  dvlaApiKey: process.env.DVLA_API_KEY,
  dvlaBaseUrl: 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
  minDaysBetweenScans: 1, // Minimum days between scans for the same vehicle
  testMode: false, // Disable test mode for full run
  maxVehicles: 1000, // Limit for safety
};

// Statistics tracking
const stats = {
  totalVehicles: 0,
  processed: 0,
  updated: 0,
  errors: 0,
  skipped: 0,
  apiCalls: 0,
  startTime: new Date(),
};

interface Vehicle {
  registration: string;
  make?: string;
  model?: string;
  lastDvlaCheck?: Date;
  motExpiryDate?: string;
  taxStatus?: string;
  taxDueDate?: string;
}

interface DVLAResponse {
  registrationNumber: string;
  make: string;
  model: string;
  colour: string;
  fuelType: string;
  engineCapacity?: number;
  co2Emissions?: number;
  markedForExport: boolean;
  vehicleStatus: string;
  vehicleCategory: string;
  dateOfLastV5CIssued: string;
  motStatus: string;
  motExpiryDate?: string;
  taxStatus: string;
  taxDueDate?: string;
  typeApproval?: string;
  wheelplan?: string;
  monthOfFirstRegistration: string;
  yearOfManufacture: number;
  euroStatus?: string;
  realDrivingEmissions?: string;
  dateOfLastV5CIssued?: string;
}

/**
 * Make DVLA API request with retry logic
 */
async function callDVLAAPI(registration: string): Promise<DVLAResponse | null> {
  const cleanReg = registration.replace(/\s+/g, '').toUpperCase();
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🔍 Checking ${cleanReg} (attempt ${attempt}/${CONFIG.maxRetries})`);
      
      const response = await fetch(CONFIG.dvlaBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.dvlaApiKey!,
        },
        body: JSON.stringify({
          registrationNumber: cleanReg
        }),
      });

      stats.apiCalls++;

      if (response.ok) {
        const data = await response.json() as DVLAResponse;
        console.log(`✅ ${cleanReg}: ${data.make} ${data.model} - MOT: ${data.motExpiryDate || 'N/A'}`);
        return data;
      } else if (response.status === 404) {
        console.log(`❌ ${cleanReg}: Vehicle not found in DVLA database`);
        return null;
      } else if (response.status === 429) {
        console.log(`⏳ Rate limited, waiting ${CONFIG.retryDelay * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * attempt));
        continue;
      } else {
        console.log(`❌ ${cleanReg}: API error ${response.status} - ${response.statusText}`);
        if (attempt === CONFIG.maxRetries) {
          return null;
        }
      }
    } catch (error) {
      console.log(`❌ ${cleanReg}: Network error - ${error}`);
      if (attempt === CONFIG.maxRetries) {
        return null;
      }
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
  }

  return null;
}

/**
 * Update vehicle with DVLA data
 */
async function updateVehicleWithDVLAData(registration: string, dvlaData: DVLAResponse): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update vehicle record
    const updateVehicleQuery = `
      UPDATE vehicles
      SET
        make = COALESCE($2, make),
        model = COALESCE($3, model),
        color = COALESCE($4, color),
        fuel_type = COALESCE($5, fuel_type),
        engine_capacity = COALESCE($6, engine_capacity),
        co2_emissions = COALESCE($7, co2_emissions),
        mot_status = $8,
        mot_expiry_date = $9,
        tax_status = $10,
        tax_due_date = $11,
        vehicle_status = $12,
        last_dvla_check = NOW(),
        updated_at = NOW()
      WHERE registration = $1
    `;

    await client.query(updateVehicleQuery, [
      registration,
      dvlaData.make,
      dvlaData.model,
      dvlaData.colour,
      dvlaData.fuelType,
      dvlaData.engineCapacity,
      dvlaData.co2Emissions,
      dvlaData.motStatus,
      dvlaData.motExpiryDate,
      dvlaData.taxStatus,
      dvlaData.taxDueDate,
      dvlaData.vehicleStatus,
    ]);

    // Note: MOT reminder creation disabled - existing table has different structure
    // The MOT expiry data is stored in the vehicles table and used by the materialized view

    await client.query('COMMIT');
    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to update vehicle ${registration}:`, error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Get vehicles that need DVLA scanning
 */
async function getVehiclesToScan(offset: number, limit: number): Promise<Vehicle[]> {
  const query = `
    SELECT
      registration,
      make,
      model,
      last_dvla_check,
      mot_expiry_date,
      tax_status,
      tax_due_date
    FROM vehicles
    WHERE
      registration IS NOT NULL
      AND registration != ''
      AND LENGTH(TRIM(registration)) >= 3
      AND LENGTH(TRIM(registration)) <= 8
      AND registration !~ '[*()]'  -- Exclude registrations with special characters
      AND registration ~ '^[A-Z0-9 ]+$'  -- Only letters, numbers, and spaces
      AND (
        last_dvla_check IS NULL
        OR last_dvla_check < NOW() - INTERVAL '${CONFIG.minDaysBetweenScans} days'
      )
    ORDER BY
      CASE WHEN last_dvla_check IS NULL THEN 0 ELSE 1 END,
      last_dvla_check ASC NULLS FIRST,
      registration
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

/**
 * Get total count of vehicles to scan
 */
async function getTotalVehicleCount(): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM vehicles 
    WHERE
      registration IS NOT NULL
      AND registration != ''
      AND LENGTH(TRIM(registration)) >= 3
      AND LENGTH(TRIM(registration)) <= 8
      AND registration !~ '[*()]'  -- Exclude registrations with special characters
      AND registration ~ '^[A-Z0-9 ]+$'  -- Only letters, numbers, and spaces
      AND (
        last_dvla_check IS NULL
        OR last_dvla_check < NOW() - INTERVAL '${CONFIG.minDaysBetweenScans} days'
      )
  `;

  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

/**
 * Process a batch of vehicles
 */
async function processBatch(vehicles: Vehicle[]): Promise<void> {
  const promises = vehicles.map(async (vehicle) => {
    try {
      // Add delay between requests to respect API limits
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
      
      const dvlaData = await callDVLAAPI(vehicle.registration);
      
      if (dvlaData) {
        const success = await updateVehicleWithDVLAData(vehicle.registration, dvlaData);
        if (success) {
          stats.updated++;
          console.log(`✅ Updated ${vehicle.registration} with DVLA data`);
        } else {
          stats.errors++;
        }
      } else {
        stats.skipped++;
        // Still update last_dvla_check to avoid repeated failed attempts
        await pool.query(
          'UPDATE vehicles SET last_dvla_check = NOW() WHERE registration = $1',
          [vehicle.registration]
        );
      }
      
      stats.processed++;
      
      // Progress update
      if (stats.processed % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime.getTime()) / 1000;
        const rate = stats.processed / elapsed;
        const eta = (stats.totalVehicles - stats.processed) / rate;
        
        console.log(`📊 Progress: ${stats.processed}/${stats.totalVehicles} (${((stats.processed/stats.totalVehicles)*100).toFixed(1)}%) - ETA: ${Math.round(eta/60)}min`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing vehicle ${vehicle.registration}:`, error);
      stats.errors++;
      stats.processed++;
    }
  });

  await Promise.all(promises);
}

/**
 * Main scanning function
 */
async function scanAllVehicles(): Promise<void> {
  console.log('🚀 Starting comprehensive DVLA vehicle scan...');
  
  if (!CONFIG.dvlaApiKey) {
    throw new Error('DVLA_API_KEY not found in environment variables');
  }

  // Get total count
  stats.totalVehicles = await getTotalVehicleCount();
  console.log(`📋 Found ${stats.totalVehicles} vehicles to scan`);

  if (CONFIG.testMode && stats.totalVehicles > CONFIG.maxVehicles) {
    stats.totalVehicles = CONFIG.maxVehicles;
    console.log(`🧪 Test mode: limiting to ${CONFIG.maxVehicles} vehicles`);
  }

  if (stats.totalVehicles === 0) {
    console.log('✅ No vehicles need scanning');
    return;
  }

  let offset = 0;
  
  while (offset < stats.totalVehicles) {
    console.log(`\n📦 Processing batch ${Math.floor(offset/CONFIG.batchSize) + 1}/${Math.ceil(stats.totalVehicles/CONFIG.batchSize)}`);
    
    const vehicles = await getVehiclesToScan(offset, CONFIG.batchSize);
    
    if (vehicles.length === 0) {
      break;
    }

    await processBatch(vehicles);
    
    offset += CONFIG.batchSize;
    
    // Small delay between batches
    if (offset < stats.totalVehicles) {
      console.log(`⏳ Waiting ${CONFIG.requestDelay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
    }
  }
}

/**
 * Print final statistics
 */
function printStats(): void {
  const elapsed = (Date.now() - stats.startTime.getTime()) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DVLA VEHICLE SCAN COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 Total Vehicles: ${stats.totalVehicles}`);
  console.log(`✅ Processed: ${stats.processed}`);
  console.log(`🔄 Updated: ${stats.updated}`);
  console.log(`⏭️  Skipped: ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`🌐 API Calls: ${stats.apiCalls}`);
  console.log(`⏱️  Duration: ${Math.round(elapsed)}s`);
  console.log(`📈 Rate: ${(stats.processed/elapsed).toFixed(2)} vehicles/sec`);
  console.log(`💰 Estimated Cost: £${(stats.apiCalls * 0.0025).toFixed(2)} (assuming £0.0025 per call)`);
  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await scanAllVehicles();
    printStats();
    
    console.log('\n🔄 Updating MOT critical dashboard...');
    // Trigger a refresh of MOT critical data
    await pool.query(`
      REFRESH MATERIALIZED VIEW mot_critical_vehicles;
    `);
    
    console.log('✅ MOT reminder system updated successfully!');
    
  } catch (error) {
    console.error('❌ Scan failed:', error);
    printStats();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Scan interrupted by user');
  printStats();
  await pool.end();
  process.exit(0);
});

// Run the scan
if (require.main === module) {
  main();
}

export { scanAllVehicles, CONFIG, stats };
