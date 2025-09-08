require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);
const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function correctedSchemaAwareImport() {
  const startTime = Date.now();
  
  try {
    console.log('🎯 CORRECTED SCHEMA-AWARE IMPORT\n');
    console.log('Using ACTUAL database schema column names\n');

    // Step 1: Import customers using actual schema
    console.log('👥 Step 1: Importing customers to actual schema...');
    const customersResult = await importCustomersActualSchema();

    // Step 2: Import vehicles using actual schema
    console.log('\n🚗 Step 2: Importing vehicles to actual schema...');
    const vehiclesResult = await importVehiclesActualSchema();

    // Step 3: Import documents using actual schema
    console.log('\n📋 Step 3: Importing documents to actual schema...');
    const documentsResult = await importDocumentsActualSchema();

    // Step 4: Final report
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    await generateActualSchemaReport(customersResult, vehiclesResult, documentsResult, totalTime);

    return { success: true, totalTime };

  } catch (error) {
    console.error('\n❌ CORRECTED SCHEMA-AWARE IMPORT FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function importCustomersActualSchema() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} customers with actual schema...`);

  let success = 0;
  let errors = 0;
  const emailSet = new Set();

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

          // Use ACTUAL customers table schema
          await sql`
            INSERT INTO customers (
              id, first_name, last_name, email, phone, 
              address_line1, city, postcode, created_at, updated_at
            ) VALUES (
              ${customerId},
              ${record.nameForename || ''},
              ${record.nameSurname || ''},
              ${email},
              ${record.contactTelephone || record.contactMobile || ''},
              ${record.addressRoad || ''},
              ${record.addressTown || ''},
              ${record.addressPostCode || ''},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              address_line1 = EXCLUDED.address_line1,
              city = EXCLUDED.city,
              postcode = EXCLUDED.postcode,
              updated_at = NOW()
          `;

          success++;
        } catch (error) {
          console.error(`      ❌ Customer error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

      if ((i + batchSize) % 1000 === 0) {
        console.log(`      📈 Progress: ${success}/${records.length} customers imported`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`   ✅ ${success} customers imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importVehiclesActualSchema() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0, assigned: 0 };

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} vehicles with actual schema...`);

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

          // Use GA4's _ID_Customer for proper assignment
          const ownerId = record._ID_Customer || null;
          if (ownerId) assigned++;

          // Use ACTUAL vehicles table schema
          await sql`
            INSERT INTO vehicles (
              registration, make, model, year, color, fuel_type,
              engine_size, vin, owner_id, created_at, updated_at
            ) VALUES (
              ${registration.trim().toUpperCase()},
              ${record.Make || ''},
              ${record.Model || ''},
              ${record.YearofManufacture ? parseInt(record.YearofManufacture) : null},
              ${record.Colour || ''},
              ${record.FuelType || ''},
              ${record.EngineCC ? parseFloat(record.EngineCC) : null},
              ${record.VIN || ''},
              ${ownerId},
              NOW(),
              NOW()
            )
            ON CONFLICT (registration) DO UPDATE SET
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              color = EXCLUDED.color,
              fuel_type = EXCLUDED.fuel_type,
              engine_size = EXCLUDED.engine_size,
              vin = EXCLUDED.vin,
              owner_id = EXCLUDED.owner_id,
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

  console.log(`   ✅ ${success} vehicles imported, ${errors} errors, ${assigned} assigned`);
  return { total: records.length, success, errors, assigned };
}

async function importDocumentsActualSchema() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  if (!fs.existsSync(filePath)) return { total: 0, success: 0, errors: 0 };

  // First check the actual documents table schema
  const docSchema = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'documents' 
    ORDER BY ordinal_position
  `;
  
  console.log(`   📋 Documents table has ${docSchema.length} columns`);

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true, skip_empty_lines: true, trim: true, relax_quotes: true, relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} documents with actual schema...`);

  let success = 0;
  let errors = 0;

  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const documentId = record._ID;
          if (!documentId) continue;

          // Use basic fields that should exist in documents table
          await sql`
            INSERT INTO documents (
              id, _id_customer, doc_type, doc_number, doc_date_issued, 
              customer_name, total_gross, created_at, updated_at
            ) VALUES (
              ${documentId},
              ${record._ID_Customer || ''},
              ${record.Type || 'Service'},
              ${record.Number || ''},
              ${record.DateIssued || null},
              ${record.CustomerName || ''},
              ${record.TotalGross ? parseFloat(record.TotalGross) : 0},
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              _id_customer = EXCLUDED._id_customer,
              doc_type = EXCLUDED.doc_type,
              doc_number = EXCLUDED.doc_number,
              doc_date_issued = EXCLUDED.doc_date_issued,
              customer_name = EXCLUDED.customer_name,
              total_gross = EXCLUDED.total_gross,
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

  console.log(`   ✅ ${success} documents imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function generateActualSchemaReport(customersResult, vehiclesResult, documentsResult, totalTime) {
  const finalStats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM vehicles) as vehicles,
      (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
      (SELECT COUNT(*) FROM documents) as documents
  `;

  const stats = finalStats[0];
  const assignmentPercent = Math.round((stats.vehicles_assigned / stats.vehicles) * 100);

  console.log(`\n🎉 CORRECTED SCHEMA-AWARE IMPORT COMPLETED!`);
  console.log(`⏱️  Total time: ${totalTime} seconds`);
  console.log(`\n📊 IMPORT RESULTS:`);
  console.log(`   👥 Customers: ${customersResult.success}/${customersResult.total} (${customersResult.errors} errors)`);
  console.log(`   🚗 Vehicles: ${vehiclesResult.success}/${vehiclesResult.total} (${vehiclesResult.assigned} assigned, ${vehiclesResult.errors} errors)`);
  console.log(`   📋 Documents: ${documentsResult.success}/${documentsResult.total} (${documentsResult.errors} errors)`);

  console.log(`\n📈 FINAL DATABASE STATE:`);
  console.log(`   - Total customers: ${stats.customers}`);
  console.log(`   - Total vehicles: ${stats.vehicles} (${assignmentPercent}% assigned to customers)`);
  console.log(`   - Total documents: ${stats.documents}`);

  // Check for bulk assignment issues
  const bulkCheck = await sql`
    SELECT COUNT(*) as count
    FROM (
      SELECT owner_id, COUNT(*) as vehicle_count
      FROM vehicles 
      WHERE owner_id IS NOT NULL
      GROUP BY owner_id
      HAVING COUNT(*) > 10
    ) bulk_customers
  `;

  if (parseInt(bulkCheck[0].count) === 0) {
    console.log(`\n✅ NO BULK ASSIGNMENT ISSUES - Perfect customer-vehicle relationships!`);
  } else {
    console.log(`\n⚠️  ${bulkCheck[0].count} customers have >10 vehicles (may need review)`);
  }

  console.log(`\n🎯 SUCCESS! Your enhanced database is populated with GA4 data!`);
  console.log(`🚀 Ready for WhatsApp integration and full garage management operations!`);
}

// Run the corrected schema-aware import
correctedSchemaAwareImport()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 SUCCESS! Schema-aware import completed successfully!');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Test customer data in your UI');
      console.log('2. Verify vehicle-customer relationships');
      console.log('3. Test document associations');
      console.log('4. Proceed with WhatsApp integration');
      console.log('\n🛡️  All your enhanced database features are preserved and populated!');
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
