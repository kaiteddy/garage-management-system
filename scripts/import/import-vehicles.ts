import { createReadStream, readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

// Database connection pool
function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Define the Vehicle type
interface Vehicle {
  _ID: string;
  _ID_Customer?: string;
  registration?: string;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  fuel_type?: string;
  engine_size?: string;
  engine_code?: string;
  vin?: string;
  mot_status?: string;
  mot_expiry_date?: string;
  tax_status?: string;
  tax_due_date?: string;
  registration_date?: string;
  body_style?: string;
  doors?: string;
  transmission?: string;
  notes?: string;
}

async function importVehicles(filePath: string) {
  console.log(`Starting vehicle import from ${filePath}...`);
  
  const pool = createPool();
  const client = await pool.connect();
  
  try {
    // Read and parse the CSV file
    const fileContent = readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: (header: string[]) => header.map(col => col.trim()),
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      relax_column_count: true
    });
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 100;
    
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await processBatch(client, batch);
      imported += result.imported;
      skipped += result.skipped;
      errors += result.errors;
      
      // Log progress
      if (i % 1000 === 0 || i + batchSize >= records.length) {
        console.log(`Processed ${Math.min(i + batchSize, records.length)} of ${records.length} records...`);
      }
    }
    
    console.log('\nVehicle import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during vehicle import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Vehicle[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping vehicle - missing ID');
        skipped++;
        continue;
      }
      
      // Parse dates
      const motExpiryDate = record.mot_expiry_date ? new Date(record.mot_expiry_date) : null;
      const taxDueDate = record.tax_due_date ? new Date(record.tax_due_date) : null;
      const registrationDate = record.registration_date ? new Date(record.registration_date) : null;
      
      // Prepare vehicle data
      const vehicle = {
        id: record._ID,
        customer_id: record._ID_Customer || null,
        registration: (record.registration || '').substring(0, 20) || null,
        make: (record.make || '').substring(0, 50) || null,
        model: (record.model || '').substring(0, 50) || null,
        year: record.year ? parseInt(record.year, 10) : null,
        color: (record.color || '').substring(0, 30) || null,
        fuel_type: (record.fuel_type || '').substring(0, 20) || null,
        engine_size: (record.engine_size || '').substring(0, 20) || null,
        engine_code: (record.engine_code || '').substring(0, 30) || null,
        vin: (record.vin || '').substring(0, 30) || null,
        mot_status: (record.mot_status || '').substring(0, 20) || null,
        mot_expiry_date: motExpiryDate,
        tax_status: (record.tax_status || '').substring(0, 20) || null,
        tax_due_date: taxDueDate,
        registration_date: registrationDate,
        body_style: (record.body_style || '').substring(0, 30) || null,
        doors: record.doors ? parseInt(record.doors, 10) : null,
        transmission: (record.transmission || '').substring(0, 20) || null,
        notes: (record.notes || '').substring(0, 1000) || null
      };
      
      // First, check if the customer exists
      let customerId = null;
      if (vehicle.customer_id) {
        try {
          const customerCheck = await client.query(
            'SELECT id FROM customers WHERE id = $1',
            [vehicle.customer_id]
          );
          customerId = customerCheck.rows.length > 0 ? vehicle.customer_id : null;
        } catch (error) {
          console.log(`Customer check failed for ${vehicle.customer_id}, setting to NULL`);
          customerId = null;
        }
      }

      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO vehicles (
          id, customer_id, registration, make, model, year, color, fuel_type,
          engine_size, engine_code, vin, mot_status, mot_expiry_date,
          tax_status, tax_due_date, registration_date, body_style, doors,
          transmission, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = $2,
          registration = EXCLUDED.registration,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          color = EXCLUDED.color,
          fuel_type = EXCLUDED.fuel_type,
          engine_size = EXCLUDED.engine_size,
          engine_code = EXCLUDED.engine_code,
          vin = EXCLUDED.vin,
          mot_status = EXCLUDED.mot_status,
          mot_expiry_date = EXCLUDED.mot_expiry_date,
          tax_status = EXCLUDED.tax_status,
          tax_due_date = EXCLUDED.tax_due_date,
          registration_date = EXCLUDED.registration_date,
          body_style = EXCLUDED.body_style,
          doors = EXCLUDED.doors,
          transmission = EXCLUDED.transmission,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        `,
        [
          vehicle.id,
          customerId, // Use the validated customer ID or NULL
          vehicle.registration,
          vehicle.make,
          vehicle.model,
          vehicle.year,
          vehicle.color,
          vehicle.fuel_type,
          vehicle.engine_size,
          vehicle.engine_code,
          vehicle.vin,
          vehicle.mot_status,
          vehicle.mot_expiry_date,
          vehicle.tax_status,
          vehicle.tax_due_date,
          vehicle.registration_date,
          vehicle.body_style,
          vehicle.doors,
          vehicle.transmission,
          vehicle.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} vehicles...`);
      }
      
    } catch (error: any) {
      console.error(`Error importing vehicle ${record._ID || 'unknown'}:`, error.message);
      errors++;
      skipped++;
    }
  }
  
  return { imported, skipped, errors };
}

// Run the import if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide the path to the Vehicles.csv file');
    process.exit(1);
  }
  
  importVehicles(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importVehicles };
