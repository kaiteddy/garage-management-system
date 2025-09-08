require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('⚡ BULK IMPORT - NO MORE FREEZING');
console.log('=================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function bulkImport() {
  try {
    // 1. CONNECT
    console.log('1️⃣ CONNECTING...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 60000,
      queryTimeoutMillis: 300000  // 5 minutes per query
    });
    
    await sql`SELECT 1`;
    console.log('   ✅ CONNECTED!');
    console.log('');
    
    // 2. CHECK CURRENT STATE
    console.log('2️⃣ CHECKING CURRENT STATE...');
    const currentDocs = await sql`SELECT COUNT(*) FROM customer_documents`;
    console.log('   📄 Current documents:', currentDocs[0].count);
    console.log('');
    
    // 3. BULK IMPORT WITH MASSIVE BATCHES
    console.log('3️⃣ BULK IMPORT WITH MASSIVE BATCHES...');
    const docFile = path.join(__dirname, 'data', 'Documents.csv');
    
    if (fs.existsSync(docFile)) {
      console.log('   📄 Processing Documents.csv...');
      
      const content = fs.readFileSync(docFile, 'utf-8');
      const parsed = Papa.parse(content, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });
      
      const records = parsed.data.filter(r => r._id);
      console.log(`   📋 Found ${records.length} document records`);
      console.log('   🚀 Starting BULK processing with 1000-record batches...');
      
      let processed = 0;
      let skipped = 0;
      const batchSize = 1000; // MASSIVE BATCHES
      const startTime = Date.now();
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        console.log(`   ⚡ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} records)...`);
        
        try {
          // Build MASSIVE bulk insert
          const values = [];
          const params = [];
          let paramIndex = 1;
          
          for (const record of batch) {
            const id = record._id;
            const customerId = record._id_customer;
            const vehicleReg = record.vehicle_registration;
            const documentType = record.doc_type || 'Invoice';
            const documentNumber = record.doc_number || record._id;
            const documentDate = record.doc_date;
            const totalGross = parseFloat(record.total_gross || 0);
            const totalNet = parseFloat(record.total_net || 0);
            const totalTax = parseFloat(record.total_tax || 0);
            const status = record.status || 'Active';
            
            if (id) {
              values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, NOW())`);
              params.push(id, customerId, vehicleReg, documentType, documentNumber, documentDate, totalGross, totalNet, totalTax, status);
              paramIndex += 10;
            }
          }
          
          if (values.length > 0) {
            const query = `
              INSERT INTO customer_documents (
                id, customer_id, vehicle_registration, document_type, 
                document_number, document_date, total_gross, total_net, 
                total_tax, status, created_at
              )
              VALUES ${values.join(', ')}
              ON CONFLICT (id) DO NOTHING
            `;
            
            const batchStart = Date.now();
            await sql.unsafe(query, params);
            const batchTime = ((Date.now() - batchStart) / 1000).toFixed(1);
            
            processed += values.length;
            console.log(`   ✅ Batch complete: ${values.length} records in ${batchTime}s`);
          }
          
        } catch (batchError) {
          console.log(`   ⚠️  Batch ${Math.floor(i/batchSize) + 1} error:`, batchError.message.substring(0, 100));
          skipped += batch.length;
        }
        
        // Show progress
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const rate = Math.round((processed + skipped) / (elapsed || 1));
        console.log(`   📊 Progress: ${processed + skipped}/${records.length} (${processed} success, ${skipped} skipped) - ${rate} rec/min - ${elapsed}min elapsed`);
        console.log('');
      }
      
      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`   ✅ BULK PROCESSING COMPLETE: ${processed} imported, ${skipped} skipped in ${totalTime} minutes`);
    }
    console.log('');
    
    // 4. FINAL VERIFICATION
    console.log('4️⃣ FINAL VERIFICATION...');
    const finalDocs = await sql`SELECT COUNT(*) FROM customer_documents`;
    const increase = finalDocs[0].count - currentDocs[0].count;
    
    console.log('   📄 Final documents:', finalDocs[0].count, `(+${increase})`);
    console.log('');
    
    console.log('🎉 BULK IMPORT COMPLETE!');
    console.log('========================');
    console.log('✅ NO MORE FREEZING - BULK IMPORT SUCCESSFUL!');
    
  } catch (error) {
    console.log('❌ BULK IMPORT FAILED:', error.message);
  }
}

bulkImport();
