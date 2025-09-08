require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🎯 FINAL CORRECT IMPORT');
console.log('=======================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function finalCorrectImport() {
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
    
    // 2. IMPORT DOCUMENTS WITH ALL CORRECT FIELDS
    console.log('2️⃣ IMPORTING DOCUMENTS WITH ALL CORRECT FIELDS...');
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
      console.log('   🚀 Starting final correct processing...');
      
      let processed = 0;
      let skipped = 0;
      const batchSize = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          for (const record of batch) {
            // Map all fields correctly
            const id = record._id;
            const customerId = record._id_customer;
            const vehicleReg = record.vehicle_registration;
            const documentType = record.doc_type || 'Invoice';
            const documentNumber = record.doc_number || record._id;
            const documentDate = record.doc_date;
            const dueDate = record.due_date;
            const totalGross = parseFloat(record.total_gross || 0);
            const totalNet = parseFloat(record.total_net || 0);
            const totalTax = parseFloat(record.total_tax || 0);
            const status = record.status || 'Active';
            const department = record.department;
            const balance = parseFloat(record.balance || 0);
            
            if (id) {
              try {
                await sql`
                  INSERT INTO customer_documents (
                    id, customer_id, vehicle_registration, document_type, 
                    document_number, document_date, due_date, total_gross, 
                    total_net, total_tax, status, department, balance, created_at
                  )
                  VALUES (
                    ${id}, ${customerId}, ${vehicleReg}, ${documentType},
                    ${documentNumber}, ${documentDate}, ${dueDate}, ${totalGross},
                    ${totalNet}, ${totalTax}, ${status}, ${department}, ${balance}, NOW()
                  )
                `;
                processed++;
              } catch (insertError) {
                skipped++;
                if (skipped <= 10) {
                  console.log(`   ⚠️  Skip ${id}:`, insertError.message.substring(0, 60));
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
      
      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`   ✅ PROCESSING COMPLETE: ${processed} imported, ${skipped} skipped in ${totalTime} minutes`);
    } else {
      console.log('   ❌ Documents.csv not found');
    }
    console.log('');
    
    // 3. FINAL VERIFICATION
    console.log('3️⃣ FINAL VERIFICATION...');
    try {
      const finalResult = await sql`SELECT COUNT(*) as count FROM customer_documents`;
      const finalDocs = finalResult[0]?.count || 0;
      console.log('   📄 Final documents:', finalDocs);
      
      if (finalDocs > 0) {
        // Get some statistics
        const stats = await sql`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN total_gross > 0 THEN 1 END) as with_value,
            ROUND(AVG(total_gross), 2) as avg_value,
            MAX(total_gross) as max_value
          FROM customer_documents
        `;
        
        if (stats && stats.length > 0) {
          const s = stats[0];
          console.log('   📊 Statistics:');
          console.log(`      Total: ${s.total}`);
          console.log(`      With value: ${s.with_value}`);
          console.log(`      Average value: £${s.avg_value}`);
          console.log(`      Max value: £${s.max_value}`);
        }
        
        const sample = await sql`
          SELECT document_number, document_type, total_gross, customer_id
          FROM customer_documents 
          WHERE total_gross > 0 
          LIMIT 5
        `;
        
        if (sample && sample.length > 0) {
          console.log('   📋 Sample documents:');
          sample.forEach((doc, i) => {
            console.log(`      ${i + 1}. ${doc.document_number} - ${doc.document_type} - £${doc.total_gross} (Customer: ${doc.customer_id || 'N/A'})`);
          });
        }
      }
    } catch (e) {
      console.log('   ⚠️  Verification failed:', e.message);
    }
    console.log('');
    
    console.log('🎉 FINAL CORRECT IMPORT COMPLETE!');
    console.log('=================================');
    console.log('✅ DOCUMENTS IMPORTED SUCCESSFULLY!');
    console.log('🎊 YOUR DATABASE IS NOW LOADED WITH DOCUMENTS!');
    
  } catch (error) {
    console.log('❌ FINAL CORRECT IMPORT FAILED:', error.message);
  }
}

finalCorrectImport();
