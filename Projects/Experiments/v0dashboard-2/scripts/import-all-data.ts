import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables from .env file
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkTablesExist(client: any): Promise<boolean> {
  try {
    // Check if vehicles table exists
    const result = await client.query(
      "SELECT to_regclass('public.vehicles') as exists"
    );
    
    if (!result.rows[0].exists) {
      console.error('Error: Database tables do not exist. Please run migrations first.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking if tables exist:', error);
    return false;
  }
}

async function importVehicles(client: any, filePath: string): Promise<{successCount: number, errorCount: number}> {
  console.log(`Importing vehicles from ${filePath}...`);
  
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length <= 1) {
      console.error('No data found in the CSV file');
      return { successCount: 0, errorCount: 0 };
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    let successCount = 0;
    let errorCount = 0;
    
    // Process in smaller batches to avoid timeouts
    const batchSize = 50;
    let batch: any[] = [];
    const totalLines = lines.length - 1; // Subtract 1 for header
    
    console.log(`Found ${totalLines} vehicles to import...`);
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const vehicle: Record<string, string> = {};
        
        // Map CSV values to object properties
        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
          vehicle[headers[j]] = values[j];
        }
        
        batch.push(vehicle);
        
        // Process batch if it reaches the batch size
        if (batch.length >= batchSize) {
          try {
            await processVehicleBatch(client, batch);
            successCount += batch.length;
            const progress = ((i / totalLines) * 100).toFixed(2);
            console.log(`Processed ${i}/${totalLines} vehicles (${progress}%)...`);
            batch = [];
          } catch (batchError) {
            console.error(`Error processing batch starting at line ${i - batchSize + 1}:`, batchError);
            errorCount += batch.length;
            batch = []; // Reset batch on error
          }
        }
      } catch (lineError) {
        console.error(`Error processing line ${i + 1}:`, lineError);
        errorCount++;
      }
    }
    
    // Process any remaining items in the batch
    if (batch.length > 0) {
      try {
        await processVehicleBatch(client, batch);
        successCount += batch.length;
        console.log(`Processed ${successCount}/${totalLines} vehicles (100.00%)...`);
      } catch (finalBatchError) {
        console.error('Error processing final batch:', finalBatchError);
        errorCount += batch.length;
      }
    }
    
    return { successCount, errorCount };
  } catch (fileError) {
    console.error('Error reading or processing CSV file:', fileError);
    throw fileError; // Re-throw to be caught by the main function
  }
}

// Helper function to safely truncate strings to a maximum length
function safeTruncate(str: string | null | undefined, maxLength: number): string | null {
  if (!str) return null;
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

// Helper function to parse dates safely
function safeParseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch (e) {
    return null;
  }
}

async function processVehicleBatch(client: any, batch: any[]) {
  const values = [];
  const valueStrings = [];
  let paramIndex = 1;
  
  for (const vehicle of batch) {
    try {
      const vehicleValues = [
        safeTruncate(vehicle.registration, 20) || null,
        safeTruncate(vehicle.make, 50) || null,
        safeTruncate(vehicle.model, 50) || null,
        vehicle.year ? parseInt(vehicle.year) || null : null,
        safeTruncate(vehicle.color, 30) || null,
        safeTruncate(vehicle.fuel_type, 20) || null,
        safeTruncate(vehicle.engine_size, 20) || null,
        safeTruncate(vehicle.vin, 20) || null,
        safeTruncate(vehicle.mot_status, 20) || null,
        safeParseDate(vehicle.mot_expiry_date),
        safeTruncate(vehicle.tax_status, 20) || null,
        safeParseDate(vehicle.tax_due_date),
        vehicle.owner_id || null,
        new Date().toISOString(),
        new Date().toISOString()
      ];
      
      values.push(...vehicleValues);
      valueStrings.push(
        `(${vehicleValues.map((_, i) => `$${paramIndex + i}`).join(', ')})`
      );
      paramIndex += vehicleValues.length;
    } catch (error) {
      console.error(`Error processing vehicle ${vehicle.registration}:`, error);
      // Skip this record and continue with the next one
      continue;
    }
  }
  
  if (valueStrings.length === 0) {
    return; // No valid records to process
  }
  
  const query = `
    INSERT INTO vehicles (
      registration, make, model, year, color, fuel_type, 
      engine_size, vin, mot_status, mot_expiry_date, 
      tax_status, tax_due_date, owner_id, created_at, updated_at
    ) VALUES ${valueStrings.join(', ')}
    ON CONFLICT (registration) DO UPDATE SET
      make = EXCLUDED.make,
      model = EXCLUDED.model,
      year = EXCLUDED.year,
      color = EXCLUDED.color,
      fuel_type = EXCLUDED.fuel_type,
      engine_size = EXCLUDED.engine_size,
      vin = EXCLUDED.vin,
      mot_status = EXCLUDED.mot_status,
      mot_expiry_date = EXCLUDED.mot_expiry_date,
      tax_status = EXCLUDED.tax_status,
      tax_due_date = EXCLUDED.tax_due_date,
      owner_id = EXCLUDED.owner_id,
      updated_at = EXCLUDED.updated_at
  `;
  
  await client.query(query, values);
}

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('Starting data import process...');
    
    // Check if tables exist
    if (!await checkTablesExist(client)) {
      process.exit(1);
    }
    
    // Import vehicles
    console.log('\n=== Importing Vehicles ===');
    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv';
    const vehicleResult = await importVehicles(client, vehiclesPath);
    
    console.log('\n=== Import Summary ===');
    console.log(`Vehicles: ${vehicleResult.successCount} imported, ${vehicleResult.errorCount} failed`);
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
main().catch(console.error);
