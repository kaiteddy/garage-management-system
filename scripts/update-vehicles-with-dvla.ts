import { Pool } from 'pg';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { dvlaService } from './services/dvla-service';
import { VehicleInfo } from './services/dvla-service';
import { promisify } from 'util';

// Load environment variables
const env = dotenv.config();
expand(env);

// Add delay between API calls to respect rate limits
const delay = promisify(setTimeout);
const API_DELAY_MS = 1000; // 1 second delay between API calls

class VehicleUpdater {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  public async getIncompleteVehicles(limit: number = 100) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, registration 
         FROM vehicles 
         WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')
         AND registration IS NOT NULL 
         AND registration != ''
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async updateVehicle(vehicleId: string, updates: Partial<VehicleInfo>) {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Add fields to update
      if (updates.make !== undefined) {
        fields.push(`make = $${paramIndex++}`);
        values.push(updates.make);
      }
      if (updates.model !== undefined) {
        fields.push(`model = $${paramIndex++}`);
        values.push(updates.model);
      }
      if (updates.yearOfManufacture) {
        fields.push(`year = $${paramIndex++}`);
        values.push(updates.yearOfManufacture);
      }
      if (updates.fuelType) {
        fields.push(`fuel_type = $${paramIndex++}`);
        values.push(updates.fuelType);
      }
      if (updates.engineCapacity) {
        fields.push(`engine_size = $${paramIndex++}`);
        values.push(updates.engineCapacity.toString());
      }
      if (updates.colour) {
        fields.push(`color = $${paramIndex++}`);
        values.push(updates.colour);
      }
      if (updates.motStatus) {
        fields.push(`mot_status = $${paramIndex++}`);
        values.push(updates.motStatus);
      }
      if (updates.taxStatus) {
        fields.push(`tax_status = $${paramIndex++}`);
        values.push(updates.taxStatus);
      }

      // Add updated_at timestamp
      fields.push(`updated_at = NOW()`);

      // Add vehicle ID as the last parameter
      values.push(vehicleId);

      if (fields.length > 1) { // More than just updated_at
        const query = `
          UPDATE vehicles 
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        
        await client.query(query, values);
        return true;
      }
      return false;
    } finally {
      client.release();
    }
  }

  public async processVehicles(limit: number = 10) {
    const vehicles = await this.getIncompleteVehicles(limit);
    console.log(`Found ${vehicles.length} vehicles to process`);

    let successCount = 0;
    let failCount = 0;

    for (const vehicle of vehicles) {
      try {
        console.log(`Processing vehicle ${vehicle.registration} (ID: ${vehicle.id})`);
        
        // Get vehicle info from DVLA
        const vehicleInfo = await dvlaService.getVehicleInfo(vehicle.registration);
        
        if (vehicleInfo) {
          console.log(`Found info for ${vehicle.registration}:`, 
            `${vehicleInfo.make} ${vehicleInfo.model} (${vehicleInfo.yearOfManufacture})`);
          
          // Update the vehicle in the database
          const updated = await this.updateVehicle(vehicle.id, vehicleInfo);
          
          if (updated) {
            console.log(`Successfully updated ${vehicle.registration}`);
            successCount++;
          } else {
            console.log(`No updates needed for ${vehicle.registration}`);
          }
        } else {
          console.log(`No info found for ${vehicle.registration}`);
          failCount++;
        }

        // Add delay to respect rate limits
        await delay(API_DELAY_MS);
        
      } catch (error) {
        console.error(`Error processing vehicle ${vehicle.registration}:`, error);
        failCount++;
      }
    }

    console.log(`\nProcessing complete!`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${failCount}`);
    
    return { successCount, failCount };
  }

  public async close() {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  if (!process.env.DVLA_API_KEY) {
    console.error('Error: DVLA_API_KEY environment variable is not set');
    console.error('Please get an API key from the DVLA and add it to your .env.local file:');
    console.error('DVLA_API_KEY=your_api_key_here');
    process.exit(1);
  }

  const updater = new VehicleUpdater();
  
  try {
    // Process vehicles in batches of 10 (can be adjusted)
    await updater.processVehicles(10);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  } finally {
    await updater.close();
  }
}

// Run the script
main().catch(console.error);
