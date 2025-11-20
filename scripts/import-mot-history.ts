import { Pool } from 'pg';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface MOTHistoryRecord {
  registration: string;
  test_date: string;
  expiry_date: string;
  test_result: string;
  odometer_value: string;
  odometer_unit: string;
  test_number: string;
  has_failures: string;
  has_advisories: string;
}

async function importMOTHistory(filePath: string) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records: MOTHistoryRecord[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Found ${records.length} MOT history records to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Check if this test already exists
        const exists = await client.query(
          'SELECT 1 FROM mot_history WHERE test_number = $1',
          [record.test_number]
        );

        if (exists.rows.length > 0) {
          console.log(`Skipping existing MOT test ${record.test_number} for ${record.registration}`);
          skipped++;
          continue;
        }

        // Insert the MOT history record
        await client.query(
          `INSERT INTO mot_history (
            registration, test_date, expiry_date, test_result, 
            odometer_value, odometer_unit, test_number, 
            has_failures, has_advisories
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            record.registration,
            record.test_date || null,
            record.expiry_date || null,
            record.test_result || null,
            record.odometer_value ? parseInt(record.odometer_value) : null,
            record.odometer_unit || null,
            record.test_number,
            record.has_failures === 'true',
            record.has_advisories === 'true'
          ]
        );

        console.log(`Imported MOT test ${record.test_number} for ${record.registration}`);
        imported++;

      } catch (error) {
        console.error(`Error importing MOT test ${record.test_number} for ${record.registration}:`, error);
        errors++;
      }
    }

    await client.query('COMMIT');
    
    return {
      total: records.length,
      imported,
      skipped,
      errors
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during MOT history import:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the import if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filePath = process.argv[2] || join(__dirname, '../data/mot_history.csv');
  
  console.log(`Starting MOT history import from ${filePath}...`);
  
  importMOTHistory(filePath)
    .then(result => {
      console.log('\nImport completed:');
      console.log(`- Total records: ${result.total}`);
      console.log(`- Imported: ${result.imported}`);
      console.log(`- Skipped: ${result.skipped}`);
      console.log(`- Errors: ${result.errors}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importMOTHistory };
