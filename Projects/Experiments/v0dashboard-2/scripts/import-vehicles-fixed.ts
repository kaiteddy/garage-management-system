#!/usr/bin/env ts-node

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface VehicleRecord {
  _ID: string;
  _ID_Customer?: string;
  _RegID?: string;
  Registration?: string;
  Make?: string;
  Model?: string;
  DateofReg?: string;
  Colour?: string;
  VIN?: string;
  EngineCC?: string;
  FuelType?: string;
  EngineCode?: string;
  [key: string]: any;
}

async function importVehicles(csvFilePath: string) {
  const client = await pool.connect();
  
  try {
    console.log(`🚀 [IMPORT-VEHICLES] Starting import from ${csvFilePath}...`);
    
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const cleanedContent = csvContent
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/"""/g, '"')  // Fix triple quotes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');

    const records = parse(cleanedContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '\\',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true
    }) as VehicleRecord[];

    console.log(`📊 [IMPORT-VEHICLES] Found ${records.length} records to process`);

    let processed = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let preservedConnections = 0;
    let smartLinked = 0;
    let errors = 0;

    for (const record of records) {
      try {
        if (!record._ID) {
          console.warn('Skipping record without ID');
          continue;
        }

        const registration = (record._RegID || record.Registration || '').toUpperCase().replace(/\s/g, '');
        if (!registration) {
          console.warn(`Skipping vehicle ${record._ID} without registration`);
          continue;
        }

        // Check if vehicle exists by registration
        const existing = await client.query(`
          SELECT registration, customer_id, owner_id, make, model, year FROM vehicles
          WHERE UPPER(REPLACE(registration, ' ', '')) = $1
          LIMIT 1
        `, [registration]);

        // Smart customer linking
        let customerId = null;
        let ownerId = null;

        if (record._ID_Customer) {
          // Check if customer exists
          const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [record._ID_Customer]);
          if (customerCheck.rows.length > 0) {
            customerId = record._ID_Customer;
            ownerId = record._ID_Customer;
            smartLinked++;
          }
        }

        if (existing.rows.length > 0) {
          const vehicle = existing.rows[0];
          const hasExistingConnection = vehicle.customer_id || vehicle.owner_id;
          
          // Smart merge logic
          const updates = [];
          const values = [];
          let paramCount = 1;

          // Only update if new data is better
          if (record.Make && record.Make.length > 2) {
            if (!vehicle.make || vehicle.make.length < record.Make.length) {
              updates.push(`make = $${paramCount++}`);
              values.push(record.Make);
            }
          }

          if (record.Model && record.Model.length > 2) {
            if (!vehicle.model || vehicle.model.length < record.Model.length) {
              updates.push(`model = $${paramCount++}`);
              values.push(record.Model);
            }
          }

          // Extract year from DateofReg if available
          let year = null;
          if (record.DateofReg) {
            const dateMatch = record.DateofReg.match(/(\d{4})/);
            if (dateMatch) {
              year = parseInt(dateMatch[1]);
            }
          }

          if (year && year > 1990 && year <= new Date().getFullYear()) {
            if (!vehicle.year || Math.abs(year - new Date().getFullYear()) < Math.abs(vehicle.year - new Date().getFullYear())) {
              updates.push(`year = $${paramCount++}`);
              values.push(year);
            }
          }

          // Other fields - only update if empty
          const otherFields = [
            { field: 'color', value: record.Colour },
            { field: 'vin', value: record.VIN },
            { field: 'engine_size', value: record.EngineCC },
            { field: 'fuel_type', value: record.FuelType }
          ];

          otherFields.forEach(({ field, value }) => {
            if (value) {
              updates.push(`${field} = COALESCE(${field}, $${paramCount++})`);
              values.push(value);
            }
          });

          // Smart customer linking if no existing connection and we have a customer
          if (!hasExistingConnection && customerId) {
            updates.push(`customer_id = $${paramCount++}`);
            updates.push(`owner_id = $${paramCount++}`);
            values.push(customerId);
            values.push(ownerId);
          }

          if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(vehicle.registration);

            const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE registration = $${paramCount}`;
            await client.query(updateQuery, values);
            updatedRecords++;
          }

          if (hasExistingConnection) {
            preservedConnections++;
          }
        } else {
          // Insert new vehicle (without specifying ID - let it auto-generate)
          // Extract year from DateofReg
          let year = null;
          if (record.DateofReg) {
            const dateMatch = record.DateofReg.match(/(\d{4})/);
            if (dateMatch) {
              year = parseInt(dateMatch[1]);
            }
          }

          await client.query(`
            INSERT INTO vehicles (
              registration, make, model, year, color, vin,
              engine_size, fuel_type, customer_id, owner_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          `, [
            record._RegID || record.Registration || '',
            record.Make || null,
            record.Model || null,
            year,
            record.Colour || null,
            record.VIN || null,
            record.EngineCC || null,
            record.FuelType || null,
            customerId,
            ownerId
          ]);
          newRecords++;
        }

        processed++;

        if (processed % 100 === 0) {
          console.log(`📝 [IMPORT-VEHICLES] Processed: ${processed}/${records.length} (${newRecords} new, ${updatedRecords} updated, ${preservedConnections} preserved, ${smartLinked} linked)`);
        }

      } catch (error: any) {
        console.error(`Error processing vehicle ${record._ID}:`, error.message);
        errors++;
        
        if (errors > 50) {
          console.error('Too many errors, stopping import');
          break;
        }
      }
    }

    console.log(`\n✅ [IMPORT-VEHICLES] Import completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   New records: ${newRecords}`);
    console.log(`   Updated records: ${updatedRecords}`);
    console.log(`   Preserved connections: ${preservedConnections}`);
    console.log(`   Smart linked: ${smartLinked}`);
    console.log(`   Errors: ${errors}`);

    return {
      success: true,
      processed,
      newRecords,
      updatedRecords,
      preservedConnections,
      smartLinked,
      errors
    };

  } catch (error: any) {
    console.error('❌ [IMPORT-VEHICLES] Fatal error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const csvFilePath = process.argv[2] || 'data/vehicles.csv';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    await importVehicles(csvFilePath);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);
