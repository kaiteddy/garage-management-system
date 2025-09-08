require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🔧 FIXED IMPORT - CORRECT COLUMNS');
console.log('==================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function fixedImport() {
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
    
    // 2. CHECK CURRENT STATE
    console.log('2️⃣ CHECKING CURRENT STATE...');
    try {
      const docResult = await sql`SELECT COUNT(*) as count FROM customer_documents`;
      const currentDocs = docResult[0]?.count || 0;
      console.log('   📄 Current documents:', currentDocs);
    } catch (e) {
      console.log('   📄 Current documents: Unknown');
    }
    console.log('');
    
    // 3. IMPORT DOCUMENTS WITH CORRECT COLUMNS
    console.log('3️⃣ IMPORTING DOCUMENTS WITH CORRECT COLUMNS...');
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
      
      // Check first record structure
      if (records.length > 0) {
        console.log('   🔍 Sample fields:', Object.keys(records[0]).slice(0, 10).join(', '));
      }
      
      console.log('   🚀 Starting corrected processing...');
      
      let processed = 0;
      let skipped = 0;
      const batchSize = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          for (const record of batch) {
            // Map to correct column names
            const documentNumber = record.doc_number || record._id;
            const documentType = record.doc_type || record.type || 'Invoice';
            const totalGross = parseFloat(record.total_gross || record.total || 0);
            const customerId = record._id_customer || record.customer_id;
            const vehicleReg = record.vehicle_registration || record.registration;
            const docDate = record.doc_date || record.date;
            
            if (documentNumber) {
              try {
                await sql`
                  INSERT INTO customer_documents (
                    document_number, document_type, total_gross, customer_id, 
                    vehicle_registration, document_date, created_at
                  )
                  VALUES (
                    ${documentNumber}, ${documentType}, ${totalGross}, ${customerId},
                    ${vehicleReg}, ${docDate}, NOW()
                  )
                  ON CONFLICT (document_number) DO UPDATE SET
                    document_type = EXCLUDED.document_type,
                    total_gross = EXCLUDED.total_gross,
                    customer_id = EXCLUDED.customer_id,
                    vehicle_registration = EXCLUDED.vehicle_registration,
                    updated_at = NOW()
                `;
                processed++;
              } catch (insertError) {
                skipped++;
                if (skipped <= 5) {
                  console.log(`   ⚠️  Skipping ${documentNumber}:`, insertError.message.substring(0, 80));
                }
              }
            } else {
              skipped++;
            }
          }
          
          // Progress every 1000 records
          if ((processed + skipped) % 1000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = Math.round((processed + skipped) / elapsed);
            console.log(`   ⚡ ${processed + skipped}/${records.length} processed (${processed} success, ${skipped} skipped) - ${rate} rec/sec`);
          }
          
        } catch (batchError) {
          console.log(`   ⚠️  Batch error at ${i}:`, batchError.message);
        }
      }
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ DOCUMENTS COMPLETE: ${processed} imported, ${skipped} skipped in ${totalTime}s`);
    } else {
      console.log('   ❌ Documents.csv not found');
    }
    console.log('');
    
    // 4. VERIFY FINAL STATE
    console.log('4️⃣ VERIFYING FINAL STATE...');
    try {
      const finalResult = await sql`SELECT COUNT(*) as count FROM customer_documents`;
      const finalDocs = finalResult[0]?.count || 0;
      console.log('   📄 Final documents:', finalDocs);
      
      // Sample check
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
    } catch (e) {
      console.log('   ⚠️  Verification failed:', e.message);
    }
    console.log('');
    
    console.log('🎉 FIXED IMPORT COMPLETE!');
    console.log('=========================');
    console.log('✅ IMPORT FINISHED WITH CORRECT COLUMNS!');
    
  } catch (error) {
    console.log('❌ FIXED IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

fixedImport();
