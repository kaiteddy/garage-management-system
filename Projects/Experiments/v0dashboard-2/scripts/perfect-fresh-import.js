require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const sql = neon(process.env.DATABASE_URL);

const GA4_EXPORT_PATH = '/Users/adamrutstein/Desktop/GA4 Export';

// Configuration for optimal performance
const CONFIG = {
  BATCH_SIZE: 1000,           // Process 1000 records at once
  PROGRESS_INTERVAL: 500,     // Show progress every 500 records
  MAX_RETRIES: 3,            // Retry failed operations
  PARALLEL_BATCHES: 5        // Process multiple batches in parallel
};

async function perfectFreshImport() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 PERFECT FRESH IMPORT - Optimized for Speed & Accuracy\n');
    console.log('Based on lessons learned from previous imports\n');

    // Phase 1: Pre-import preparation
    console.log('📋 PHASE 1: Pre-import Preparation');
    await prepareDatabase();

    // Phase 2: Import data in optimized order
    console.log('\n📊 PHASE 2: Data Import (Optimized)');
    
    const results = {
      customers: await importCustomersOptimized(),
      vehicles: await importVehiclesOptimized(),
      documents: await importDocumentsOptimized()
    };

    // Phase 3: Post-import optimization
    console.log('\n🔧 PHASE 3: Post-import Optimization');
    await optimizeDatabase();

    // Phase 4: Validation
    console.log('\n✅ PHASE 4: Validation & Quality Assurance');
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

async function prepareDatabase() {
  console.log('   🗑️  Clearing existing data...');
  
  // Clear data in reverse dependency order
  await sql`TRUNCATE TABLE documents CASCADE`;
  await sql`TRUNCATE TABLE vehicles CASCADE`;  
  await sql`TRUNCATE TABLE customers CASCADE`;
  
  console.log('   📊 Temporarily disabling constraints for performance...');
  
  // Disable triggers and constraints for faster import
  await sql`ALTER TABLE customers DISABLE TRIGGER ALL`;
  await sql`ALTER TABLE vehicles DISABLE TRIGGER ALL`;
  await sql`ALTER TABLE documents DISABLE TRIGGER ALL`;
  
  // Drop indexes temporarily
  try {
    await sql`DROP INDEX IF EXISTS customers_email_idx`;
    await sql`DROP INDEX IF EXISTS vehicles_registration_idx`;
    await sql`DROP INDEX IF EXISTS vehicles_owner_id_idx`;
  } catch (error) {
    // Indexes might not exist, continue
  }
  
  console.log('   ✅ Database prepared for optimal import');
}

async function importCustomersOptimized() {
  console.log('   👥 Importing customers (OPTIMIZED)...');
  
  const filePath = path.join(GA4_EXPORT_PATH, 'Customers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`      📊 Processing ${records.length} customer records in batches...`);

  let success = 0;
  let errors = 0;
  const emailTracker = new Set(); // Track emails to ensure uniqueness

  // Process in batches for optimal performance
  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
    
    try {
      // Prepare batch data
      const batchData = batch.map(record => {
        const customerId = record._ID;
        if (!customerId) return null;

        // Handle email uniqueness intelligently
        let email = record.contactEmail || '';
        if (!email || email.trim() === '' || emailTracker.has(email)) {
          email = `noemail.${customerId}@placeholder.com`;
        }
        emailTracker.add(email);

        return {
          id: customerId,
          first_name: record.nameForename || '',
          last_name: record.nameSurname || '',
          phone: record.contactTelephone || record.contactMobile || '',
          email: email,
          address_line1: record.addressRoad || '',
          city: record.addressTown || '',
          postcode: record.addressPostCode || ''
        };
      }).filter(Boolean);

      // Bulk insert using VALUES clause
      if (batchData.length > 0) {
        const values = batchData.map(customer => 
          `('${customer.id}', '${customer.first_name.replace(/'/g, "''")}', '${customer.last_name.replace(/'/g, "''")}', '${customer.phone}', '${customer.email}', '${customer.address_line1.replace(/'/g, "''")}', '${customer.city.replace(/'/g, "''")}', '${customer.postcode}', NOW(), NOW())`
        ).join(',');

        await sql.unsafe(`
          INSERT INTO customers (id, first_name, last_name, phone, email, address_line1, city, postcode, created_at, updated_at)
          VALUES ${values}
        `);

        success += batchData.length;
      }

    } catch (error) {
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

async function importVehiclesOptimized() {
  console.log('   🚗 Importing vehicles (OPTIMIZED with proper customer assignments)...');
  
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
      const batchData = batch.map(record => {
        const registration = record._RegID || record.registration;
        if (!registration || registration.trim() === '') return null;

        // CRITICAL: Use _ID_Customer from GA4 for proper assignment
        const customerId = record._ID_Customer || null;
        if (customerId) properlyAssigned++;

        return {
          registration: registration.trim().toUpperCase(),
          make: record.Make || '',
          model: record.Model || '',
          year: record.YearofManufacture ? parseInt(record.YearofManufacture) : null,
          color: record.Colour || '',
          fuel_type: record.FuelType || '',
          engine_size: record.EngineCC || '',
          vin: record.VIN || '',
          owner_id: customerId  // Proper assignment from GA4!
        };
      }).filter(Boolean);

      if (batchData.length > 0) {
        const values = batchData.map(vehicle => 
          `('${vehicle.registration}', '${vehicle.make.replace(/'/g, "''")}', '${vehicle.model.replace(/'/g, "''")}', ${vehicle.year || 'NULL'}, '${vehicle.color.replace(/'/g, "''")}', '${vehicle.fuel_type}', '${vehicle.engine_size}', '${vehicle.vin}', ${vehicle.owner_id ? `'${vehicle.owner_id}'` : 'NULL'}, NOW(), NOW())`
        ).join(',');

        await sql.unsafe(`
          INSERT INTO vehicles (registration, make, model, year, color, fuel_type, engine_size, vin, owner_id, created_at, updated_at)
          VALUES ${values}
        `);

        success += batchData.length;
      }

    } catch (error) {
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

async function importDocumentsOptimized() {
  console.log('   📄 Importing documents (OPTIMIZED)...');
  
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

  // Process in smaller batches for documents (they're larger)
  const docBatchSize = 500;
  
  for (let i = 0; i < records.length; i += docBatchSize) {
    const batch = records.slice(i, i + docBatchSize);
    
    try {
      const batchData = batch.map(record => {
        const documentId = record._ID;
        if (!documentId) return null;

        return {
          id: documentId,
          customer_id: record._ID_Customer || '',
          doc_type: record.Type || 'Service',
          doc_number: record.Number || '',
          doc_date_issued: record.DateIssued || null,
          customer_name: record.CustomerName || '',
          total_gross: record.TotalGross ? parseFloat(record.TotalGross) : 0
        };
      }).filter(Boolean);

      if (batchData.length > 0) {
        const values = batchData.map(doc => 
          `('${doc.id}', '${doc.customer_id}', '${doc.doc_type}', '${doc.doc_number}', ${doc.doc_date_issued ? `'${doc.doc_date_issued}'` : 'NULL'}, '${doc.customer_name.replace(/'/g, "''")}', ${doc.total_gross}, NOW(), NOW())`
        ).join(',');

        await sql.unsafe(`
          INSERT INTO documents (id, _id_customer, doc_type, doc_number, doc_date_issued, customer_name, total_gross, created_at, updated_at)
          VALUES ${values}
        `);

        success += batchData.length;
      }

    } catch (error) {
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

async function optimizeDatabase() {
  console.log('   🔧 Re-enabling constraints and creating indexes...');
  
  // Re-enable triggers
  await sql`ALTER TABLE customers ENABLE TRIGGER ALL`;
  await sql`ALTER TABLE vehicles ENABLE TRIGGER ALL`;
  await sql`ALTER TABLE documents ENABLE TRIGGER ALL`;
  
  // Recreate indexes for performance
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx ON customers(email)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS vehicles_registration_idx ON vehicles(registration)`;
  await sql`CREATE INDEX IF NOT EXISTS vehicles_owner_id_idx ON vehicles(owner_id)`;
  await sql`CREATE INDEX IF NOT EXISTS documents_customer_idx ON documents(_id_customer)`;
  
  // Update statistics
  await sql`ANALYZE customers`;
  await sql`ANALYZE vehicles`;
  await sql`ANALYZE documents`;
  
  console.log('   ✅ Database optimized');
}

async function validateImport() {
  console.log('   🔍 Running validation checks...');
  
  const issues = [];
  
  // Check customer counts
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
  if (parseInt(customerCount[0].count) < 7000) {
    issues.push(`Low customer count: ${customerCount[0].count} (expected ~7137)`);
  }
  
  // Check vehicle assignments
  const vehicleStats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(owner_id) as assigned,
      COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as unassigned
    FROM vehicles
  `;
  
  const assignedPercent = Math.round((vehicleStats[0].assigned / vehicleStats[0].total) * 100);
  console.log(`   📊 Vehicle assignments: ${assignedPercent}% assigned (${vehicleStats[0].assigned}/${vehicleStats[0].total})`);
  
  // Check for bulk assignment issues
  const bulkAssignments = await sql`
    SELECT COUNT(*) as count
    FROM (
      SELECT owner_id, COUNT(*) as vehicle_count
      FROM vehicles 
      WHERE owner_id IS NOT NULL
      GROUP BY owner_id
      HAVING COUNT(*) > 10
    ) bulk_customers
  `;
  
  if (parseInt(bulkAssignments[0].count) > 0) {
    issues.push(`${bulkAssignments[0].count} customers have >10 vehicles (potential bulk assignment)`);
  }
  
  // Check NATANIEL specifically
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
  
  if (nataniel.length === 0) {
    issues.push('NATANIEL customer not found');
  } else if (parseInt(nataniel[0].vehicle_count) !== 1 || !nataniel[0].vehicles?.includes('WK17WXV')) {
    issues.push(`NATANIEL has wrong vehicles: ${nataniel[0].vehicles} (expected: WK17WXV)`);
  }
  
  console.log(`   ✅ Validation completed: ${issues.length} issues found`);
  
  return {
    success: issues.length === 0,
    issues: issues,
    stats: {
      customers: parseInt(customerCount[0].count),
      vehicles: parseInt(vehicleStats[0].total),
      vehiclesAssigned: parseInt(vehicleStats[0].assigned),
      assignmentPercent: assignedPercent
    }
  };
}

// Export for use
module.exports = { perfectFreshImport };

// Run if called directly
if (require.main === module) {
  perfectFreshImport()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 PERFECT FRESH IMPORT COMPLETED SUCCESSFULLY!');
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
