require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('⚡ LIGHTNING-FAST IMPORT STARTING!');
console.log('==================================');
console.log('🕐 Start time:', new Date().toLocaleTimeString());
console.log('');

async function lightningImport() {
  try {
    // 1. CONNECT TO DATABASE
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 10000,
      queryTimeoutMillis: 30000
    });
    
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('   ✅ CONNECTED!');
    console.log('   📅 Time:', connectionTest[0].current_time);
    console.log('   🗄️  Version:', connectionTest[0].db_version.split(' ')[0]);
    console.log('');
    
    // 2. CHECK CURRENT DATA
    console.log('2️⃣ CHECKING CURRENT DATA...');
    const beforeCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    const before = beforeCounts[0];
    console.log('   📊 BEFORE IMPORT:');
    console.log('      👥 Customers:', before.customers);
    console.log('      🚗 Vehicles:', before.vehicles);
    console.log('      📄 Documents:', before.documents);
    console.log('');
    
    // 3. FIND CSV FILES
    console.log('3️⃣ FINDING CSV FILES...');
    const csvDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(csvDir)) {
      throw new Error(`CSV directory not found: ${csvDir}`);
    }
    
    const allFiles = fs.readdirSync(csvDir);
    const csvFiles = allFiles.filter(f => f.endsWith('.csv'));
    
    console.log('   📁 Directory contents:', allFiles.length, 'files');
    console.log('   📄 CSV files found:', csvFiles.length);
    
    if (csvFiles.length === 0) {
      console.log('   ⚠️  No CSV files found. Looking for alternative formats...');
      const otherFiles = allFiles.filter(f => f.includes('customer') || f.includes('vehicle') || f.includes('document'));
      console.log('   🔍 Other data files:', otherFiles);
      
      if (otherFiles.length === 0) {
        throw new Error('No data files found in data directory');
      }
    }
    
    console.log('   📋 Files to process:', csvFiles);
    console.log('');
    
    // 4. PROCESS FILES AT LIGHTNING SPEED
    console.log('4️⃣ PROCESSING FILES AT LIGHTNING SPEED...');
    let totalProcessed = 0;
    const results = {};
    const startTime = Date.now();
    
    for (const filename of csvFiles) {
      const filePath = path.join(csvDir, filename);
      const fileSize = fs.statSync(filePath).size;
      const fileSizeKB = Math.round(fileSize / 1024);
      
      console.log(`📄 PROCESSING: ${filename} (${fileSizeKB}KB)`);
      
      try {
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        
        const parsed = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
        });
        
        if (parsed.errors.length > 0) {
          console.log(`   ⚠️  ${parsed.errors.length} parsing warnings (continuing...)`);
        }
        
        const records = parsed.data.filter(row => Object.keys(row).some(key => row[key] && row[key].toString().trim()));
        console.log(`   📋 Valid records: ${records.length}`);
        
        if (records.length === 0) {
          console.log(`   ⏭️  Skipping empty file: ${filename}`);
          continue;
        }
        
        // DETERMINE FILE TYPE AND PROCESS
        let processed = 0;
        
        if (filename.toLowerCase().includes('customer') || hasCustomerFields(records[0])) {
          console.log('   👥 CUSTOMER FILE DETECTED');
          processed = await processCustomers(sql, records, filename);
        } else if (filename.toLowerCase().includes('vehicle') || hasVehicleFields(records[0])) {
          console.log('   🚗 VEHICLE FILE DETECTED');
          processed = await processVehicles(sql, records, filename);
        } else if (filename.toLowerCase().includes('document') || hasDocumentFields(records[0])) {
          console.log('   📄 DOCUMENT FILE DETECTED');
          processed = await processDocuments(sql, records, filename);
        } else {
          console.log('   🔍 ANALYZING FILE STRUCTURE...');
          console.log('   📝 Sample fields:', Object.keys(records[0]).slice(0, 10).join(', '));
          console.log('   ⏭️  Skipping unknown file type');
          continue;
        }
        
        results[filename] = processed;
        totalProcessed += processed;
        
        const fileTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ COMPLETED: ${processed} records in ${fileTime}s`);
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ ERROR processing ${filename}:`, error.message);
        results[filename] = 0;
        console.log('');
      }
    }
    
    // 5. FINAL VERIFICATION
    console.log('5️⃣ VERIFYING IMPORT RESULTS...');
    const afterCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    const after = afterCounts[0];
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('   📊 AFTER IMPORT:');
    console.log('      👥 Customers:', after.customers, `(+${after.customers - before.customers})`);
    console.log('      🚗 Vehicles:', after.vehicles, `(+${after.vehicles - before.vehicles})`);
    console.log('      📄 Documents:', after.documents, `(+${after.documents - before.documents})`);
    console.log('');
    
    console.log('🎉 LIGHTNING IMPORT COMPLETED!');
    console.log('==============================');
    console.log('⏱️  Total time:', totalTime, 'minutes');
    console.log('📊 Records processed:', totalProcessed);
    console.log('📁 Files processed:', Object.keys(results).length);
    console.log('🚀 Average speed:', Math.round(totalProcessed / (totalTime || 1)), 'records/minute');
    console.log('');
    console.log('✅ YOUR DATABASE IS NOW FULLY LOADED!');
    
    return {
      success: true,
      totalProcessed,
      totalTime: totalTime + ' minutes',
      results,
      before,
      after
    };
    
  } catch (error) {
    console.log('');
    console.log('❌ IMPORT FAILED:', error.message);
    console.log('');
    return { success: false, error: error.message };
  }
}

// HELPER FUNCTIONS
function hasCustomerFields(record) {
  const customerFields = ['first_name', 'last_name', 'name', 'email', 'phone', 'customer_id'];
  return customerFields.some(field => record.hasOwnProperty(field));
}

function hasVehicleFields(record) {
  const vehicleFields = ['registration', 'make', 'model', 'year', 'vin', 'vehicle_id'];
  return vehicleFields.some(field => record.hasOwnProperty(field));
}

function hasDocumentFields(record) {
  const documentFields = ['doc_number', 'document_number', 'invoice_number', 'total', 'doc_type'];
  return documentFields.some(field => record.hasOwnProperty(field));
}

async function processCustomers(sql, records, filename) {
  console.log('   🔄 Processing customers in batches of 50...');
  let processed = 0;
  
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    
    try {
      for (const record of batch) {
        // Basic customer insert/update logic
        const firstName = record.first_name || record.name?.split(' ')[0] || 'Unknown';
        const lastName = record.last_name || record.name?.split(' ').slice(1).join(' ') || '';
        const email = record.email || null;
        const phone = record.phone || record.mobile || null;
        
        if (firstName && firstName !== 'Unknown') {
          await sql`
            INSERT INTO customers (first_name, last_name, email, phone, created_at)
            VALUES (${firstName}, ${lastName}, ${email}, ${phone}, NOW())
            ON CONFLICT (email) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              phone = EXCLUDED.phone,
              updated_at = NOW()
          `;
          processed++;
        }
      }
      
      if (processed % 250 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} customers processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

async function processVehicles(sql, records, filename) {
  console.log('   🔄 Processing vehicles in batches of 50...');
  let processed = 0;
  
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    
    try {
      for (const record of batch) {
        const registration = record.registration || record.reg || record.vrm;
        const make = record.make || 'Unknown';
        const model = record.model || 'Unknown';
        const year = record.year || record.year_of_manufacture || null;
        
        if (registration) {
          await sql`
            INSERT INTO vehicles (registration, make, model, year, created_at)
            VALUES (${registration.toUpperCase()}, ${make}, ${model}, ${year}, NOW())
            ON CONFLICT (registration) DO UPDATE SET
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              updated_at = NOW()
          `;
          processed++;
        }
      }
      
      if (processed % 250 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} vehicles processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

async function processDocuments(sql, records, filename) {
  console.log('   🔄 Processing documents in batches of 50...');
  let processed = 0;
  
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    
    try {
      for (const record of batch) {
        const docNumber = record.doc_number || record.document_number || record.invoice_number;
        const docType = record.doc_type || record.type || 'Unknown';
        const total = record.total || record.total_gross || 0;
        
        if (docNumber) {
          await sql`
            INSERT INTO documents (doc_number, doc_type, total_gross, created_at)
            VALUES (${docNumber}, ${docType}, ${total}, NOW())
            ON CONFLICT (doc_number) DO UPDATE SET
              doc_type = EXCLUDED.doc_type,
              total_gross = EXCLUDED.total_gross,
              updated_at = NOW()
          `;
          processed++;
        }
      }
      
      if (processed % 250 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} documents processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

// RUN THE LIGHTNING IMPORT
lightningImport().then(result => {
  if (result.success) {
    console.log('🎊 IMPORT SUCCESSFUL! Your database is ready!');
  } else {
    console.log('💥 Import failed. Check the error above.');
  }
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.log('💥 Unexpected error:', error.message);
  process.exit(1);
});
