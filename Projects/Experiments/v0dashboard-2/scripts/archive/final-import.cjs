require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 FINAL LIGHTNING IMPORT');
console.log('=========================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function finalImport() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 15000,
      queryTimeoutMillis: 30000
    });
    
    const test = await sql`SELECT NOW() as time, version() as version`;
    console.log('   ✅ CONNECTED!');
    console.log('   📅 Time:', test[0].time);
    console.log('');
    
    // 2. CHECK BEFORE STATE
    console.log('2️⃣ CHECKING CURRENT STATE...');
    const beforeVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const beforeDocs = await sql`SELECT COUNT(*) as count FROM customer_documents`;
    console.log('   🚗 Vehicles before:', beforeVehicles[0].count);
    console.log('   📄 Documents before:', beforeDocs[0].count);
    console.log('');
    
    // 3. PROCESS FILES
    console.log('3️⃣ PROCESSING CSV FILES...');
    const dataDir = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    let totalProcessed = 0;
    const startTime = Date.now();
    
    // Process vehicles first
    const vehicleFile = files.find(f => f.toLowerCase().includes('vehicle'));
    if (vehicleFile) {
      console.log(`📄 PROCESSING: ${vehicleFile}`);
      const processed = await processVehicles(sql, path.join(dataDir, vehicleFile));
      totalProcessed += processed;
      console.log(`   ✅ ${processed} vehicles processed`);
    }
    
    // Process customers/documents
    const customerFile = files.find(f => f.toLowerCase().includes('customer'));
    if (customerFile) {
      console.log(`📄 PROCESSING: ${customerFile}`);
      const processed = await processCustomers(sql, path.join(dataDir, customerFile));
      totalProcessed += processed;
      console.log(`   ✅ ${processed} customers processed`);
    }
    
    // Process documents
    const docFile = files.find(f => f.toLowerCase().includes('document') && !f.includes('customer'));
    if (docFile) {
      console.log(`📄 PROCESSING: ${docFile}`);
      const processed = await processDocuments(sql, path.join(dataDir, docFile));
      totalProcessed += processed;
      console.log(`   ✅ ${processed} documents processed`);
    }
    
    // 4. VERIFY RESULTS
    console.log('');
    console.log('4️⃣ VERIFYING RESULTS...');
    const afterVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const afterDocs = await sql`SELECT COUNT(*) as count FROM customer_documents`;
    
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('   🚗 Vehicles after:', afterVehicles[0].count, `(+${afterVehicles[0].count - beforeVehicles[0].count})`);
    console.log('   📄 Documents after:', afterDocs[0].count, `(+${afterDocs[0].count - beforeDocs[0].count})`);
    console.log('');
    
    console.log('🎉 IMPORT COMPLETED!');
    console.log('====================');
    console.log('⏱️  Total time:', totalTime, 'minutes');
    console.log('📊 Records processed:', totalProcessed);
    console.log('🚀 Speed:', Math.round(totalProcessed / (totalTime || 1)), 'records/min');
    console.log('');
    console.log('✅ YOUR DATABASE IS NOW LOADED!');
    
  } catch (error) {
    console.log('❌ IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function processVehicles(sql, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const records = parsed.data;
  
  console.log(`   📋 Found ${records.length} vehicle records`);
  
  let processed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      for (const record of batch) {
        const reg = record.registration || record.Registration || record.reg;
        const make = record.make || record.Make || 'Unknown';
        const model = record.model || record.Model || 'Unknown';
        const year = record.year || record.Year || null;
        
        if (reg && reg.trim()) {
          await sql`
            INSERT INTO vehicles (registration, make, model, year, created_at)
            VALUES (${reg.trim().toUpperCase()}, ${make}, ${model}, ${year}, NOW())
            ON CONFLICT (registration) DO UPDATE SET
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              year = EXCLUDED.year,
              updated_at = NOW()
          `;
          processed++;
        }
      }
      
      if (processed % 500 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} vehicles processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

async function processCustomers(sql, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const records = parsed.data;
  
  console.log(`   📋 Found ${records.length} customer records`);
  
  let processed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      for (const record of batch) {
        // Try different field name variations
        const firstName = record.first_name || record.forename || record.FirstName || 'Unknown';
        const lastName = record.last_name || record.surname || record.LastName || '';
        const phone = record.phone || record.telephone || record.mobile || null;
        const email = record.email || record.Email || null;
        
        if (firstName && firstName !== 'Unknown') {
          // Insert into customers table (assuming it exists or create customer_documents entry)
          try {
            await sql`
              INSERT INTO customers (first_name, last_name, phone, email, created_at)
              VALUES (${firstName}, ${lastName}, ${phone}, ${email}, NOW())
              ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone,
                updated_at = NOW()
            `;
          } catch (e) {
            // If customers table doesn't exist, try customer_documents
            await sql`
              INSERT INTO customer_documents (first_name, last_name, phone, email, created_at)
              VALUES (${firstName}, ${lastName}, ${phone}, ${email}, NOW())
              ON CONFLICT DO NOTHING
            `;
          }
          processed++;
        }
      }
      
      if (processed % 500 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} customers processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

async function processDocuments(sql, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  const records = parsed.data;
  
  console.log(`   📋 Found ${records.length} document records`);
  
  let processed = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      for (const record of batch) {
        const docNumber = record.doc_number || record.DocNumber || record.document_number;
        const docType = record.doc_type || record.DocType || 'Unknown';
        const total = record.total_gross || record.Total || record.total || 0;
        
        if (docNumber) {
          await sql`
            INSERT INTO customer_documents (doc_number, doc_type, total_gross, created_at)
            VALUES (${docNumber}, ${docType}, ${total}, NOW())
            ON CONFLICT (doc_number) DO UPDATE SET
              doc_type = EXCLUDED.doc_type,
              total_gross = EXCLUDED.total_gross,
              updated_at = NOW()
          `;
          processed++;
        }
      }
      
      if (processed % 500 === 0) {
        console.log(`   ⚡ ${processed}/${records.length} documents processed...`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Batch error (continuing):`, error.message);
    }
  }
  
  return processed;
}

finalImport();
