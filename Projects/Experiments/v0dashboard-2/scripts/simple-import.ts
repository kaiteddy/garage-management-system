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

async function importVehiclesSimple() {
  const client = await pool.connect();
  
  try {
    console.log('🚗 [SIMPLE-IMPORT] Starting vehicle import...');
    
    // Read vehicles CSV
    const csvPath = 'data/vehicles.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
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
    }) as any[];

    console.log(`📊 Found ${records.length} vehicle records`);

    let processed = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let smartLinked = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const registration = (record._RegID || record.Registration || '').toUpperCase().replace(/\s/g, '');
        if (!registration) {
          continue; // Skip vehicles without registration
        }

        // Check if vehicle exists
        const existing = await client.query(
          'SELECT registration, customer_id FROM vehicles WHERE UPPER(REPLACE(registration, \' \', \'\')) = $1',
          [registration]
        );

        // Check if customer exists
        let customerId = null;
        if (record._ID_Customer) {
          const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [record._ID_Customer]);
          if (customerCheck.rows.length > 0) {
            customerId = record._ID_Customer;
            smartLinked++;
          }
        }

        if (existing.rows.length > 0) {
          // Update existing vehicle if we have a customer link and it doesn't have one
          if (customerId && !existing.rows[0].customer_id) {
            await client.query(
              'UPDATE vehicles SET customer_id = $1, owner_id = $1, updated_at = NOW() WHERE registration = $2',
              [customerId, existing.rows[0].registration]
            );
            updatedRecords++;
          }
        } else {
          // Insert new vehicle with basic info
          let year = null;
          if (record.DateofReg) {
            const dateMatch = record.DateofReg.match(/(\d{4})/);
            if (dateMatch) {
              year = parseInt(dateMatch[1]);
            }
          }

          await client.query(`
            INSERT INTO vehicles (
              registration, make, model, year, color, customer_id, owner_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
            registration,
            record.Make || null,
            record.Model || null,
            year,
            record.Colour || null,
            customerId,
            customerId
          ]);
          newRecords++;
        }

        processed++;

        if (processed % 100 === 0) {
          console.log(`📝 Processed: ${processed}/${records.length} (${newRecords} new, ${updatedRecords} updated, ${smartLinked} linked)`);
        }

      } catch (error: any) {
        console.error(`Error processing vehicle:`, error.message);
        errors++;
        
        if (errors > 50) {
          console.error('Too many errors, stopping');
          break;
        }
      }
    }

    console.log(`\n✅ Vehicle import completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   New records: ${newRecords}`);
    console.log(`   Updated records: ${updatedRecords}`);
    console.log(`   Smart linked: ${smartLinked}`);
    console.log(`   Errors: ${errors}`);

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  } finally {
    client.release();
  }
}

async function importDocumentsSimple() {
  const client = await pool.connect();
  
  try {
    console.log('\n📄 [SIMPLE-IMPORT] Starting document import...');
    
    // Read documents CSV
    const csvPath = 'data/Documents.csv';
    if (!fs.existsSync(csvPath)) {
      console.log('⏭️ Documents.csv not found, skipping');
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const cleanedContent = csvContent
      .replace(/^\uFEFF/, '')
      .replace(/"""/g, '"')
      .replace(/\r\n/g, '\n')
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
    }) as any[];

    console.log(`📊 Found ${records.length} document records`);

    let processed = 0;
    let newRecords = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const docNumber = record.doc_number || record.id || record._ID || '';
        if (!docNumber) continue;

        // Check if document exists
        const existing = await client.query('SELECT id FROM documents WHERE doc_number = $1', [docNumber]);

        if (existing.rows.length === 0) {
          // Find customer by ID if available
          let customerId = null;
          if (record._ID_Customer || record.customer_id) {
            const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [record._ID_Customer || record.customer_id]);
            if (customerCheck.rows.length > 0) {
              customerId = customerCheck.rows[0].id;
            }
          }

          await client.query(`
            INSERT INTO documents (
              doc_number, doc_type, customer_name, _id_customer, 
              total_gross, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `, [
            docNumber,
            record.doc_type || record.type || 'Service',
            record.customer_name || '',
            customerId,
            parseFloat(record.total_gross || record.total || '0') || 0
          ]);
          newRecords++;
        }

        processed++;

        if (processed % 100 === 0) {
          console.log(`📝 Processed: ${processed}/${records.length} (${newRecords} new)`);
        }

      } catch (error: any) {
        console.error(`Error processing document:`, error.message);
        errors++;
        
        if (errors > 50) {
          console.error('Too many errors, stopping');
          break;
        }
      }
    }

    console.log(`\n✅ Document import completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   New records: ${newRecords}`);
    console.log(`   Errors: ${errors}`);

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Starting simple import process...');
    console.log('📁 Working with existing enhanced database schema');
    console.log('🔗 APIs will populate additional fields as needed\n');

    // Import vehicles first (they link to customers)
    await importVehiclesSimple();
    
    // Then import documents
    await importDocumentsSimple();

    console.log('\n🎉 Simple import process completed!');
    console.log('💡 The APIs will enhance the data with additional fields as needed');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);
