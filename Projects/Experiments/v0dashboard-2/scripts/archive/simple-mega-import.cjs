require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 SIMPLE MEGA IMPORT');
console.log('=====================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function simpleMegaImport() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    // Simple connection test
    await sql`SELECT 1`;
    console.log('   ✅ CONNECTED!');
    console.log('');
    
    // 2. IMPORT DOCUMENTS (THE BIG ONE)
    console.log('2️⃣ IMPORTING DOCUMENTS...');
    const docFile = path.join(__dirname, 'data', 'Documents.csv');
    
    if (fs.existsSync(docFile)) {
      const fileSize = Math.round(fs.statSync(docFile).size / 1024 / 1024);
      console.log(`   📄 Processing Documents.csv (${fileSize}MB)...`);
      
      const content = fs.readFileSync(docFile, 'utf-8');
      const parsed = Papa.parse(content, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });
      
      const records = parsed.data.filter(r => r.doc_number || r._id);
      console.log(`   📋 Found ${records.length} document records`);
      console.log('   🚀 Starting mega processing...');
      
      let processed = 0;
      const batchSize = 100; // Smaller batches for reliability
      const startTime = Date.now();
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          for (const record of batch) {
            const docNumber = record.doc_number || record._id;
            const docType = record.doc_type || record.type || 'Invoice';
            const total = parseFloat(record.total_gross || record.total || 0);
            const customerId = record._id_customer || record.customer_id;
            const vehicleReg = record.vehicle_registration || record.registration;
            const docDate = record.doc_date || record.date;
            
            if (docNumber) {
              try {
                await sql`
                  INSERT INTO customer_documents (doc_number, doc_type, total_gross, _id_customer, vehicle_registration, doc_date, created_at)
                  VALUES (${docNumber}, ${docType}, ${total}, ${customerId}, ${vehicleReg}, ${docDate}, NOW())
                  ON CONFLICT (doc_number) DO UPDATE SET
                    doc_type = EXCLUDED.doc_type,
                    total_gross = EXCLUDED.total_gross,
                    _id_customer = EXCLUDED._id_customer,
                    vehicle_registration = EXCLUDED.vehicle_registration,
                    updated_at = NOW()
                `;
                processed++;
              } catch (insertError) {
                // Skip individual record errors
                console.log(`   ⚠️  Skipping record ${docNumber}:`, insertError.message.substring(0, 50));
              }
            }
          }
          
          // Progress every 1000 records
          if (processed % 1000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = Math.round(processed / elapsed);
            console.log(`   ⚡ ${processed}/${records.length} documents processed (${rate} rec/sec)`);
          }
          
        } catch (batchError) {
          console.log(`   ⚠️  Batch error at ${i}:`, batchError.message);
        }
      }
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ DOCUMENTS COMPLETE: ${processed} in ${totalTime}s`);
    } else {
      console.log('   ❌ Documents.csv not found');
    }
    console.log('');
    
    // 3. VERIFY FINAL STATE
    console.log('3️⃣ VERIFYING FINAL STATE...');
    
    try {
      const vehicleResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
      const customerResult = await sql`SELECT COUNT(*) as count FROM customers`;
      const docResult = await sql`SELECT COUNT(*) as count FROM customer_documents`;
      
      // Handle different result formats
      const vehicleCount = vehicleResult[0]?.count || vehicleResult.count || 'Unknown';
      const customerCount = customerResult[0]?.count || customerResult.count || 'Unknown';
      const docCount = docResult[0]?.count || docResult.count || 'Unknown';
      
      console.log('   🚗 Final vehicles:', vehicleCount);
      console.log('   👥 Final customers:', customerCount);
      console.log('   📄 Final documents:', docCount);
    } catch (countError) {
      console.log('   ⚠️  Count verification failed:', countError.message);
    }
    console.log('');
    
    console.log('🎉 SIMPLE MEGA IMPORT COMPLETE!');
    console.log('===============================');
    console.log('✅ IMPORT FINISHED!');
    
    // 4. SAMPLE CHECK
    console.log('');
    console.log('📋 SAMPLE DOCUMENTS:');
    try {
      const sample = await sql`
        SELECT doc_number, doc_type, total_gross 
        FROM customer_documents 
        WHERE total_gross > 0 
        LIMIT 5
      `;
      
      if (sample && sample.length > 0) {
        sample.forEach((doc, i) => {
          const docNum = doc.doc_number || doc[0];
          const docType = doc.doc_type || doc[1];
          const total = doc.total_gross || doc[2];
          console.log(`   ${i + 1}. ${docNum} - ${docType} - £${total}`);
        });
      } else {
        console.log('   No sample documents found');
      }
    } catch (sampleError) {
      console.log('   ⚠️  Sample check failed:', sampleError.message);
    }
    
  } catch (error) {
    console.log('❌ SIMPLE MEGA IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

simpleMegaImport();
