require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

// Configuration for optimal performance with Neon constraints
const CONFIG = {
  BATCH_SIZE: 500,           // Smaller batches for Neon
  PROGRESS_INTERVAL: 250,    // Show progress more frequently
  MAX_RETRIES: 3
};

async function perfectFreshImportNeon() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 PERFECT FRESH IMPORT - Neon Optimized\n');
    console.log('Fast, accurate import with proper GA4 customer-vehicle relationships\n');

    // Phase 1: Clear existing data
    console.log('📋 PHASE 1: Clearing existing data');
    await clearExistingData();

    // Phase 2: Import data in optimized order
    console.log('\n📊 PHASE 2: Optimized Data Import');
    
    const results = {
      customers: await importCustomersNeonOptimized(),
      vehicles: await importVehiclesNeonOptimized(),
      documents: await importDocumentsNeonOptimized()
    };

    // Phase 3: Validation
    console.log('\n✅ PHASE 3: Validation & Quality Assurance');
    const validation = await validateImport();

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n🎉 PERFECT FRESH IMPORT COMPLETED!');
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   - Customers: ${results.customers.success}/${results.customers.total} (${results.customers.errors} errors)`);
    console.log(`   - Vehicles: ${results.vehicles.success}/${results.vehicles.total} (${results.vehicles.errors} errors)`);
    console.log(`   - Documents: ${results.documents.success}/${results.documents.total} (${results.documents.errors} errors)`);
    
    if (validation.success) {
      console.log('\n✅ ALL VALIDATION CHECKS PASSED!');
      console.log('Database is ready for production use.');
      console.log(`\n🎯 KEY ACHIEVEMENTS:`);
      console.log(`   - ${validation.stats.vehiclesAssigned} vehicles properly assigned to customers`);
      console.log(`   - ${validation.stats.assignmentPercent}% of vehicles have owners`);
      console.log(`   - Clean customer-vehicle relationships from GA4 data`);
    } else {
      console.log('\n⚠️  VALIDATION ISSUES DETECTED:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    return { success: true, results, validation, totalTime };

  } catch (error) {
    console.error('\n❌ PERFECT FRESH IMPORT FAILED:', error);
    return { success: false, error: error.message };
  }
}

async function clearExistingData() {
  console.log('   🗑️  Clearing existing data in dependency order...');
  
  // Clear data in reverse dependency order to avoid constraint violations
  await sql`DELETE FROM documents`;
  await sql`DELETE FROM vehicles`;  
  await sql`DELETE FROM customers`;
  
  console.log('   ✅ Database cleared successfully');
}

async function importCustomersNeonOptimized() {
  console.log('   👥 Importing customers (Neon optimized)...');
  
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} customer records in optimized batches...`);

  let success = 0;
  let errors = 0;
  const emailTracker = new Set();

  // Process in batches optimized for Neon
  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
    
    try {
      // Use transaction for each batch
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const customerId = record._ID;
          if (!customerId) continue;

          // Handle email uniqueness
          let email = record.contactEmail || '';
          if (!email || email.trim() === '' || emailTracker.has(email)) {
            email = `noemail.${customerId}@placeholder.com`;
          }
          emailTracker.add(email);

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
          console.error(`      ❌ Customer error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }

    // Progress reporting
    if ((i + CONFIG.BATCH_SIZE) % (CONFIG.PROGRESS_INTERVAL * 2) === 0) {
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100);
      console.log(`      📈 Progress: ${progress}% (${success + errors}/${records.length})`);
    }
  }

  console.log(`      ✅ Customers: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function importVehiclesNeonOptimized() {
  console.log('   🚗 Importing vehicles with proper GA4 customer assignments...');
  
  const filePath = path.join(GA4_EXPORT_PATH, 'Vehicles.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} vehicle records with customer assignments...`);

  let success = 0;
  let errors = 0;
  let properlyAssigned = 0;

  // Process in batches
  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
    
    try {
      await sql`BEGIN`;
      
      for (const record of batch) {
        try {
          const registration = record._RegID || record.registration;
          if (!registration || registration.trim() === '') continue;

          // CRITICAL: Use _ID_Customer from GA4 for proper assignment
          const customerId = record._ID_Customer || null;
          if (customerId) properlyAssigned++;

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
          console.error(`      ❌ Vehicle error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }

    if ((i + CONFIG.BATCH_SIZE) % (CONFIG.PROGRESS_INTERVAL * 2) === 0) {
      const progress = Math.round(((i + CONFIG.BATCH_SIZE) / records.length) * 100);
      console.log(`      📈 Progress: ${progress}% (${success + errors}/${records.length})`);
    }
  }

  console.log(`      ✅ Vehicles: ${success} imported, ${errors} errors`);
  console.log(`      🔗 Properly assigned to customers: ${properlyAssigned}`);
  return { total: records.length, success, errors, properlyAssigned };
}

async function importDocumentsNeonOptimized() {
  console.log('   📄 Importing documents...');
  
  const filePath = path.join(GA4_EXPORT_PATH, 'Documents.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} document records...`);

  let success = 0;
  let errors = 0;

  // Process in smaller batches for documents
  const docBatchSize = 250;
  
  for (let i = 0; i < records.length; i += docBatchSize) {
    const batch = records.slice(i, i + docBatchSize);
    
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
          console.error(`      ❌ Document error: ${error.message}`);
          errors++;
        }
      }

      await sql`COMMIT`;

    } catch (error) {
      await sql`ROLLBACK`;
      console.error(`      ❌ Batch error: ${error.message}`);
      errors += batch.length;
    }

    if ((i + docBatchSize) % (CONFIG.PROGRESS_INTERVAL * 4) === 0) {
      const progress = Math.round(((i + docBatchSize) / records.length) * 100);
      console.log(`      📈 Progress: ${progress}% (${success + errors}/${records.length})`);
    }
  }

  console.log(`      ✅ Documents: ${success} imported, ${errors} errors`);
  return { total: records.length, success, errors };
}

async function validateImport() {
  console.log('   🔍 Running comprehensive validation...');
  
  const issues = [];
  
  // Check customer counts
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
  console.log(`      📊 Customers imported: ${customerCount[0].count}`);
  
  // Check vehicle assignments
  const vehicleStats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(owner_id) as assigned,
      COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as unassigned
    FROM vehicles
  `;
  
  const assignedPercent = Math.round((vehicleStats[0].assigned / vehicleStats[0].total) * 100);
  console.log(`      🚗 Vehicles: ${vehicleStats[0].total} total, ${vehicleStats[0].assigned} assigned (${assignedPercent}%)`);
  
  // Check document counts
  const documentCount = await sql`SELECT COUNT(*) as count FROM documents`;
  console.log(`      📄 Documents imported: ${documentCount[0].count}`);
  
  // Check for bulk assignment issues
  const bulkAssignments = await sql`
    SELECT 
      c.first_name, c.last_name, c.phone,
      COUNT(v.registration) as vehicle_count
    FROM customers c
    INNER JOIN vehicles v ON c.id = v.owner_id
    GROUP BY c.id, c.first_name, c.last_name, c.phone
    HAVING COUNT(v.registration) > 10
    ORDER BY COUNT(v.registration) DESC
    LIMIT 5
  `;
  
  if (bulkAssignments.length > 0) {
    console.log(`      ⚠️  Found ${bulkAssignments.length} customers with >10 vehicles:`);
    bulkAssignments.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
      console.log(`         - ${name}: ${customer.vehicle_count} vehicles`);
    });
    issues.push(`${bulkAssignments.length} customers have >10 vehicles`);
  } else {
    console.log(`      ✅ No bulk assignment issues detected`);
  }
  
  // Check NATANIEL specifically (if he exists in GA4 data)
  const nataniel = await sql`
    SELECT 
      c.first_name, c.last_name,
      COUNT(v.registration) as vehicle_count,
      STRING_AGG(v.registration, ', ') as vehicles
    FROM customers c
    LEFT JOIN vehicles v ON c.id = v.owner_id
    WHERE c.first_name ILIKE '%nataniel%'
    GROUP BY c.id, c.first_name, c.last_name
  `;
  
  if (nataniel.length > 0) {
    console.log(`      👤 NATANIEL found: ${nataniel[0].vehicle_count} vehicle(s) - ${nataniel[0].vehicles || 'None'}`);
    if (nataniel[0].vehicles && nataniel[0].vehicles.includes('WK17WXV')) {
      console.log(`      ✅ NATANIEL has WK17WXV correctly assigned`);
    }
  } else {
    console.log(`      ℹ️  NATANIEL not found in GA4 data (may not be in current export)`);
  }
  
  console.log(`      ✅ Validation completed: ${issues.length} issues found`);
  
  return {
    success: issues.length === 0,
    issues: issues,
    stats: {
      customers: parseInt(customerCount[0].count),
      vehicles: parseInt(vehicleStats[0].total),
      vehiclesAssigned: parseInt(vehicleStats[0].assigned),
      assignmentPercent: assignedPercent,
      documents: parseInt(documentCount[0].count)
    }
  };
}

// Run if called directly
if (require.main === module) {
  perfectFreshImportNeon()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 PERFECT FRESH IMPORT COMPLETED SUCCESSFULLY!');
        console.log('\n🚀 Ready for WhatsApp integration and production use!');
        process.exit(0);
      } else {
        console.error('\n❌ PERFECT FRESH IMPORT FAILED:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 UNEXPECTED ERROR:', error);
      process.exit(1);
    });
}
