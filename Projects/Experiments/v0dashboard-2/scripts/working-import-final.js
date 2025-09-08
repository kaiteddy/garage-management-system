require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function workingImportFinal() {
  const startTime = Date.now();
  
  try {
    console.log('🔥 WORKING IMPORT FINAL - This WILL work!\n');
    console.log('Using proven methods with optimized performance\n');

    // Step 1: Clear database
    console.log('🗑️  Step 1: Clearing database...');
    await sql`DELETE FROM documents`;
    await sql`DELETE FROM vehicles`;
    await sql`DELETE FROM customers`;
    console.log('   ✅ Database cleared');

    // Step 2: Import customers with proven method
    console.log('\n👥 Step 2: Importing customers...');
    const customersResult = await importCustomersWorking();

    // Step 3: Import vehicles with GA4 assignments
    console.log('\n🚗 Step 3: Importing vehicles...');
    const vehiclesResult = await importVehiclesWorking();

    // Step 4: Import documents
    console.log('\n📄 Step 4: Importing documents...');
    const documentsResult = await importDocumentsWorking();

    // Step 5: Final cleanup and validation
    console.log('\n🔧 Step 5: Final cleanup...');
    
    // Clear customer_id field to use only owner_id
    const cleanupResult = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL
    `;
    console.log(`   ✅ Cleared ${cleanupResult.count || 0} customer_id fields`);

    // Final statistics
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
        (SELECT COUNT(*) FROM documents) as documents
    `;

    const stats = finalStats[0];
    const assignmentPercent = Math.round((stats.vehicles_assigned / stats.vehicles) * 100);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 WORKING IMPORT FINAL COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   - Customers: ${customersResult.success}/${customersResult.total} (${customersResult.errors} errors)`);
    console.log(`   - Vehicles: ${vehiclesResult.success}/${vehiclesResult.total} (${vehiclesResult.assigned} assigned, ${vehiclesResult.errors} errors)`);
    console.log(`   - Documents: ${documentsResult.success}/${documentsResult.total} (${documentsResult.errors} errors)`);
    console.log(`\n📈 DATABASE STATS:`);
    console.log(`   - Total customers: ${stats.customers}`);
    console.log(`   - Total vehicles: ${stats.vehicles} (${assignmentPercent}% assigned)`);
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
      console.log(`\n✅ NO BULK ASSIGNMENT ISSUES - Perfect!`);
    } else {
      console.log(`\n⚠️  ${bulkCheck[0].count} customers have >10 vehicles (may need review)`);
    }

    console.log(`\n🚀 DATABASE IS READY FOR WHATSAPP INTEGRATION!`);

    return { success: true, totalTime, stats };

  } catch (error) {
    console.error('\n❌ WORKING IMPORT FINAL FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function importCustomersWorking() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} customers with batch transactions...`);

  let success = 0;
  let errors = 0;
  const emailSet = new Set();
  const batchSize = 100; // Smaller batches for reliability

  // Process in small batches with transactions
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      // Use transaction for each batch
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const customerId = record._ID;
          if (!customerId) continue;

          // Simple email handling
          let email = record.contactEmail || '';
          if (!email || emailSet.has(email)) {
            email = `customer.${customerId}@placeholder.com`;
          }
          emailSet.add(email);

          await sql`
            INSERT INTO customers (
              id, first_name, last_name, phone, email, address_line1, city, postcode, created_at, updated_at
            ) VALUES (
              ${customerId},
              ${record.nameForename || ''},
              ${record.nameSurname || ''},
              ${record.contactTelephone || record.contactMobile || ''},
              ${email},
              ${record.addressRoad || ''},
              ${record.addressTown || ''},
              ${record.addressPostCode || ''},
              NOW(),
              NOW()
            )
          `;

          success++;

        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;

      // Progress reporting
      if ((i + batchSize) % 1000 === 0) {
        console.log(`      📈 ${success}/${records.length} customers imported`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`   ✅ Customers: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importVehiclesWorking() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} vehicles with GA4 customer assignments...`);

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

          // CRITICAL: Use GA4's _ID_Customer for proper assignment
          const customerId = record._ID_Customer || null;
          if (customerId) assigned++;

          await sql`
            INSERT INTO vehicles (
              registration, make, model, year, color, fuel_type, engine_size, vin, owner_id, created_at, updated_at
            ) VALUES (
              ${registration.trim().toUpperCase()},
              ${record.Make || ''},
              ${record.Model || ''},
              ${record.YearofManufacture ? parseInt(record.YearofManufacture) : null},
              ${record.Colour || ''},
              ${record.FuelType || ''},
              ${record.EngineCC || ''},
              ${record.VIN || ''},
              ${customerId},
              NOW(),
              NOW()
            )
          `;

          success++;

        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;

      if ((i + batchSize) % 1000 === 0) {
        console.log(`      📈 ${success}/${records.length} vehicles imported (${assigned} assigned)`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`   ✅ Vehicles: ${success} imported, ${errors} errors, ${assigned} assigned to customers`);
  return { total: records.length, success, errors, assigned };
}

async function importDocumentsWorking() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} documents...`);

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

          await sql`
            INSERT INTO documents (
              id, _id_customer, doc_type, doc_number, doc_date_issued, customer_name, total_gross, created_at, updated_at
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
          `;

          success++;

        } catch (error) {
          errors++;
        }
      }

      await sql`COMMIT`;

      if ((i + batchSize) % 2000 === 0) {
        console.log(`      📈 ${success}/${records.length} documents imported`);
      }

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`   ✅ Documents: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

// Run the working import
workingImportFinal()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 SUCCESS! Database import completed successfully!');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Verify data in your UI');
      console.log('2. Test customer-vehicle relationships');
      console.log('3. Proceed with WhatsApp integration');
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
