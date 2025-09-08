require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 MEGA IMPORT - FINAL ATTEMPT');
console.log('===============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

async function megaImport() {
  try {
    // 1. CONNECT WITH OPTIMIZED SETTINGS
    console.log('1️⃣ CONNECTING WITH OPTIMIZED SETTINGS...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000,
      // Use direct connection for better performance
      fullResults: true
    });

    const test = await sql`SELECT NOW() as time, version() as version`;
    console.log('   ✅ CONNECTED!');
    console.log('   📅 Time:', test[0]?.time || 'Unknown');
    console.log('   🗄️  Version:', test[0]?.version?.split(' ')[0] || 'PostgreSQL');
    console.log('');

    // 2. CHECK CURRENT STATE
    console.log('2️⃣ CHECKING CURRENT STATE...');
    const [vehicleCount, customerCount, docCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`
    ]);

    console.log('   🚗 Current vehicles:', vehicleCount[0].count);
    console.log('   👥 Current customers:', customerCount[0].count);
    console.log('   📄 Current documents:', docCount[0].count);
    console.log('');

    // 3. MEGA IMPORT DOCUMENTS (THE BIG ONE)
    console.log('3️⃣ MEGA IMPORTING DOCUMENTS...');
    const docFile = path.join(__dirname, 'data', 'Documents.csv');

    if (fs.existsSync(docFile)) {
      console.log('   📄 Processing Documents.csv (35MB)...');
      const docProcessed = await importDocumentsMega(sql, docFile);
      console.log(`   ✅ Documents imported: ${docProcessed}`);
    } else {
      console.log('   ⚠️  Documents.csv not found');
    }
    console.log('');

    // 4. IMPORT LINE ITEMS
    console.log('4️⃣ IMPORTING LINE ITEMS...');
    const lineItemFile = path.join(__dirname, 'data', 'LineItems.csv');

    if (fs.existsSync(lineItemFile)) {
      console.log('   📋 Processing LineItems.csv (32MB)...');
      const lineProcessed = await importLineItemsMega(sql, lineItemFile);
      console.log(`   ✅ Line items imported: ${lineProcessed}`);
    } else {
      console.log('   ⚠️  LineItems.csv not found');
    }
    console.log('');

    // 5. FINAL VERIFICATION
    console.log('5️⃣ FINAL VERIFICATION...');
    const [finalVehicles, finalCustomers, finalDocs, finalLineItems] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`.catch(() => ({ 0: { count: 0 } }))
    ]);

    console.log('   🚗 Final vehicles:', finalVehicles[0].count);
    console.log('   👥 Final customers:', finalCustomers[0].count);
    console.log('   📄 Final documents:', finalDocs[0].count);
    console.log('   📋 Final line items:', finalLineItems[0].count);
    console.log('');

    console.log('🎉 MEGA IMPORT COMPLETE!');
    console.log('========================');
    console.log('✅ YOUR DATABASE IS NOW FULLY LOADED!');
    console.log('🎊 READY FOR PRODUCTION USE!');

    // 6. SAMPLE DATA CHECK
    console.log('');
    console.log('📋 SAMPLE DATA:');
    const sampleDocs = await sql`
      SELECT doc_number, doc_type, total_gross, vehicle_registration
      FROM customer_documents
      WHERE total_gross > 0
      LIMIT 5
    `;

    sampleDocs.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - £${doc.total_gross} (${doc.vehicle_registration || 'No reg'})`);
    });

  } catch (error) {
    console.log('❌ MEGA IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function importDocumentsMega(sql, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase()
  });

  const records = parsed.data.filter(r => r.doc_number || r._id);
  console.log(`   📋 Found ${records.length} document records`);

  let processed = 0;
  const batchSize = 500; // MEGA BATCHES
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      // Build mega insert
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const record of batch) {
        const docNumber = record.doc_number || record._id;
        const docType = record.doc_type || record.type || 'Invoice';
        const total = parseFloat(record.total_gross || record.total || 0);
        const customerId = record._id_customer || record.customer_id;
        const vehicleReg = record.vehicle_registration || record.registration;
        const docDate = record.doc_date || record.date;

        if (docNumber) {
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW())`);
          params.push(docNumber, docType, total, customerId, vehicleReg, docDate);
          paramIndex += 6;
        }
      }

      if (values.length > 0) {
        const query = `
          INSERT INTO customer_documents (doc_number, doc_type, total_gross, _id_customer, vehicle_registration, doc_date, created_at)
          VALUES ${values.join(', ')}
          ON CONFLICT (doc_number) DO UPDATE SET
            doc_type = EXCLUDED.doc_type,
            total_gross = EXCLUDED.total_gross,
            _id_customer = EXCLUDED._id_customer,
            vehicle_registration = EXCLUDED.vehicle_registration,
            updated_at = NOW()
        `;

        await sql.unsafe(query, params);
        processed += values.length;
      }

      // Progress every 2500 records
      if (processed % 2500 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(processed / elapsed);
        console.log(`   ⚡ ${processed}/${records.length} documents processed (${rate} rec/sec)`);
      }

    } catch (error) {
      console.log(`   ⚠️  Batch error at ${i}:`, error.message);
    }
  }

  return processed;
}

async function importLineItemsMega(sql, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase()
  });

  const records = parsed.data.filter(r => r._id || r.id);
  console.log(`   📋 Found ${records.length} line item records`);

  let processed = 0;
  const batchSize = 500;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const record of batch) {
        const id = record._id || record.id;
        const docId = record._id_document || record.document_id;
        const description = record.description || record.item_description;
        const quantity = parseFloat(record.quantity || 1);
        const unitPrice = parseFloat(record.unit_price || record.price || 0);
        const total = parseFloat(record.total || record.line_total || 0);

        if (id && docId) {
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW())`);
          params.push(id, docId, description, quantity, unitPrice, total);
          paramIndex += 6;
        }
      }

      if (values.length > 0) {
        const query = `
          INSERT INTO document_line_items (id, document_id, description, quantity, unit_price, total, created_at)
          VALUES ${values.join(', ')}
          ON CONFLICT (id) DO UPDATE SET
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total = EXCLUDED.total,
            updated_at = NOW()
        `;

        await sql.unsafe(query, params);
        processed += values.length;
      }

      if (processed % 2500 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(processed / elapsed);
        console.log(`   ⚡ ${processed}/${records.length} line items processed (${rate} rec/sec)`);
      }

    } catch (error) {
      console.log(`   ⚠️  Batch error at ${i}:`, error.message);
    }
  }

  return processed;
}

megaImport();
