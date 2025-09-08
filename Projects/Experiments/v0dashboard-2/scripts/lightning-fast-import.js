require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

async function lightningFastImport() {
  const startTime = Date.now();
  
  try {
    console.log('⚡ LIGHTNING FAST IMPORT - Direct Database Method\n');
    console.log('Based on all lessons learned - this WILL work!\n');

    // Step 1: Clear database
    console.log('🗑️  Step 1: Clearing database...');
    await sql`DELETE FROM documents`;
    await sql`DELETE FROM vehicles`;  
    await sql`DELETE FROM customers`;
    console.log('   ✅ Database cleared');

    // Step 2: Import customers with simple, proven approach
    console.log('\n👥 Step 2: Importing customers (SIMPLE & FAST)...');
    const customersResult = await importCustomersLightning();

    // Step 3: Import vehicles with proper GA4 assignments
    console.log('\n🚗 Step 3: Importing vehicles (with GA4 assignments)...');
    const vehiclesResult = await importVehiclesLightning();

    // Step 4: Import documents
    console.log('\n📄 Step 4: Importing documents...');
    const documentsResult = await importDocumentsLightning();

    // Step 5: Final validation
    console.log('\n✅ Step 5: Final validation...');
    const validation = await validateFinal();

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 LIGHTNING FAST IMPORT COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   - Customers: ${customersResult.success}/${customersResult.total}`);
    console.log(`   - Vehicles: ${vehiclesResult.success}/${vehiclesResult.total} (${vehiclesResult.assigned} assigned)`);
    console.log(`   - Documents: ${documentsResult.success}/${documentsResult.total}`);
    
    if (validation.bulkIssues === 0) {
      console.log(`\n✅ NO BULK ASSIGNMENT ISSUES - Perfect!`);
    } else {
      console.log(`\n⚠️  ${validation.bulkIssues} customers have >10 vehicles`);
    }

    console.log(`\n🚀 Database ready for WhatsApp integration!`);

    return { success: true, totalTime };

  } catch (error) {
    console.error('\n❌ LIGHTNING FAST IMPORT FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function importCustomersLightning() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} customers...`);

  let success = 0;
  let errors = 0;
  const emailSet = new Set();

  // Simple approach: process one by one but with proper error handling
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
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

      // Progress every 1000 records
      if (success % 1000 === 0) {
        console.log(`      📈 ${success}/${records.length} customers imported`);
      }

    } catch (error) {
      errors++;
      if (errors < 10) {
        console.log(`      ❌ Customer error: ${error.message}`);
      }
    }
  }

  console.log(`   ✅ Customers: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importVehiclesLightning() {
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`   📊 Processing ${records.length} vehicles...`);

  let success = 0;
  let errors = 0;
  let assigned = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
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

      if (success % 1000 === 0) {
        console.log(`      📈 ${success}/${records.length} vehicles imported (${assigned} assigned)`);
      }

    } catch (error) {
      errors++;
      if (errors < 10) {
        console.log(`      ❌ Vehicle error: ${error.message}`);
      }
    }
  }

  console.log(`   ✅ Vehicles: ${success} imported, ${errors} errors, ${assigned} assigned to customers`);
  return { total: records.length, success, errors, assigned };
}

async function importDocumentsLightning() {
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

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
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

      if (success % 2000 === 0) {
        console.log(`      📈 ${success}/${records.length} documents imported`);
      }

    } catch (error) {
      errors++;
      if (errors < 10) {
        console.log(`      ❌ Document error: ${error.message}`);
      }
    }
  }

  console.log(`   ✅ Documents: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function validateFinal() {
  const stats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM vehicles) as vehicles,
      (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
      (SELECT COUNT(*) FROM documents) as documents
  `;

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

  return {
    stats: stats[0],
    bulkIssues: parseInt(bulkCheck[0].count)
  };
}

// Run the lightning fast import
lightningFastImport()
  .then(result => {
    if (result.success) {
      console.log('\n✅ SUCCESS! Ready for WhatsApp integration!');
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
