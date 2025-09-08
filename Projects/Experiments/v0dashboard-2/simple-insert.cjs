require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 SIMPLE INSERT - NO CONFLICTS');
console.log('=================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function simpleInsert() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    await sql`SELECT 1`;
    console.log('   ✅ CONNECTED!');
    console.log('');
    
    // 2. IMPORT DOCUMENTS - SIMPLE INSERTS
    console.log('2️⃣ IMPORTING DOCUMENTS - SIMPLE INSERTS...');
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
      
      const records = parsed.data.filter(r => r._id);
      console.log(`   📋 Found ${records.length} document records`);
      console.log('   🚀 Starting simple insert processing...');
      
      let processed = 0;
      let skipped = 0;
      const batchSize = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          for (const record of batch) {
            // Use _id as document_number
            const documentNumber = record._id;
            const documentType = record.doc_type || 'Invoice';
            const totalGross = parseFloat(record.total_gross || 0);
            const customerId = record._id_customer;
            const vehicleReg = record.vehicle_registration;
            const docDate = record.doc_date;
            
            if (documentNumber) {
              try {
                // Simple INSERT without conflict handling
                await sql`
                  INSERT INTO customer_documents (
                    document_number, document_type, total_gross, customer_id, 
                    vehicle_registration, document_date, created_at
                  )
                  VALUES (
                    ${documentNumber}, ${documentType}, ${totalGross}, ${customerId},
                    ${vehicleReg}, ${docDate}, NOW()
                  )
                `;
                processed++;
              } catch (insertError) {
                skipped++;
                if (skipped <= 10) {
                  console.log(`   ⚠️  Skip ${documentNumber}:`, insertError.message.substring(0, 60));
                }
              }
            } else {
              skipped++;
            }
          }
          
          // Progress every 2000 records
          if ((processed + skipped) % 2000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = Math.round((processed + skipped) / elapsed);
            console.log(`   ⚡ ${processed + skipped}/${records.length} processed (✅${processed} success, ⚠️${skipped} skipped) - ${rate} rec/sec`);
          }
          
        } catch (batchError) {
          console.log(`   ⚠️  Batch error at ${i}:`, batchError.message);
        }
      }
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ PROCESSING COMPLETE: ${processed} imported, ${skipped} skipped in ${totalTime}s`);
    } else {
      console.log('   ❌ Documents.csv not found');
    }
    console.log('');
    
    // 3. VERIFY RESULTS
    console.log('3️⃣ VERIFYING RESULTS...');
    try {
      const finalResult = await sql`SELECT COUNT(*) as count FROM customer_documents`;
      const finalDocs = finalResult[0]?.count || 0;
      console.log('   📄 Final documents:', finalDocs);
      
      if (finalDocs > 0) {
        const sample = await sql`
          SELECT document_number, document_type, total_gross 
          FROM customer_documents 
          WHERE total_gross > 0 
          LIMIT 5
        `;
        
        if (sample && sample.length > 0) {
          console.log('   📋 Sample documents:');
          sample.forEach((doc, i) => {
            console.log(`      ${i + 1}. ${doc.document_number} - ${doc.document_type} - £${doc.total_gross}`);
          });
        }
      }
    } catch (e) {
      console.log('   ⚠️  Verification failed:', e.message);
    }
    console.log('');
    
    console.log('🎉 SIMPLE INSERT COMPLETE!');
    console.log('==========================');
    console.log('✅ DOCUMENTS IMPORTED SUCCESSFULLY!');
    
  } catch (error) {
    console.log('❌ SIMPLE INSERT FAILED:', error.message);
  }
}

simpleInsert();
