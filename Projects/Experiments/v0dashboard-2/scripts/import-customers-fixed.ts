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

interface CustomerRecord {
  _ID: string;
  nameForename?: string;
  nameSurname?: string;
  nameTitle?: string;
  nameCompany?: string;
  contactEmail?: string;
  contactMobile?: string;
  contactTelephone?: string;
  addressHouseNo?: string;
  addressRoad?: string;
  addressLocality?: string;
  addressTown?: string;
  addressCounty?: string;
  addressPostCode?: string;
  AccountNumber?: string;
  AccountStatus?: string;
  Notes?: string;
  [key: string]: any;
}

async function importCustomers(csvFilePath: string) {
  const client = await pool.connect();
  
  try {
    console.log(`🚀 [IMPORT-CUSTOMERS] Starting import from ${csvFilePath}...`);
    
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
    }) as CustomerRecord[];

    console.log(`📊 [IMPORT-CUSTOMERS] Found ${records.length} records to process`);

    let processed = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let errors = 0;

    // Process without transaction to avoid rollback issues
    for (const record of records) {
      try {
        if (!record._ID) {
          console.warn('Skipping record without ID');
          continue;
        }

        // Check if customer exists
        const existing = await client.query('SELECT id FROM customers WHERE id = $1', [record._ID]);

        // Prepare customer data matching the actual schema
        const firstName = record.nameForename || 'Customer';
        const lastName = record.nameSurname || (record.contactMobile ? record.contactMobile.slice(-4) : 'Unknown');

        // Handle email with uniqueness check
        let email = record.contactEmail && record.contactEmail.includes('@')
          ? record.contactEmail
          : `noemail.${record._ID}@placeholder.com`;

        // Check if email already exists for a different customer
        const emailCheck = await client.query('SELECT id FROM customers WHERE LOWER(email) = LOWER($1) AND id != $2', [email, record._ID]);
        if (emailCheck.rows.length > 0) {
          // Email exists for another customer, make it unique
          email = `${email.split('@')[0]}.${record._ID}@${email.split('@')[1]}`;
        }
        
        const phone = record.contactMobile || record.contactTelephone || null;
        const addressLine1 = record.addressRoad 
          ? `${record.addressHouseNo || ''} ${record.addressRoad}`.trim() 
          : null;
        const city = record.addressTown || null;
        const postcode = record.addressPostCode || null;
        const country = record.addressCounty || null;

        if (existing.rows.length > 0) {
          // Update existing customer with smart merge
          const updates = [];
          const values = [];
          let paramCount = 1;

          // Only update if new data is better
          if (firstName && firstName !== 'Customer') {
            updates.push(`first_name = $${paramCount++}`);
            values.push(firstName);
          }

          if (lastName && lastName !== 'Unknown' && !/^\d+$/.test(lastName)) {
            updates.push(`last_name = $${paramCount++}`);
            values.push(lastName);
          }

          if (email && !email.includes('placeholder')) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
          }

          if (phone) {
            updates.push(`phone = COALESCE(phone, $${paramCount++})`);
            values.push(phone);
          }

          if (addressLine1) {
            updates.push(`address_line1 = COALESCE(address_line1, $${paramCount++})`);
            values.push(addressLine1);
          }

          if (city) {
            updates.push(`city = COALESCE(city, $${paramCount++})`);
            values.push(city);
          }

          if (postcode) {
            updates.push(`postcode = COALESCE(postcode, $${paramCount++})`);
            values.push(postcode);
          }

          if (country) {
            updates.push(`country = COALESCE(country, $${paramCount++})`);
            values.push(country);
          }

          if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(record._ID);

            const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramCount}`;
            await client.query(updateQuery, values);
            updatedRecords++;
          }
        } else {
          // Insert new customer
          await client.query(`
            INSERT INTO customers (
              id, first_name, last_name, email, phone, 
              address_line1, city, postcode, country, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [
            record._ID,
            firstName,
            lastName,
            email,
            phone,
            addressLine1,
            city,
            postcode,
            country
          ]);
          newRecords++;
        }

        processed++;

        if (processed % 100 === 0) {
          console.log(`📝 [IMPORT-CUSTOMERS] Processed: ${processed}/${records.length} (${newRecords} new, ${updatedRecords} updated)`);
        }

      } catch (error: any) {
        console.error(`Error processing customer ${record._ID}:`, error.message);
        errors++;

        if (errors > 50) {
          console.error('Too many errors, stopping import');
          break;
        }
      }
    }

    console.log(`\n✅ [IMPORT-CUSTOMERS] Import completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   New records: ${newRecords}`);
    console.log(`   Updated records: ${updatedRecords}`);
    console.log(`   Errors: ${errors}`);

    return {
      success: true,
      processed,
      newRecords,
      updatedRecords,
      errors
    };

  } catch (error: any) {
    console.error('❌ [IMPORT-CUSTOMERS] Fatal error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const csvFilePath = process.argv[2] || 'data/customers.csv';
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    await importCustomers(csvFilePath);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);
