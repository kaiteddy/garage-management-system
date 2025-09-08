#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { neon } = require('@neondatabase/serverless');

// Database connection
const sql = neon(process.env.DATABASE_URL);

// File paths - update these to match your actual file locations
const DATA_EXPORT_PATH = process.argv[2] || '/Users/adamrutstein/data-exports';

const FILES_TO_PROCESS = [
  'Customers.csv',
  'Vehicles.csv',
  'Documents.csv',
  'LineItems.csv',
  'Document_Extras.csv',
  'Appointments.csv',
  'Receipts.csv',
  'Reminder_Templates.csv',
  'Reminders.csv',
  'Stock.csv'
];

async function main() {
  console.log('🚀 [DIRECT-IMPORT] Starting direct file import with smart merge...');
  console.log(`📁 [DIRECT-IMPORT] Looking for files in: ${DATA_EXPORT_PATH}`);

  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    files_processed: 0,
    total_records: 0,
    new_records: 0,
    updated_records: 0,
    preserved_connections: 0,
    smart_linked: 0,
    errors: [],
    summary: {}
  };

  const startTime = Date.now();

  // Check if directory exists
  if (!fs.existsSync(DATA_EXPORT_PATH)) {
    console.error(`❌ [DIRECT-IMPORT] Directory not found: ${DATA_EXPORT_PATH}`);
    console.log('💡 [DIRECT-IMPORT] Usage: node scripts/direct-import.js /path/to/data/exports');
    process.exit(1);
  }

  // List available files
  const availableFiles = fs.readdirSync(DATA_EXPORT_PATH).filter(file => file.endsWith('.csv'));
  console.log(`📋 [DIRECT-IMPORT] Available CSV files: ${availableFiles.join(', ')}`);

  // Process files in order
  for (const fileName of FILES_TO_PROCESS) {
    const filePath = path.join(DATA_EXPORT_PATH, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️ [DIRECT-IMPORT] Skipping ${fileName} - file not found`);
      continue;
    }

    try {
      const fileStats = fs.statSync(filePath);
      const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
      
      console.log(`\n📊 [DIRECT-IMPORT] Processing ${fileName} (${fileSizeMB} MB)...`);
      
      // Read and parse CSV
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });

      if (parsed.errors.length > 0) {
        console.error(`❌ [DIRECT-IMPORT] Parse errors in ${fileName}:`, parsed.errors.slice(0, 3));
        results.errors.push(`Parse errors in ${fileName}: ${parsed.errors.slice(0, 3).map(e => e.message).join(', ')}`);
        continue;
      }

      const data = parsed.data;
      console.log(`📈 [DIRECT-IMPORT] ${fileName}: ${data.length} records to process`);

      // Process based on file type
      let processed = 0;
      let newRecords = 0;
      let updatedRecords = 0;
      let preservedConnections = 0;
      let smartLinked = 0;

      if (fileName === 'Customers.csv') {
        const result = await processCustomers(data);
        processed = result.processed;
        newRecords = result.newRecords;
        updatedRecords = result.updatedRecords;
        smartLinked = result.mergedRecords || 0;
      } else if (fileName === 'Vehicles.csv') {
        const result = await processVehicles(data);
        processed = result.processed;
        newRecords = result.newRecords;
        updatedRecords = result.updatedRecords;
        preservedConnections = result.preservedConnections || 0;
        smartLinked = result.smartLinked || 0;
      } else if (fileName === 'Documents.csv') {
        const result = await processDocuments(data);
        processed = result.processed;
        newRecords = result.newRecords;
        updatedRecords = result.updatedRecords;
        smartLinked = result.smartLinked || 0;
      } else if (fileName === 'LineItems.csv') {
        const result = await processLineItems(data);
        processed = result.processed;
        newRecords = result.newRecords;
        updatedRecords = result.updatedRecords;
      } else if (fileName === 'Document_Extras.csv') {
        const result = await processDocumentExtras(data);
        processed = result.processed;
        newRecords = result.newRecords;
        updatedRecords = result.updatedRecords;
      } else {
        console.log(`⏭️ [DIRECT-IMPORT] ${fileName} processing not implemented yet`);
        continue;
      }

      results.files_processed++;
      results.total_records += processed;
      results.new_records += newRecords;
      results.updated_records += updatedRecords;
      results.preserved_connections += preservedConnections;
      results.smart_linked += smartLinked;

      results.summary[fileName] = {
        processed,
        newRecords,
        updatedRecords,
        preservedConnections,
        smartLinked,
        file_size_mb: fileSizeMB
      };

      console.log(`✅ [DIRECT-IMPORT] ${fileName}: ${processed} processed, ${newRecords} new, ${updatedRecords} updated`);

    } catch (error) {
      console.error(`❌ [DIRECT-IMPORT] Error processing ${fileName}:`, error.message);
      results.errors.push(`Error processing ${fileName}: ${error.message}`);
    }
  }

  const processingTime = Math.round((Date.now() - startTime) / 1000);
  results.processing_time = processingTime;

  console.log(`\n🎉 [DIRECT-IMPORT] Import completed!`);
  console.log(`📊 [DIRECT-IMPORT] Summary:`);
  console.log(`   Files processed: ${results.files_processed}`);
  console.log(`   Total records: ${results.total_records}`);
  console.log(`   New records: ${results.new_records}`);
  console.log(`   Updated records: ${results.updated_records}`);
  console.log(`   Preserved connections: ${results.preserved_connections}`);
  console.log(`   Smart linked: ${results.smart_linked}`);
  console.log(`   Processing time: ${processingTime}s`);
  
  if (results.errors.length > 0) {
    console.log(`⚠️ [DIRECT-IMPORT] Errors encountered:`);
    results.errors.forEach(error => console.log(`   - ${error}`));
  }

  // Save results to file
  const resultsPath = path.join(DATA_EXPORT_PATH, 'import-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 [DIRECT-IMPORT] Results saved to: ${resultsPath}`);
}

// Customer processing with smart merge
async function processCustomers(data) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let mergedRecords = 0;

  console.log(`👥 [CUSTOMERS] Processing ${data.length} customer records...`);

  for (const row of data) {
    try {
      // Smart matching
      const existing = await sql`
        SELECT id, first_name, last_name, phone, email, created_at FROM customers 
        WHERE (
          (phone = ${row.phone || ''} AND phone != '' AND phone IS NOT NULL)
          OR (email = ${row.email || ''} AND email != '' AND email NOT LIKE '%placeholder%' AND email IS NOT NULL)
          OR (
            LOWER(first_name || ' ' || last_name) = LOWER(${(row.first_name || row.firstName || '') + ' ' + (row.last_name || row.lastName || '')})
            AND ${(row.first_name || row.firstName || '') + ' ' + (row.last_name || row.lastName || '')} != ' '
          )
        )
        ORDER BY 
          CASE 
            WHEN phone = ${row.phone || ''} AND phone != '' THEN 1
            WHEN email = ${row.email || ''} AND email != '' THEN 2
            ELSE 3
          END,
          created_at ASC
        LIMIT 1
      `;

      if (existing.length > 0) {
        const existingCustomer = existing[0];
        
        // Smart merge logic
        const updates = [];
        const values = [];
        
        // First name: update if new is better
        if (row.first_name || row.firstName) {
          const newFirstName = row.first_name || row.firstName;
          if (!existingCustomer.first_name || 
              existingCustomer.first_name.length < newFirstName.length ||
              existingCustomer.first_name.toLowerCase() === 'customer' ||
              existingCustomer.first_name.toLowerCase() === 'unknown') {
            updates.push('first_name = $' + (values.length + 1));
            values.push(newFirstName);
          }
        }

        // Last name: similar logic
        if (row.last_name || row.lastName) {
          const newLastName = row.last_name || row.lastName;
          if (!existingCustomer.last_name || 
              existingCustomer.last_name.length < newLastName.length ||
              /^\d+$/.test(existingCustomer.last_name)) {
            updates.push('last_name = $' + (values.length + 1));
            values.push(newLastName);
          }
        }

        // Phone: update if new is longer/better
        if (row.phone && row.phone.length >= 10) {
          if (!existingCustomer.phone || existingCustomer.phone.length < row.phone.length) {
            updates.push('phone = $' + (values.length + 1));
            values.push(row.phone);
          }
        }

        // Email: update if new is better
        if (row.email && row.email.includes('@') && !row.email.includes('placeholder')) {
          if (!existingCustomer.email || 
              existingCustomer.email.includes('placeholder') ||
              existingCustomer.email === '') {
            updates.push('email = $' + (values.length + 1));
            values.push(row.email);
          }
        }

        // Address fields
        if (row.address_line1 || row.addressLine1) {
          updates.push('address_line1 = COALESCE(address_line1, $' + (values.length + 1) + ')');
          values.push(row.address_line1 || row.addressLine1);
        }

        if (row.city) {
          updates.push('city = COALESCE(city, $' + (values.length + 1) + ')');
          values.push(row.city);
        }

        if (row.postcode || row.postal_code) {
          updates.push('postcode = COALESCE(postcode, $' + (values.length + 1) + ')');
          values.push(row.postcode || row.postal_code);
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()');
          const updateQuery = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${values.length + 1}`;
          values.push(existingCustomer.id);
          
          await sql.unsafe(updateQuery, values);
          updatedRecords++;
          
          if (processed % 100 === 0) {
            console.log(`📝 [CUSTOMERS] Updated: ${existingCustomer.first_name} ${existingCustomer.last_name} (${processed}/${data.length})`);
          }
        } else {
          mergedRecords++;
        }
      } else {
        // Insert new customer
        const firstName = row.first_name || row.firstName || 'Customer';
        const lastName = row.last_name || row.lastName || (row.phone ? row.phone.slice(-4) : 'Unknown');
        
        await sql`
          INSERT INTO customers (
            first_name, last_name, email, phone, 
            address_line1, city, postcode, created_at, updated_at
          ) VALUES (
            ${firstName},
            ${lastName},
            ${row.email && row.email.includes('@') ? row.email : null},
            ${row.phone || null},
            ${row.address_line1 || row.addressLine1 || null},
            ${row.city || null},
            ${row.postcode || row.postal_code || null},
            NOW(), NOW()
          )
        `;
        newRecords++;
        
        if (processed % 100 === 0) {
          console.log(`✨ [CUSTOMERS] Created: ${firstName} ${lastName} (${processed}/${data.length})`);
        }
      }
      processed++;
    } catch (error) {
      console.error('Error processing customer:', error.message);
    }
  }

  console.log(`✅ [CUSTOMERS] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${mergedRecords} merged`);
  return { processed, newRecords, updatedRecords, mergedRecords };
}

// Vehicle processing with smart merge and connection preservation
async function processVehicles(data) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let preservedConnections = 0;
  let smartLinked = 0;

  console.log(`🚗 [VEHICLES] Processing ${data.length} vehicle records...`);

  for (const row of data) {
    try {
      const registration = (row.registration || row.reg || '').toUpperCase().replace(/\s/g, '');
      if (!registration) continue;

      const existing = await sql`
        SELECT id, customer_id, owner_id, make, model, year FROM vehicles
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration}
        LIMIT 1
      `;

      if (existing.length > 0) {
        const vehicle = existing[0];
        const hasExistingConnection = vehicle.customer_id || vehicle.owner_id;

        // Smart merge
        const updates = [];
        const values = [];

        if (row.make && row.make.length > 2) {
          if (!vehicle.make || vehicle.make.length < row.make.length) {
            updates.push('make = $' + (values.length + 1));
            values.push(row.make);
          }
        }

        if (row.model && row.model.length > 2) {
          if (!vehicle.model || vehicle.model.length < row.model.length) {
            updates.push('model = $' + (values.length + 1));
            values.push(row.model);
          }
        }

        if (row.year && parseInt(row.year) > 1990 && parseInt(row.year) <= new Date().getFullYear()) {
          if (!vehicle.year || Math.abs(parseInt(row.year) - new Date().getFullYear()) < Math.abs(vehicle.year - new Date().getFullYear())) {
            updates.push('year = $' + (values.length + 1));
            values.push(parseInt(row.year));
          }
        }

        // Other fields
        if (row.color || row.colour) {
          updates.push('color = COALESCE(color, $' + (values.length + 1) + ')');
          values.push(row.color || row.colour);
        }

        if (row.vin && row.vin.length >= 10) {
          updates.push('vin = COALESCE(vin, $' + (values.length + 1) + ')');
          values.push(row.vin);
        }

        if (row.mot_expiry_date || row.mot_expiry) {
          updates.push('mot_expiry_date = COALESCE(mot_expiry_date, $' + (values.length + 1) + ')');
          values.push(row.mot_expiry_date || row.mot_expiry);
        }

        // Smart customer linking if no existing connection
        if (!hasExistingConnection && (row.customer_name || row.owner_name)) {
          const customerName = row.customer_name || row.owner_name;
          const customer = await sql`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
            OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
            LIMIT 1
          `;

          if (customer.length > 0) {
            updates.push('customer_id = $' + (values.length + 1));
            updates.push('owner_id = $' + (values.length + 2));
            values.push(customer[0].id);
            values.push(customer[0].id);
            smartLinked++;
          }
        }

        if (updates.length > 0) {
          updates.push('updated_at = NOW()');
          const updateQuery = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${values.length + 1}`;
          values.push(vehicle.id);

          await sql.unsafe(updateQuery, values);
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

        if (row.customer_name || row.owner_name) {
          const customerName = row.customer_name || row.owner_name;
          const customer = await sql`
            SELECT id FROM customers
            WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
            OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
            LIMIT 1
          `;

          if (customer.length > 0) {
            customerId = customer[0].id;
            ownerId = customer[0].id;
            smartLinked++;
          }
        }

        await sql`
          INSERT INTO vehicles (
            registration, make, model, year, color, vin,
            engine_size, fuel_type, mot_expiry_date,
            customer_id, owner_id, created_at, updated_at
          ) VALUES (
            ${row.registration || row.reg || ''},
            ${row.make || null},
            ${row.model || null},
            ${row.year ? parseInt(row.year) : null},
            ${row.color || row.colour || null},
            ${row.vin || null},
            ${row.engine_size || null},
            ${row.fuel_type || null},
            ${row.mot_expiry_date || row.mot_expiry || null},
            ${customerId},
            ${ownerId},
            NOW(), NOW()
          )
        `;
        newRecords++;

        if (processed % 100 === 0) {
          console.log(`✨ [VEHICLES] Created: ${registration} (${processed}/${data.length})`);
        }
      }
      processed++;
    } catch (error) {
      console.error('Error processing vehicle:', error.message);
    }
  }

  console.log(`✅ [VEHICLES] Completed: ${processed} processed, ${newRecords} new, ${updatedRecords} updated, ${preservedConnections} preserved, ${smartLinked} smart-linked`);
  return { processed, newRecords, updatedRecords, preservedConnections, smartLinked };
}

// Document processing with smart linking
async function processDocuments(data) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let smartLinked = 0;

  console.log(`📄 [DOCUMENTS] Processing ${data.length} document records...`);

  for (const row of data) {
    try {
      const docNumber = row.doc_number || row.document_number || row.number || row.id || '';
      if (!docNumber) continue;

      const existing = await sql`
        SELECT id, _id_customer FROM documents
        WHERE doc_number = ${docNumber} OR id::text = ${docNumber}
        LIMIT 1
      `;

      // Smart customer linking
      let customerId = null;
      if (row.customer_name || row.customerName) {
        const customerName = row.customer_name || row.customerName;

        const customer = await sql`
          SELECT id FROM customers
          WHERE LOWER(first_name || ' ' || last_name) = LOWER(${customerName})
          OR LOWER(last_name || ', ' || first_name) = LOWER(${customerName})
          LIMIT 1
        `;

        if (customer.length > 0) {
          customerId = customer[0].id;
          smartLinked++;
        }
      }

      if (existing.length === 0) {
        await sql`
          INSERT INTO documents (
            doc_number, doc_type, doc_date_issued, customer_name, _id_customer,
            vehicle_registration, total_net, total_vat, total_gross, created_at, updated_at
          ) VALUES (
            ${docNumber},
            ${row.doc_type || row.type || 'Service'},
            ${row.doc_date_issued || row.date_issued || null},
            ${row.customer_name || row.customerName || ''},
            ${customerId},
            ${row.vehicle_registration || row.registration || null},
            ${parseFloat(row.total_net || row.net_total || '0') || 0},
            ${parseFloat(row.total_vat || row.vat_total || '0') || 0},
            ${parseFloat(row.total_gross || row.gross_total || '0') || 0},
            NOW(), NOW()
          )
        `;
        newRecords++;

        if (processed % 100 === 0) {
          console.log(`✨ [DOCUMENTS] Created: ${docNumber} (${processed}/${data.length})`);
        }
      }
      processed++;
    } catch (error) {
      console.error('Error processing document:', error.message);
    }
  }

  console.log(`✅ [DOCUMENTS] Completed: ${processed} processed, ${newRecords} new, ${smartLinked} smart-linked`);
  return { processed, newRecords, updatedRecords, smartLinked };
}

// Line items processing
async function processLineItems(data) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;

  console.log(`📋 [LINE-ITEMS] Processing ${data.length} line item records...`);

  for (const row of data) {
    try {
      const documentId = row.document_id || row.doc_id || '';
      if (!documentId) continue;

      const existing = await sql`
        SELECT id FROM document_line_items
        WHERE document_id = ${documentId}
        AND description = ${row.description || ''}
        LIMIT 1
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO document_line_items (
            document_id, description, quantity, unit_price, total_price, vat_rate, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.description || ''},
            ${parseFloat(row.quantity || '0') || 0},
            ${parseFloat(row.unit_price || row.price || '0') || 0},
            ${parseFloat(row.total_price || row.total || '0') || 0},
            ${parseFloat(row.vat_rate || '0') || 0},
            NOW(), NOW()
          )
        `;
        newRecords++;
      }
      processed++;

      if (processed % 500 === 0) {
        console.log(`📋 [LINE-ITEMS] Processed: ${processed}/${data.length}`);
      }
    } catch (error) {
      console.error('Error processing line item:', error.message);
    }
  }

  console.log(`✅ [LINE-ITEMS] Completed: ${processed} processed, ${newRecords} new`);
  return { processed, newRecords, updatedRecords };
}

// Document extras processing
async function processDocumentExtras(data) {
  let processed = 0;
  let newRecords = 0;
  let updatedRecords = 0;

  console.log(`📎 [DOC-EXTRAS] Processing ${data.length} document extra records...`);

  for (const row of data) {
    try {
      const documentId = row.document_id || row.doc_id || '';
      if (!documentId) continue;

      const existing = await sql`
        SELECT id FROM document_extras
        WHERE document_id = ${documentId}
        AND labour_description = ${row.labour_description || row.description || ''}
        LIMIT 1
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO document_extras (
            document_id, labour_description, amount, vat_rate, created_at, updated_at
          ) VALUES (
            ${documentId},
            ${row.labour_description || row.description || ''},
            ${parseFloat(row.amount || '0') || 0},
            ${parseFloat(row.vat_rate || '0') || 0},
            NOW(), NOW()
          )
        `;
        newRecords++;
      }
      processed++;

      if (processed % 500 === 0) {
        console.log(`📎 [DOC-EXTRAS] Processed: ${processed}/${data.length}`);
      }
    } catch (error) {
      console.error('Error processing document extra:', error.message);
    }
  }

  console.log(`✅ [DOC-EXTRAS] Completed: ${processed} processed, ${newRecords} new`);
  return { processed, newRecords, updatedRecords };
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processCustomers, processVehicles, processDocuments, processLineItems, processDocumentExtras };
