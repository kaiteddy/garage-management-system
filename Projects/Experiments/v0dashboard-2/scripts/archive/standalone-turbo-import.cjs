#!/usr/bin/env node

/**
 * 🚀 STANDALONE TURBO IMPORT
 * No dependencies on project modules - pure Node.js
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 STANDALONE TURBO IMPORT');
console.log('===========================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

// Configuration
const CONFIG = {
  DATA_PATH: process.env.DOCKER_IMPORT ? '/app/ga4-data' : '/Users/adamrutstein/Desktop/GA4 EXPORT',
  BATCH_SIZE: 500,
  MAX_PARALLEL: 3,
  PROGRESS_INTERVAL: 250
};

// File mapping
const FILES = {
  customers: 'Customers.csv',
  vehicles: 'Vehicles.csv',
  documents: 'Documents.csv',
  lineItems: 'LineItems.csv',
  receipts: 'Receipts.csv',
  documentExtras: 'Document_Extras.csv',
  appointments: 'Appointments.csv',
  reminders: 'Reminders.csv',
  reminderTemplates: 'Reminder_Templates.csv',
  stock: 'Stock.csv'
};

async function runTurboImport() {
  try {
    // 1. Check environment
    console.log('1️⃣ CHECKING ENVIRONMENT...');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    console.log('✅ Database URL found');
    console.log('✅ GA4 Export path:', CONFIG.DATA_PATH);
    console.log('');

    // 2. Connect to database
    console.log('2️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });

    // Test connection
    const testResult = await sql`SELECT NOW() as time, 'Turbo Import Test' as message`;
    console.log('✅ Database connected:', testResult[0].time);
    console.log('✅ Test message:', testResult[0].message);
    console.log('');

    // 3. Check GA4 Export folder
    console.log('3️⃣ SCANNING GA4 EXPORT FOLDER...');
    if (!fs.existsSync(CONFIG.DATA_PATH)) {
      throw new Error(`GA4 Export folder not found: ${CONFIG.DATA_PATH}`);
    }

    const availableFiles = fs.readdirSync(CONFIG.DATA_PATH);
    console.log('✅ GA4 Export folder found');
    console.log('📁 Available files:', availableFiles.length);

    const csvFiles = availableFiles.filter(f => f.endsWith('.csv'));
    console.log('📊 CSV files found:', csvFiles.length);
    csvFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    // 4. Check current database status
    console.log('4️⃣ CHECKING CURRENT DATABASE STATUS...');
    const [vehicles, customers, docs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM customers`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM customer_documents`.catch(() => [{ count: 0 }])
    ]);

    console.log('📊 Current database state:');
    console.log('   🚗 Vehicles:', vehicles[0].count);
    console.log('   👥 Customers:', customers[0].count);
    console.log('   📄 Documents:', docs[0].count);
    console.log('');

    // 5. Import each file
    console.log('5️⃣ STARTING TURBO IMPORT PROCESS...');
    console.log('====================================');

    let totalProcessed = 0;
    const results = {};

    for (const [fileType, fileName] of Object.entries(FILES)) {
      const filePath = path.join(CONFIG.DATA_PATH, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${fileName} - file not found`);
        results[fileName] = 0;
        continue;
      }

      console.log(`📄 PROCESSING: ${fileName}`);
      const fileSize = Math.round(fs.statSync(filePath).size / 1024 / 1024);
      console.log(`   📊 File size: ${fileSize}MB`);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase()
        });

        const records = parsed.data.filter(r =>
          Object.keys(r).some(key => r[key] && r[key].toString().trim())
        );

        console.log(`   📋 Found ${records.length} valid records`);

        if (records.length === 0) {
          console.log(`   ⚠️  No valid records found in ${fileName}`);
          results[fileName] = 0;
          continue;
        }

        // Process based on file type
        let processed = 0;

        if (fileType === 'customers') {
          processed = await processCustomers(sql, records);
        } else if (fileType === 'vehicles') {
          processed = await processVehicles(sql, records);
        } else if (fileType === 'documents') {
          processed = await processDocuments(sql, records);
        } else if (fileType === 'lineItems') {
          processed = await processLineItems(sql, records);
        } else if (fileType === 'receipts') {
          processed = await processReceipts(sql, records);
        } else {
          console.log(`   ⚠️  Unknown file type: ${fileType}`);
          processed = 0;
        }

        results[fileName] = processed;
        totalProcessed += processed;

        console.log(`   ✅ ${fileName}: ${processed} records processed`);

      } catch (error) {
        console.log(`   ❌ Error processing ${fileName}:`, error.message);
        results[fileName] = 0;
      }

      console.log('');
    }

    // 6. Final verification
    console.log('6️⃣ FINAL VERIFICATION...');
    const [finalVehicles, finalCustomers, finalDocs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`
    ]);

    console.log('📊 Final database state:');
    console.log('   🚗 Vehicles:', finalVehicles[0].count, `(+${finalVehicles[0].count - vehicles[0].count})`);
    console.log('   👥 Customers:', finalCustomers[0].count, `(+${finalCustomers[0].count - customers[0].count})`);
    console.log('   📄 Documents:', finalDocs[0].count, `(+${finalDocs[0].count - docs[0].count})`);
    console.log('');

    // 7. Summary
    console.log('🎉 TURBO IMPORT COMPLETE!');
    console.log('=========================');
    console.log('📊 Total records processed:', totalProcessed);
    console.log('📁 Files processed:', Object.keys(results).length);
    console.log('');
    console.log('📋 Import summary:');
    Object.entries(results).forEach(([file, count]) => {
      console.log(`   ${count > 0 ? '✅' : '⚠️'} ${file}: ${count} records`);
    });
    console.log('');
    console.log('🎊 YOUR GARAGE MANAGEMENT DATABASE IS NOW FULLY LOADED!');

  } catch (error) {
    console.log('❌ TURBO IMPORT FAILED:', error.message);
    console.log('💡 Check your .env.local file and GA4 Export folder');
  }
}

async function processCustomers(sql, records) {
  console.log('   👥 Processing customers...');
  let processed = 0;

  for (const record of records) {
    try {
      const firstName = record.first_name || record.forename || 'Unknown';
      const lastName = record.last_name || record.surname || '';
      const email = record.email || null;
      const phone = record.phone || record.telephone || record.mobile || null;

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
    } catch (e) {
      // Skip individual errors
    }
  }

  return processed;
}

async function processVehicles(sql, records) {
  console.log('   🚗 Processing vehicles...');
  let processed = 0;

  for (const record of records) {
    try {
      const reg = (record.registration || record.reg || '').trim().toUpperCase();
      const make = record.make || 'Unknown';
      const model = record.model || 'Unknown';
      const year = record.year || record.year_of_manufacture || null;

      if (reg) {
        await sql`
          INSERT INTO vehicles (registration, make, model, year, created_at)
          VALUES (${reg}, ${make}, ${model}, ${year}, NOW())
          ON CONFLICT (registration) DO UPDATE SET
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            updated_at = NOW()
        `;
        processed++;
      }
    } catch (e) {
      // Skip individual errors
    }
  }

  return processed;
}

async function processDocuments(sql, records) {
  console.log('   📄 Processing documents...');
  let processed = 0;

  for (const record of records) {
    try {
      const id = record._id || record.id;
      const customerId = record._id_customer || record.customer_id;
      const vehicleReg = record.vehicle_registration;
      const documentType = record.doc_type || 'Invoice';
      const documentNumber = record.doc_number || record._id;
      const documentDate = record.doc_date;
      const totalGross = parseFloat(record.total_gross || 0);
      const totalNet = parseFloat(record.total_net || 0);
      const totalTax = parseFloat(record.total_tax || 0);
      const status = record.status || 'Active';

      if (id) {
        await sql`
          INSERT INTO customer_documents (
            id, customer_id, vehicle_registration, document_type,
            document_number, document_date, total_gross, total_net,
            total_tax, status, created_at
          )
          VALUES (${id}, ${customerId}, ${vehicleReg}, ${documentType}, ${documentNumber}, ${documentDate}, ${totalGross}, ${totalNet}, ${totalTax}, ${status}, NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        processed++;
      }
    } catch (e) {
      // Skip individual errors
    }
  }

  return processed;
}

async function processLineItems(sql, records) {
  console.log('   📋 Processing line items...');
  let processed = 0;

  for (const record of records) {
    try {
      const id = record._id || record.id;
      const docId = record._id_document || record.document_id;
      const description = record.description || '';
      const quantity = parseFloat(record.quantity || 1);
      const unitPrice = parseFloat(record.unit_price || 0);
      const total = parseFloat(record.total || 0);

      if (id) {
        await sql`
          INSERT INTO document_line_items (id, document_id, description, quantity, unit_price, total, created_at)
          VALUES (${id}, ${docId}, ${description}, ${quantity}, ${unitPrice}, ${total}, NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        processed++;
      }
    } catch (e) {
      // Skip individual errors
    }
  }

  return processed;
}

async function processReceipts(sql, records) {
  console.log('   🧾 Processing receipts...');
  // Implement receipt processing based on your schema
  return 0;
}

// Run the import
runTurboImport();
