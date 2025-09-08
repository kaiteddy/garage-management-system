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

interface ImportResults {
  success: boolean;
  timestamp: string;
  files_processed: number;
  total_records: number;
  new_records: number;
  updated_records: number;
  preserved_connections: number;
  smart_linked: number;
  errors: string[];
  summary: Record<string, any>;
  processing_time: number;
}

const FILES_TO_PROCESS = [
  { name: 'customers.csv', processor: processCustomers },
  { name: 'vehicles.csv', processor: processVehicles },
  { name: 'Documents.csv', processor: processDocuments },
  { name: 'LineItems.csv', processor: processLineItems },
  { name: 'Document_Extras.csv', processor: processDocumentExtras },
  { name: 'Receipts.csv', processor: processReceipts },
  { name: 'Reminder_Templates.csv', processor: processReminderTemplates },
  { name: 'Reminders.csv', processor: processReminders },
  { name: 'Stock.csv', processor: processStock }
];

async function main() {
  console.log('🚀 [SMART-MERGE-IMPORT] Starting smart merge import from local CSV files...');
  
  const dataPath = path.resolve(process.cwd(), 'data');
  console.log(`📁 [SMART-MERGE-IMPORT] Looking for files in: ${dataPath}`);

  const results: ImportResults = {
    success: true,
    timestamp: new Date().toISOString(),
    files_processed: 0,
    total_records: 0,
    new_records: 0,
    updated_records: 0,
    preserved_connections: 0,
    smart_linked: 0,
    errors: [],
    summary: {},
    processing_time: 0
  };

  const startTime = Date.now();

  // Check if data directory exists
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ [SMART-MERGE-IMPORT] Data directory not found: ${dataPath}`);
    process.exit(1);
  }

  // List available files
  const availableFiles = fs.readdirSync(dataPath).filter(file => file.endsWith('.csv'));
  console.log(`📋 [SMART-MERGE-IMPORT] Available CSV files: ${availableFiles.join(', ')}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Process files in order
    for (const fileConfig of FILES_TO_PROCESS) {
      const filePath = path.join(dataPath, fileConfig.name);
      
      // Try alternative file names
      let actualFilePath = filePath;
      if (!fs.existsSync(filePath)) {
        // Try with _utf8 suffix
        const utf8Path = filePath.replace('.csv', '_utf8.csv');
        if (fs.existsSync(utf8Path)) {
          actualFilePath = utf8Path;
        } else {
          console.log(`⏭️ [SMART-MERGE-IMPORT] Skipping ${fileConfig.name} - file not found`);
          continue;
        }
      }

      try {
        const fileStats = fs.statSync(actualFilePath);
        const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
        
        console.log(`\n📊 [SMART-MERGE-IMPORT] Processing ${fileConfig.name} (${fileSizeMB} MB)...`);
        
        // Read and parse CSV
        const csvContent = fs.readFileSync(actualFilePath, 'utf8');
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
        });

        console.log(`📈 [SMART-MERGE-IMPORT] ${fileConfig.name}: ${records.length} records to process`);

        // Process with the appropriate processor
        const result = await fileConfig.processor(client, records);

        results.files_processed++;
        results.total_records += result.processed;
        results.new_records += result.newRecords;
        results.updated_records += result.updatedRecords;
        results.preserved_connections += (result as any).preservedConnections || 0;
        results.smart_linked += (result as any).smartLinked || 0;

        results.summary[fileConfig.name] = {
          processed: result.processed,
          newRecords: result.newRecords,
          updatedRecords: result.updatedRecords,
          preservedConnections: (result as any).preservedConnections || 0,
          smartLinked: (result as any).smartLinked || 0,
          file_size_mb: fileSizeMB
        };

        console.log(`✅ [SMART-MERGE-IMPORT] ${fileConfig.name}: ${result.processed} processed, ${result.newRecords} new, ${result.updatedRecords} updated`);

      } catch (error: any) {
        console.error(`❌ [SMART-MERGE-IMPORT] Error processing ${fileConfig.name}:`, error.message);
        results.errors.push(`Error processing ${fileConfig.name}: ${error.message}`);
      }
    }

    await client.query('COMMIT');
    results.processing_time = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n🎉 [SMART-MERGE-IMPORT] Import completed!`);
    console.log(`📊 [SMART-MERGE-IMPORT] Summary:`);
    console.log(`   Files processed: ${results.files_processed}`);
    console.log(`   Total records: ${results.total_records}`);
    console.log(`   New records: ${results.new_records}`);
    console.log(`   Updated records: ${results.updated_records}`);
    console.log(`   Preserved connections: ${results.preserved_connections}`);
    console.log(`   Smart linked: ${results.smart_linked}`);
    console.log(`   Processing time: ${results.processing_time}s`);
    
    if (results.errors.length > 0) {
      console.log(`⚠️ [SMART-MERGE-IMPORT] Errors encountered:`);
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Save results
    const resultsPath = path.join(dataPath, 'smart-merge-import-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📄 [SMART-MERGE-IMPORT] Results saved to: ${resultsPath}`);

  } catch (error: any) {
    console.error('❌ [SMART-MERGE-IMPORT] Fatal error:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Customer processing with smart merge
async function processCustomers(client: any, data: any[]) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let mergedRecords = 0;

  console.log(`👥 [CUSTOMERS] Processing ${data.length} customer records with smart merge...`);

  for (const row of data) {
    try {
      // Handle different field name variations
      const firstName = row.nameForename || row.first_name || row.firstName || '';
      const lastName = row.nameSurname || row.last_name || row.lastName || '';
      const phone = row.contactMobile || row.contactTelephone || row.phone || row.mobile || '';
      const email = row.contactEmail || row.email || '';

      // Smart matching
      const existing = await client.query(`
        SELECT id, first_name, last_name, phone, email, created_at FROM customers 
        WHERE (
          (phone = $1 AND phone != '' AND phone IS NOT NULL)
          OR (email = $2 AND email != '' AND email NOT LIKE '%placeholder%' AND email IS NOT NULL)
          OR (
            LOWER(first_name || ' ' || last_name) = LOWER($3)
            AND $3 != ' '
          )
        )
        ORDER BY 
          CASE 
            WHEN phone = $1 AND phone != '' THEN 1
            WHEN email = $2 AND email != '' THEN 2
            ELSE 3
          END,
          created_at ASC
        LIMIT 1
      `, [phone, email, firstName + ' ' + lastName]);

      if (existing.rows.length > 0) {
        const existingCustomer = existing.rows[0];
        
        // Smart merge logic - only update if new data is better
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (firstName && (!existingCustomer.first_name || 
            existingCustomer.first_name.length < firstName.length ||
            existingCustomer.first_name.toLowerCase() === 'customer')) {
          updates.push(`first_name = $${paramCount++}`);
          values.push(firstName);
        }

        if (lastName && (!existingCustomer.last_name || 
            existingCustomer.last_name.length < lastName.length ||
            /^\d+$/.test(existingCustomer.last_name))) {
          updates.push(`last_name = $${paramCount++}`);
          values.push(lastName);
        }

        if (phone && phone.length >= 10 && 
            (!existingCustomer.phone || existingCustomer.phone.length < phone.length)) {
          updates.push(`phone = $${paramCount++}`);
          values.push(phone);
        }

        if (email && email.includes('@') && !email.includes('placeholder') &&
            (!existingCustomer.email || existingCustomer.email.includes('placeholder'))) {
          updates.push(`email = $${paramCount++}`);
          values.push(email);
        }

        // Address fields
        const addressFields = [
          { field: 'address_line1', value: row.addressRoad || row.address_line1 || row.addressLine1 },
          { field: 'city', value: row.addressTown || row.city },
          { field: 'postcode', value: row.addressPostCode || row.postcode || row.postal_code }
        ];

        addressFields.forEach(({ field, value }) => {
          if (value) {
            updates.push(`${field} = COALESCE(${field}, $${paramCount++})`);
            values.push(value);
          }
        });

        if (updates.length > 0) {
          updates.push('updated_at = NOW()');
          values.push(existingCustomer.id);
          
          const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramCount}`;
          await client.query(updateQuery, values);
          updatedRecords++;
          
          if (processed % 100 === 0) {
            console.log(`📝 [CUSTOMERS] Updated: ${existingCustomer.first_name} ${existingCustomer.last_name} (${processed}/${data.length})`);
          }
        } else {
          mergedRecords++;
        }
      } else {
        // Insert new customer
        const customerId = row._ID || row.id || null;
        const insertValues = [
          customerId,
          firstName || 'Customer',
          lastName || (phone ? phone.slice(-4) : 'Unknown'),
          email && email.includes('@') ? email : null,
          phone || null,
          row.addressRoad || row.address_line1 || row.addressLine1 || null,
          row.addressTown || row.city || null,
          row.addressPostCode || row.postcode || row.postal_code || null
        ];

        const insertQuery = `
          INSERT INTO customers (
            ${customerId ? 'id,' : ''} first_name, last_name, email, phone, 
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${customerId ? '$1,' : ''} $${customerId ? '2' : '1'}, $${customerId ? '3' : '2'}, $${customerId ? '4' : '3'}, $${customerId ? '5' : '4'}, 
            $${customerId ? '6' : '5'}, $${customerId ? '7' : '6'}, $${customerId ? '8' : '7'}, NOW(), NOW()
          )
        `;

        await client.query(insertQuery, customerId ? insertValues : insertValues.slice(1));
        newRecords++;
        
        if (processed % 100 === 0) {
          console.log(`✨ [CUSTOMERS] Created: ${firstName} ${lastName} (${processed}/${data.length})`);
        }
      }
      processed++;
    } catch (error: any) {
      console.error('Error processing customer:', error.message);
    }
  }

  console.log(`✅ [CUSTOMERS] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${mergedRecords} merged`);
  return { processed, newRecords, updatedRecords, mergedRecords };
}

// Vehicle processing with smart merge and connection preservation
async function processVehicles(client: any, data: any[]) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let preservedConnections = 0;
  let smartLinked = 0;

  console.log(`🚗 [VEHICLES] Processing ${data.length} vehicle records with smart merge...`);

  for (const row of data) {
    try {
      const registration = (row.registration || row.reg || '').toUpperCase().replace(/\s/g, '');
      if (!registration) continue;

      const existing = await client.query(`
        SELECT id, customer_id, owner_id, make, model, year FROM vehicles
        WHERE UPPER(REPLACE(registration, ' ', '')) = $1
        LIMIT 1
      `, [registration]);

      if (existing.rows.length > 0) {
        const vehicle = existing.rows[0];
        const hasExistingConnection = vehicle.customer_id || vehicle.owner_id;

        // Smart merge
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (row.make && row.make.length > 2) {
          if (!vehicle.make || vehicle.make.length < row.make.length) {
            updates.push(`make = $${paramCount++}`);
            values.push(row.make);
          }
        }

        if (row.model && row.model.length > 2) {
          if (!vehicle.model || vehicle.model.length < row.model.length) {
            updates.push(`model = $${paramCount++}`);
            values.push(row.model);
          }
        }

        if (row.year && parseInt(row.year) > 1990 && parseInt(row.year) <= new Date().getFullYear()) {
          if (!vehicle.year || Math.abs(parseInt(row.year) - new Date().getFullYear()) < Math.abs(vehicle.year - new Date().getFullYear())) {
            updates.push(`year = $${paramCount++}`);
            values.push(parseInt(row.year));
          }
        }

        // Other fields
        const otherFields = [
          { field: 'color', value: row.color || row.colour },
          { field: 'vin', value: row.vin, minLength: 10 },
          { field: 'engine_size', value: row.engine_size },
          { field: 'fuel_type', value: row.fuel_type },
          { field: 'mot_expiry_date', value: row.mot_expiry_date || row.mot_expiry }
        ];

        otherFields.forEach(({ field, value, minLength }) => {
          if (value && (!minLength || value.length >= minLength)) {
            updates.push(`${field} = COALESCE(${field}, $${paramCount++})`);
            values.push(value);
          }
        });

        // Smart customer linking if no existing connection
        if (!hasExistingConnection && (row._ID_Customer || row.customer_name || row.owner_name)) {
          let customerId = null;

          if (row._ID_Customer) {
            // Direct customer ID reference
            const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [row._ID_Customer]);
            if (customerCheck.rows.length > 0) {
              customerId = row._ID_Customer;
            }
          } else if (row.customer_name || row.owner_name) {
            // Customer name lookup
            const customerName = row.customer_name || row.owner_name;
            const customerLookup = await client.query(`
              SELECT id FROM customers
              WHERE LOWER(first_name || ' ' || last_name) = LOWER($1)
              OR LOWER(last_name || ', ' || first_name) = LOWER($1)
              LIMIT 1
            `, [customerName]);

            if (customerLookup.rows.length > 0) {
              customerId = customerLookup.rows[0].id;
            }
          }

          if (customerId) {
            updates.push(`customer_id = $${paramCount++}`);
            updates.push(`owner_id = $${paramCount++}`);
            values.push(customerId);
            values.push(customerId);
            smartLinked++;
          }
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()');
          values.push(vehicle.id);

          const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${paramCount}`;
          await client.query(updateQuery, values);
          updatedRecords++;

          if (processed % 100 === 0) {
            console.log(`📝 [VEHICLES] Updated: ${registration} (${processed}/${data.length})`);
          }
        }

        if (hasExistingConnection) {
          preservedConnections++;
        }
      } else {
        // Insert new vehicle with smart customer linking
        let customerId = null;
        let ownerId = null;

        if (row._ID_Customer) {
          const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [row._ID_Customer]);
          if (customerCheck.rows.length > 0) {
            customerId = row._ID_Customer;
            ownerId = row._ID_Customer;
            smartLinked++;
          }
        } else if (row.customer_name || row.owner_name) {
          const customerName = row.customer_name || row.owner_name;
          const customerLookup = await client.query(`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) = LOWER($1)
            OR LOWER(last_name || ', ' || first_name) = LOWER($1)
            LIMIT 1
          `, [customerName]);

          if (customerLookup.rows.length > 0) {
            customerId = customerLookup.rows[0].id;
            ownerId = customerLookup.rows[0].id;
            smartLinked++;
          }
        }

        const vehicleId = row._ID || row.id || null;
        const insertValues = [
          vehicleId,
          row.registration || row.reg || '',
          row.make || null,
          row.model || null,
          row.year ? parseInt(row.year) : null,
          row.color || row.colour || null,
          row.vin || null,
          row.engine_size || null,
          row.fuel_type || null,
          row.mot_expiry_date || row.mot_expiry || null,
          customerId,
          ownerId
        ].filter((_, index) => vehicleId !== null || index > 0);

        const insertQuery = `
          INSERT INTO vehicles (
            ${vehicleId ? 'id,' : ''} registration, make, model, year, color, vin,
            engine_size, fuel_type, mot_expiry_date,
            customer_id, owner_id, created_at, updated_at
          ) VALUES (
            ${vehicleId ? '$1,' : ''} $${vehicleId ? '2' : '1'}, $${vehicleId ? '3' : '2'}, $${vehicleId ? '4' : '3'}, $${vehicleId ? '5' : '4'}, $${vehicleId ? '6' : '5'}, $${vehicleId ? '7' : '6'},
            $${vehicleId ? '8' : '7'}, $${vehicleId ? '9' : '8'}, $${vehicleId ? '10' : '9'},
            $${vehicleId ? '11' : '10'}, $${vehicleId ? '12' : '11'}, NOW(), NOW()
          )
        `;

        await client.query(insertQuery, vehicleId ? insertValues : insertValues.slice(1));
        newRecords++;

        if (processed % 100 === 0) {
          console.log(`✨ [VEHICLES] Created: ${registration} (${processed}/${data.length})`);
        }
      }
      processed++;
    } catch (error: any) {
      console.error('Error processing vehicle:', error.message);
    }
  }

  console.log(`✅ [VEHICLES] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${preservedConnections} preserved, ${smartLinked} smart-linked`);
  return { processed, newRecords, updatedRecords, preservedConnections, smartLinked };
}

async function processDocuments(client: any, data: any[]) {
  console.log(`📄 [DOCUMENTS] Processing ${data.length} document records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0, smartLinked: 0 };
}

async function processLineItems(client: any, data: any[]) {
  console.log(`📋 [LINE-ITEMS] Processing ${data.length} line item records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

async function processDocumentExtras(client: any, data: any[]) {
  console.log(`📎 [DOC-EXTRAS] Processing ${data.length} document extra records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

async function processReceipts(client: any, data: any[]) {
  console.log(`🧾 [RECEIPTS] Processing ${data.length} receipt records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

async function processReminderTemplates(client: any, data: any[]) {
  console.log(`📝 [REMINDER-TEMPLATES] Processing ${data.length} reminder template records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

async function processReminders(client: any, data: any[]) {
  console.log(`⏰ [REMINDERS] Processing ${data.length} reminder records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

async function processStock(client: any, data: any[]) {
  console.log(`📦 [STOCK] Processing ${data.length} stock records...`);
  return { processed: 0, newRecords: 0, updatedRecords: 0 };
}

// Run if this is the main module
main().catch(console.error);
