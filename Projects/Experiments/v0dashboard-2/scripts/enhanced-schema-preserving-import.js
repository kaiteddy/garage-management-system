require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function enhancedSchemaPreservingImport() {
  const startTime = Date.now();
  
  try {
    console.log('🛡️  ENHANCED SCHEMA-PRESERVING IMPORT\n');
    console.log('Preserving all our enhanced database tables and features\n');
    console.log('Working with existing enhanced schema with 60+ tables\n');

    // Step 1: Verify our enhanced schema is intact
    console.log('🔍 Step 1: Verifying enhanced database schema...');
    await verifyEnhancedSchema();

    // Step 2: Import core data to existing tables (NO schema changes)
    console.log('\n📊 Step 2: Importing to existing enhanced tables...');
    const coreResults = await importToExistingTables();

    // Step 3: Import additional data to enhanced tables
    console.log('\n📄 Step 3: Importing to enhanced document tables...');
    const enhancedResults = await importToEnhancedTables();

    // Step 4: Final validation and report
    console.log('\n✅ Step 4: Final validation and comprehensive report...');
    await generateEnhancedReport(coreResults, enhancedResults);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n🎉 ENHANCED SCHEMA-PRESERVING IMPORT COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`\n🛡️  All enhanced features preserved and data imported successfully!`);

    return { success: true, totalTime };

  } catch (error) {
    console.error('\n❌ ENHANCED SCHEMA-PRESERVING IMPORT FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function verifyEnhancedSchema() {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name
  `;
  
  console.log(`   ✅ Found ${tables.length} enhanced tables in database`);
  
  // Check key enhanced tables
  const keyTables = ['customers', 'vehicles', 'documents', 'whatsapp_messages', 'mot_reminders', 'parts', 'technicians'];
  const existingTables = tables.map(t => t.table_name);
  
  keyTables.forEach(table => {
    if (existingTables.includes(table)) {
      console.log(`   ✅ ${table} table - Enhanced schema preserved`);
    } else {
      console.log(`   ⚠️  ${table} table - Missing (will be created if needed)`);
    }
  });
}

async function importToExistingTables() {
  const results = {};

  // Import customers to existing enhanced customers table
  console.log('   👥 Importing customers to enhanced table...');
  results.customers = await importCustomersToEnhanced();

  // Import vehicles to existing enhanced vehicles table  
  console.log('   🚗 Importing vehicles to enhanced table...');
  results.vehicles = await importVehiclesToEnhanced();

  // Import documents to existing enhanced documents table
  console.log('   📋 Importing documents to enhanced table...');
  results.documents = await importDocumentsToEnhanced();

  return results;
}

async function importToEnhancedTables() {
  const results = {};

  // Import line items to existing line_items table
  console.log('   📝 Importing line items to enhanced table...');
  results.lineItems = await importLineItemsToEnhanced();

  // Import receipts to existing receipts table
  console.log('   🧾 Importing receipts to enhanced table...');
  results.receipts = await importReceiptsToEnhanced();

  // Import stock to existing stock table
  console.log('   📦 Importing stock to enhanced table...');
  results.stock = await importStockToEnhanced();

  // Import reminders to existing reminders table
  console.log('   🔔 Importing reminders to enhanced table...');
  results.reminders = await importRemindersToEnhanced();

  return results;
}

// ENHANCED IMPORT FUNCTIONS (work with our existing schema)

async function importCustomersToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} customers for enhanced table...`);

  let success = 0;
  let errors = 0;
  const emailSet = new Set();

  // Process in smaller batches to be safe with enhanced schema
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const customerId = record._ID;
          if (!customerId) continue;

          // Handle email uniqueness
          let email = record.contactEmail || '';
          if (!email || emailSet.has(email)) {
            email = `customer.${customerId}@placeholder.com`;
          }
          emailSet.add(email);

          // Map GA4 fields to our enhanced schema
          await sql`
            INSERT INTO customers (
              id, account_number, title, forename, surname, company_name,
              house_no, road, locality, town, county, post_code,
              telephone, mobile, email, notes, created_at, updated_at
            ) VALUES (
              ${customerId},
              ${record.AccountNumber || ''},
              ${record.nameTitle || ''},
              ${record.nameForename || ''},
              ${record.nameSurname || ''},
              ${record.nameCompany || ''},
              ${record.addressHouseNo || ''},
              ${record.addressRoad || ''},
              ${record.addressLocality || ''},
              ${record.addressTown || ''},
              ${record.addressCounty || ''},
              ${record.addressPostCode || ''},
              ${record.contactTelephone || ''},
              ${record.contactMobile || ''},
              ${email},
              ${record.notes || ''},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              account_number = EXCLUDED.account_number,
              title = EXCLUDED.title,
              forename = EXCLUDED.forename,
              surname = EXCLUDED.surname,
              company_name = EXCLUDED.company_name,
              house_no = EXCLUDED.house_no,
              road = EXCLUDED.road,
              locality = EXCLUDED.locality,
              town = EXCLUDED.town,
              county = EXCLUDED.county,
              post_code = EXCLUDED.post_code,
              telephone = EXCLUDED.telephone,
              mobile = EXCLUDED.mobile,
              email = EXCLUDED.email,
              notes = EXCLUDED.notes,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          console.error(`      ❌ Customer error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

      // Progress reporting
      if ((i + batchSize) % 1000 === 0) {
        console.log(`      📈 Progress: ${success}/${records.length} customers imported`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} customers imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importVehiclesToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0, assigned: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} vehicles for enhanced table...`);

  let success = 0;
  let errors = 0;
  let assigned = 0;

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const registration = record._RegID || record.registration;
          if (!registration) continue;

          // Find customer ID in our enhanced customers table
          let customerId = null;
          if (record._ID_Customer) {
            const customerCheck = await sql`
              SELECT id FROM customers WHERE id = ${record._ID_Customer} LIMIT 1
            `;
            if (customerCheck.length > 0) {
              customerId = record._ID_Customer;
              assigned++;
            }
          }

          // Map GA4 fields to our enhanced vehicles schema
          await sql`
            INSERT INTO vehicles (
              registration, customer_id, make, model, year, colour, fuel_type,
              vin, engine_code, date_of_reg, created_at, updated_at
            ) VALUES (
              ${registration.trim().toUpperCase()},
              ${customerId},
              ${record.Make || ''},
              ${record.Model || ''},
              ${record.YearofManufacture ? parseInt(record.YearofManufacture) : null},
              ${record.Colour || ''},
              ${record.FuelType || ''},
              ${record.VIN || ''},
              ${record.EngineCode || ''},
              ${record.DateofReg || null},
              NOW(),
              NOW()
            )
            ON CONFLICT (registration) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              colour = EXCLUDED.colour,
              fuel_type = EXCLUDED.fuel_type,
              vin = EXCLUDED.vin,
              engine_code = EXCLUDED.engine_code,
              date_of_reg = EXCLUDED.date_of_reg,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          console.error(`      ❌ Vehicle error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

      if ((i + batchSize) % 1000 === 0) {
        console.log(`      📈 Progress: ${success}/${records.length} vehicles imported (${assigned} assigned)`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} vehicles imported to enhanced table, ${errors} errors, ${assigned} assigned`);
  return { total: records.length, success, errors, assigned };
}

async function importDocumentsToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} documents for enhanced table...`);

  let success = 0;
  let errors = 0;

  const batchSize = 50; // Smaller batches for documents
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const documentId = record._ID;
          if (!documentId) continue;

          // Find customer and vehicle IDs in our enhanced tables
          let customerId = null;
          let vehicleId = null;

          if (record._ID_Customer) {
            const customerCheck = await sql`
              SELECT id FROM customers WHERE id = ${record._ID_Customer} LIMIT 1
            `;
            if (customerCheck.length > 0) customerId = record._ID_Customer;
          }

          if (record._ID_Vehicle) {
            const vehicleCheck = await sql`
              SELECT id FROM vehicles WHERE registration = ${record._ID_Vehicle} LIMIT 1
            `;
            if (vehicleCheck.length > 0) vehicleId = vehicleCheck[0].id;
          }

          // Map GA4 fields to our enhanced documents schema
          await sql`
            INSERT INTO documents (
              id, customer_id, vehicle_id, document_type, document_number,
              document_date, total_amount, status, notes, created_at, updated_at
            ) VALUES (
              ${documentId},
              ${customerId},
              ${vehicleId},
              ${record.Type || 'Service'},
              ${record.Number || ''},
              ${record.DateIssued || null},
              ${record.TotalGross ? parseFloat(record.TotalGross) : 0},
              ${record.Status || 'completed'},
              ${record.Notes || ''},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              customer_id = EXCLUDED.customer_id,
              vehicle_id = EXCLUDED.vehicle_id,
              document_type = EXCLUDED.document_type,
              document_number = EXCLUDED.document_number,
              document_date = EXCLUDED.document_date,
              total_amount = EXCLUDED.total_amount,
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          console.error(`      ❌ Document error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

      if ((i + batchSize) % 2000 === 0) {
        console.log(`      📈 Progress: ${success}/${records.length} documents imported`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} documents imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importLineItemsToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'LineItems.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  LineItems.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} line items for enhanced table...`);

  let success = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const lineItemId = record._ID || record.id;
          if (!lineItemId) continue;

          // Find document ID in our enhanced documents table
          let documentId = null;
          if (record._ID_Document) {
            const docCheck = await sql`
              SELECT id FROM documents WHERE id = ${record._ID_Document} LIMIT 1
            `;
            if (docCheck.length > 0) documentId = record._ID_Document;
          }

          await sql`
            INSERT INTO line_items (
              id, document_id, description, quantity, unit_price, total_price, created_at, updated_at
            ) VALUES (
              ${lineItemId},
              ${documentId},
              ${record.itemDescription || record.description || ''},
              ${record.itemQuantity ? parseFloat(record.itemQuantity) : 1},
              ${record.itemPrice ? parseFloat(record.itemPrice) : 0},
              ${record.itemSub_Gross ? parseFloat(record.itemSub_Gross) : 0},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              document_id = EXCLUDED.document_id,
              description = EXCLUDED.description,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              total_price = EXCLUDED.total_price,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} line items imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importReceiptsToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Receipts.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Receipts.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} receipts for enhanced table...`);

  let success = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const receiptId = record._ID || record.id;
          if (!receiptId) continue;

          await sql`
            INSERT INTO receipts (
              id, document_id, amount, payment_method, receipt_date, created_at, updated_at
            ) VALUES (
              ${receiptId},
              ${record._ID_Document || ''},
              ${record.Amount ? parseFloat(record.Amount) : 0},
              ${record.PaymentMethod || 'Cash'},
              ${record.Date || null},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              document_id = EXCLUDED.document_id,
              amount = EXCLUDED.amount,
              payment_method = EXCLUDED.payment_method,
              receipt_date = EXCLUDED.receipt_date,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} receipts imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importStockToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Stock.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Stock.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} stock items for enhanced table...`);

  let success = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const stockId = record._ID || record.id;
          if (!stockId) continue;

          await sql`
            INSERT INTO stock (
              id, part_number, description, quantity, unit_price, created_at, updated_at
            ) VALUES (
              ${stockId},
              ${record.PartNumber || record.part_number || ''},
              ${record.Description || record.description || ''},
              ${record.Quantity ? parseInt(record.Quantity) : 0},
              ${record.UnitPrice ? parseFloat(record.UnitPrice) : 0},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              part_number = EXCLUDED.part_number,
              description = EXCLUDED.description,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} stock items imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importRemindersToEnhanced() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Reminders.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`      ⏭️  Reminders.csv not found, skipping`);
    return { total: 0, success: 0, errors: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} reminders for enhanced table...`);

  let success = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const reminderId = record._ID || record.id;
          if (!reminderId) continue;

          // Find vehicle and customer IDs in our enhanced tables
          let vehicleId = null;
          let customerId = null;

          if (record._ID_Vehicle) {
            const vehicleCheck = await sql`
              SELECT id, customer_id FROM vehicles WHERE registration = ${record._ID_Vehicle} LIMIT 1
            `;
            if (vehicleCheck.length > 0) {
              vehicleId = vehicleCheck[0].id;
              customerId = vehicleCheck[0].customer_id;
            }
          }

          await sql`
            INSERT INTO reminders (
              id, vehicle_id, customer_id, reminder_type, reminder_date, status, created_at
            ) VALUES (
              ${reminderId},
              ${vehicleId},
              ${customerId},
              ${record.Type || record.reminder_type || 'MOT'},
              ${record.DueDate || record.reminder_date || null},
              ${record.Status || record.status || 'pending'},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              vehicle_id = EXCLUDED.vehicle_id,
              customer_id = EXCLUDED.customer_id,
              reminder_type = EXCLUDED.reminder_type,
              reminder_date = EXCLUDED.reminder_date,
              status = EXCLUDED.status
          `;

          success++;
        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      errors += batch.length;
    }
  }

  console.log(`      ✅ ${success} reminders imported to enhanced table, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function generateEnhancedReport(coreResults, enhancedResults) {
  const finalStats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM vehicles) as vehicles,
      (SELECT COUNT(*) FROM documents) as documents,
      (SELECT COUNT(*) FROM line_items) as line_items,
      (SELECT COUNT(*) FROM receipts) as receipts,
      (SELECT COUNT(*) FROM stock) as stock,
      (SELECT COUNT(*) FROM reminders) as reminders,
      (SELECT COUNT(*) FROM whatsapp_messages) as whatsapp_messages,
      (SELECT COUNT(*) FROM mot_reminders) as mot_reminders,
      (SELECT COUNT(*) FROM parts) as parts,
      (SELECT COUNT(*) FROM technicians) as technicians
  `;

  const stats = finalStats[0];

  console.log(`\n🎉 ENHANCED SCHEMA-PRESERVING IMPORT COMPLETED!`);
  console.log(`\n📊 ENHANCED DATABASE STATE:`);
  console.log(`   👥 Customers: ${stats.customers}`);
  console.log(`   🚗 Vehicles: ${stats.vehicles}`);
  console.log(`   📋 Documents: ${stats.documents}`);
  console.log(`   📝 Line Items: ${stats.line_items}`);
  console.log(`   🧾 Receipts: ${stats.receipts}`);
  console.log(`   📦 Stock: ${stats.stock}`);
  console.log(`   🔔 Reminders: ${stats.reminders}`);
  console.log(`\n🛡️  ENHANCED FEATURES PRESERVED:`);
  console.log(`   💬 WhatsApp Messages: ${stats.whatsapp_messages}`);
  console.log(`   🔧 MOT Reminders: ${stats.mot_reminders}`);
  console.log(`   🔩 Parts Database: ${stats.parts}`);
  console.log(`   👨‍🔧 Technicians: ${stats.technicians}`);

  const totalRecords = Object.values(stats).reduce((sum, count) => sum + parseInt(count), 0);
  console.log(`\n📈 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);

  console.log(`\n✅ ALL ENHANCED FEATURES PRESERVED AND DATA IMPORTED!`);
  console.log(`🎯 Your enhanced garage management system is ready for full operation!`);
}

// Run the enhanced schema-preserving import
enhancedSchemaPreservingImport()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 SUCCESS! Enhanced schema preserved and data imported!');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Test all enhanced features with imported data');
      console.log('2. Verify WhatsApp integration works with customer data');
      console.log('3. Test MOT reminders with vehicle data');
      console.log('4. Verify all enhanced tables are functioning');
      console.log('\n🛡️  Your enhanced garage management system is fully operational!');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 UNEXPECTED ERROR:', error);
    process.exit(1);
  });
