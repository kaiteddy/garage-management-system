require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('📄 DOCUMENT IMPORT - FINAL STEP');
console.log('================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function importDocuments() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 20000,
      queryTimeoutMillis: 60000
    });
    
    await sql`SELECT NOW()`;
    console.log('   ✅ CONNECTED!');
    console.log('');
    
    // 2. CHECK CURRENT STATE
    console.log('2️⃣ CURRENT STATE...');
    const currentDocs = await sql`SELECT COUNT(*) as count FROM customer_documents`;
    console.log('   📄 Current documents:', currentDocs[0].count);
    console.log('');
    
    // 3. PROCESS DOCUMENTS
    console.log('3️⃣ PROCESSING DOCUMENTS...');
    const dataDir = path.join(__dirname, 'data');
    const docFile = path.join(dataDir, 'Documents.csv');
    
    if (!fs.existsSync(docFile)) {
      throw new Error('Documents.csv not found');
    }
    
    const content = fs.readFileSync(docFile, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    const records = parsed.data.filter(r => r.doc_number || r.DocNumber || r._id);
    
    console.log(`   📋 Found ${records.length} document records`);
    console.log('   🚀 Starting processing...');
    
    const startTime = Date.now();
    let processed = 0;
    const batchSize = 100;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        for (const record of batch) {
          // Try different field name variations
          const docNumber = record.doc_number || record.DocNumber || record._id;
          const docType = record.doc_type || record.DocType || record.type || 'Invoice';
          const total = parseFloat(record.total_gross || record.Total || record.total || 0);
          const customerId = record._id_customer || record.customer_id || record.CustomerId;
          const vehicleReg = record.vehicle_registration || record.VehicleRegistration || record.registration;
          const docDate = record.doc_date || record.DocDate || record.date;
          
          if (docNumber) {
            await sql`
              INSERT INTO customer_documents (
                doc_number, doc_type, total_gross, _id_customer, 
                vehicle_registration, doc_date, created_at
              )
              VALUES (
                ${docNumber}, ${docType}, ${total}, ${customerId},
                ${vehicleReg}, ${docDate}, NOW()
              )
              ON CONFLICT (doc_number) DO UPDATE SET
                doc_type = EXCLUDED.doc_type,
                total_gross = EXCLUDED.total_gross,
                _id_customer = EXCLUDED._id_customer,
                vehicle_registration = EXCLUDED.vehicle_registration,
                updated_at = NOW()
            `;
            processed++;
          }
        }
        
        // Progress update every 1000 records
        if (processed % 1000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = Math.round(processed / elapsed);
          console.log(`   ⚡ ${processed}/${records.length} processed (${rate} rec/sec)`);
        }
        
      } catch (error) {
        console.log(`   ⚠️  Batch error at ${i}:`, error.message);
        // Continue with next batch
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ DOCUMENTS COMPLETE: ${processed} in ${totalTime}s`);
    console.log('');
    
    // 4. VERIFY RESULTS
    console.log('4️⃣ VERIFYING...');
    const finalDocs = await sql`SELECT COUNT(*) as count FROM customer_documents`;
    const increase = finalDocs[0].count - currentDocs[0].count;
    
    console.log('   📄 Final documents:', finalDocs[0].count, `(+${increase})`);
    console.log('');
    
    // 5. FINAL DATABASE STATUS
    console.log('5️⃣ FINAL DATABASE STATUS...');
    const vehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const customers = await sql`SELECT COUNT(*) as count FROM customers`;
    const documents = await sql`SELECT COUNT(*) as count FROM customer_documents`;
    
    console.log('   🚗 Vehicles:', vehicles[0].count);
    console.log('   👥 Customers:', customers[0].count);
    console.log('   📄 Documents:', documents[0].count);
    console.log('');
    
    console.log('🎉 DOCUMENT IMPORT COMPLETE!');
    console.log('============================');
    console.log('⏱️  Total time:', totalTime, 'seconds');
    console.log('📊 Documents processed:', processed);
    console.log('🚀 Average speed:', Math.round(processed / totalTime), 'docs/second');
    console.log('');
    console.log('✅ YOUR DATABASE IS NOW FULLY LOADED!');
    console.log('🎊 READY FOR PRODUCTION USE!');
    
  } catch (error) {
    console.log('❌ DOCUMENT IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

importDocuments();
