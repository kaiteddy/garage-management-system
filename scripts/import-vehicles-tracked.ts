import { Pool } from 'pg';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { trackImport, ImportOptions } from './utils/import-tracker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface VehicleRecord {
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
  fuel_type: string;
  engine_size: string;
  mot_status: string;
  mot_expiry_date: string;
  tax_status: string;
  tax_due_date: string;
  owner_id?: string;
  [key: string]: any;
}

async function importVehicles(filePath: string) {
  return trackImport<{
    imported: number;
    failed: number;
    skipped: number;
  }>('vehicles', async ({ onIssue }) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let imported = 0;
    let failed = 0;
    let skipped = 0;

    for (const record of records) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cleanRegistration = record.registration.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        // Check owner exists if provided
        let ownerId = null;
        if (record.owner_id) {
          const ownerCheck = await client.query(
            'SELECT id FROM customers WHERE id = $1',
            [record.owner_id]
          );
          if (ownerCheck.rows.length === 0) {
            await onIssue?.({
              type: 'missing_owner',
              record,
              description: `Owner with ID ${record.owner_id} not found`
            });
            ownerId = null;
          } else {
            ownerId = ownerCheck.rows[0].id;
          }
        }
        const motExpiryDate = record.mot_expiry_date ? new Date(record.mot_expiry_date) : null;
        const taxDueDate = record.tax_due_date ? new Date(record.tax_due_date) : null;
        await client.query(
          `INSERT INTO vehicles (
            registration, make, model, year, color, fuel_type, 
            engine_size, mot_status, mot_expiry_date, tax_status, 
            tax_due_date, owner_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (registration) 
          DO UPDATE SET
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            engine_size = EXCLUDED.engine_size,
            mot_status = EXCLUDED.mot_status,
            mot_expiry_date = EXCLUDED.mot_expiry_date,
            tax_status = EXCLUDED.tax_status,
            tax_due_date = EXCLUDED.tax_due_date,
            owner_id = EXCLUDED.owner_id,
            updated_at = NOW()`,
          [
            cleanRegistration,
            record.make,
            record.model,
            record.year ? parseInt(record.year, 10) : null,
            record.color,
            record.fuel_type,
            record.engine_size ? parseFloat(record.engine_size) : null,
            record.mot_status,
            motExpiryDate,
            record.tax_status,
            taxDueDate,
            ownerId
          ]
        );
        await client.query('COMMIT');
        imported++;
      } catch (error) {
        await client.query('ROLLBACK');
        failed++;
        await onIssue?.({
          type: 'import_error',
          record,
          description: `Failed to import vehicle: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        client.release();
      }
    }
    return { imported, failed, skipped };
  });
}

(async () => {
  const filePath = process.argv[2] || './data/vehicles.csv';
  const result = await importVehicles(filePath);
  console.log('Import result:', result);
  process.exit(0);
})();
