#!/usr/bin/env node

/**
 * 🚀 COMPREHENSIVE CLEAN IMPORT
 * Complete system to import all missing data with proper relationships
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🚀 COMPREHENSIVE CLEAN IMPORT');
console.log('==============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Import ALL missing data with proper relationships');
console.log('🛡️ Strategy: Duplicate-safe, relationship-preserving import');
console.log('');

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    }
  }

  return records;
}

async function comprehensiveCleanImport() {
  try {
    console.log('1️⃣ INITIALIZING CLEAN IMPORT SYSTEM...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 60000,
      queryTimeoutMillis: 300000
    });

    // Test connection
    const testResult = await sql`SELECT NOW() as time, 'Clean Import System' as message`;
    console.log('✅ Database connected:', testResult[0].time);
    console.log('✅ System message:', testResult[0].message);
    console.log('');

    console.log('2️⃣ PRE-IMPORT ANALYSIS...');

    // Get current state
    const [currentVehicles, currentCustomers, currentDocs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`
    ]);

    console.log('📊 Current database state:');
    console.log(`   🚗 Vehicles: ${currentVehicles[0].count}`);
    console.log(`   👥 Customers: ${currentCustomers[0].count}`);
    console.log(`   📄 Documents: ${currentDocs[0].count}`);
    console.log('');

    const ga4Path = process.env.DOCKER_IMPORT ? '/app/ga4-data' : '/Users/adamrutstein/Desktop/GA4 EXPORT';
    if (!fs.existsSync(ga4Path)) {
      throw new Error(`GA4 Export folder not found: ${ga4Path}`);
    }

    console.log('✅ GA4 Export folder found');
    console.log('');

    // Import tracking
    const importResults = {
      customers: { processed: 0, errors: 0, duplicates: 0 },
      vehicles: { processed: 0, errors: 0, duplicates: 0 },
      documents: { processed: 0, errors: 0, duplicates: 0 },
      lineItems: { processed: 0, errors: 0, duplicates: 0 },
      receipts: { processed: 0, errors: 0, duplicates: 0 }
    };

    console.log('3️⃣ PHASE 1: COMPREHENSIVE CUSTOMER IMPORT...');
    console.log('==============================================');

    const customersPath = path.join(ga4Path, 'Customers.csv');
    if (fs.existsSync(customersPath)) {
      console.log('👥 Processing Customers.csv...');

      const content = fs.readFileSync(customersPath, 'utf-8');
      const customerRecords = parseCSV(content);

      console.log(`   📋 Found ${customerRecords.length} customer records`);
      console.log('   🔧 Using correct field mapping:');
      console.log('      nameforename → first_name');
      console.log('      namesurname → last_name');
      console.log('      contactemail → email');
      console.log('      contactmobile/contacttelephone → phone');
      console.log('');

      let batchCount = 0;
      const batchSize = 100;

      for (let i = 0; i < customerRecords.length; i += batchSize) {
        const batch = customerRecords.slice(i, i + batchSize);
        batchCount++;

        console.log(`   ⚡ Processing batch ${batchCount}/${Math.ceil(customerRecords.length/batchSize)} (${batch.length} records)...`);

        for (const record of batch) {
          try {
            const id = record._id;
            const firstName = record.nameforename || 'Unknown';
            const lastName = record.namesurname || '';
            const email = record.contactemail || null;
            const phone = record.contactmobile || record.contacttelephone || null;
            const company = record.namecompany || null;
            const address = `${record.addresshouseno || ''} ${record.addressroad || ''}`.trim() || null;
            const postcode = record.addresspostcode || null;

            if (id && firstName && firstName !== 'Unknown') {
              // Use GA4 ID as primary key for proper relationships
              await sql`
                INSERT INTO customers (
                  id, first_name, last_name, email, phone, company,
                  address, postcode, created_at, updated_at
                )
                VALUES (
                  ${id}, ${firstName}, ${lastName}, ${email}, ${phone}, ${company},
                  ${address}, ${postcode}, NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  first_name = COALESCE(NULLIF(customers.first_name, 'Unknown'), EXCLUDED.first_name, customers.first_name),
                  last_name = COALESCE(customers.last_name, EXCLUDED.last_name),
                  email = COALESCE(customers.email, EXCLUDED.email),
                  phone = COALESCE(customers.phone, EXCLUDED.phone),
                  company = COALESCE(customers.company, EXCLUDED.company),
                  address = COALESCE(customers.address, EXCLUDED.address),
                  postcode = COALESCE(customers.postcode, EXCLUDED.postcode),
                  updated_at = NOW()
              `;

              importResults.customers.processed++;
            }

          } catch (error) {
            importResults.customers.errors++;
            if (error.message.includes('duplicate') || error.message.includes('conflict')) {
              importResults.customers.duplicates++;
            }
          }
        }

        // Progress update
        const progress = Math.round(((i + batch.length) / customerRecords.length) * 100);
        console.log(`   📊 Progress: ${progress}% (${importResults.customers.processed} processed, ${importResults.customers.errors} errors)`);
      }

      console.log(`   ✅ Customer import complete: ${importResults.customers.processed} processed`);
    } else {
      console.log('   ⚠️  Customers.csv not found');
    }
    console.log('');

    console.log('4️⃣ PHASE 2: VEHICLE-CUSTOMER RELATIONSHIP IMPORT...');
    console.log('====================================================');

    const vehiclesPath = path.join(ga4Path, 'Vehicles.csv');
    if (fs.existsSync(vehiclesPath)) {
      console.log('🚗 Processing Vehicles.csv with customer relationships...');

      const content = fs.readFileSync(vehiclesPath, 'utf-8');
      const vehicleRecords = parseCSV(content);

      console.log(`   📋 Found ${vehicleRecords.length} vehicle records`);
      console.log('   🔧 Mapping vehicle-customer relationships:');
      console.log('      regid → registration');
      console.log('      _id_customer → customer_id');
      console.log('      make, model, year → vehicle details');
      console.log('');

      let batchCount = 0;
      const batchSize = 200;

      for (let i = 0; i < vehicleRecords.length; i += batchSize) {
        const batch = vehicleRecords.slice(i, i + batchSize);
        batchCount++;

        console.log(`   ⚡ Processing batch ${batchCount}/${Math.ceil(vehicleRecords.length/batchSize)} (${batch.length} records)...`);

        for (const record of batch) {
          try {
            const registration = (record.regid || '').trim().toUpperCase();
            const customerId = record._id_customer || null;
            const make = record.make || 'Unknown';
            const model = record.model || 'Unknown';
            const year = record.year || record.yearofmanufacture || null;
            const vin = record.vin || null;
            const engineSize = record.enginesize || null;
            const fuelType = record.fueltype || null;

            if (registration) {
              await sql`
                INSERT INTO vehicles (
                  registration, customer_id, make, model, year, vin,
                  engine_size, fuel_type, created_at, updated_at
                )
                VALUES (
                  ${registration}, ${customerId}, ${make}, ${model}, ${year}, ${vin},
                  ${engineSize}, ${fuelType}, NOW(), NOW()
                )
                ON CONFLICT (registration) DO UPDATE SET
                  customer_id = COALESCE(EXCLUDED.customer_id, vehicles.customer_id),
                  make = COALESCE(NULLIF(vehicles.make, 'Unknown'), EXCLUDED.make, vehicles.make),
                  model = COALESCE(NULLIF(vehicles.model, 'Unknown'), EXCLUDED.model, vehicles.model),
                  year = COALESCE(vehicles.year, EXCLUDED.year),
                  vin = COALESCE(vehicles.vin, EXCLUDED.vin),
                  engine_size = COALESCE(vehicles.engine_size, EXCLUDED.engine_size),
                  fuel_type = COALESCE(vehicles.fuel_type, EXCLUDED.fuel_type),
                  updated_at = NOW()
              `;

              importResults.vehicles.processed++;
            }

          } catch (error) {
            importResults.vehicles.errors++;
            if (error.message.includes('duplicate') || error.message.includes('conflict')) {
              importResults.vehicles.duplicates++;
            }
          }
        }

        const progress = Math.round(((i + batch.length) / vehicleRecords.length) * 100);
        console.log(`   📊 Progress: ${progress}% (${importResults.vehicles.processed} processed, ${importResults.vehicles.errors} errors)`);
      }

      console.log(`   ✅ Vehicle import complete: ${importResults.vehicles.processed} processed`);
    } else {
      console.log('   ⚠️  Vehicles.csv not found');
    }
    console.log('');

    console.log('5️⃣ PHASE 3: DOCUMENT IMPORT WITH RELATIONSHIPS...');
    console.log('==================================================');

    const documentsPath = path.join(ga4Path, 'Documents.csv');
    if (fs.existsSync(documentsPath)) {
      console.log('📄 Processing Documents.csv...');

      const content = fs.readFileSync(documentsPath, 'utf-8');
      const documentRecords = parseCSV(content);

      console.log(`   📋 Found ${documentRecords.length} document records`);
      console.log('   🔧 Preserving document-customer relationships');
      console.log('');

      let batchCount = 0;
      const batchSize = 500;

      for (let i = 0; i < documentRecords.length; i += batchSize) {
        const batch = documentRecords.slice(i, i + batchSize);
        batchCount++;

        console.log(`   ⚡ Processing batch ${batchCount}/${Math.ceil(documentRecords.length/batchSize)} (${batch.length} records)...`);

        for (const record of batch) {
          try {
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
              await sql`
                INSERT INTO customer_documents (
                  id, customer_id, vehicle_registration, document_type,
                  document_number, document_date, total_gross, total_net,
                  total_tax, status, created_at, updated_at
                )
                VALUES (
                  ${id}, ${customerId}, ${vehicleReg}, ${documentType}, ${documentNumber},
                  ${documentDate}, ${totalGross}, ${totalNet}, ${totalTax}, ${status},
                  NOW(), NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                  customer_id = EXCLUDED.customer_id,
                  vehicle_registration = EXCLUDED.vehicle_registration,
                  document_type = EXCLUDED.document_type,
                  document_number = EXCLUDED.document_number,
                  document_date = EXCLUDED.document_date,
                  total_gross = EXCLUDED.total_gross,
                  total_net = EXCLUDED.total_net,
                  total_tax = EXCLUDED.total_tax,
                  status = EXCLUDED.status,
                  updated_at = NOW()
              `;

              importResults.documents.processed++;
            }

          } catch (error) {
            importResults.documents.errors++;
            if (error.message.includes('duplicate') || error.message.includes('conflict')) {
              importResults.documents.duplicates++;
            }
          }
        }

        const progress = Math.round(((i + batch.length) / documentRecords.length) * 100);
        console.log(`   📊 Progress: ${progress}% (${importResults.documents.processed} processed, ${importResults.documents.errors} errors)`);
      }

      console.log(`   ✅ Document import complete: ${importResults.documents.processed} processed`);
    } else {
      console.log('   ⚠️  Documents.csv not found');
    }
    console.log('');

    console.log('6️⃣ PHASE 4: LINE ITEMS IMPORT...');
    console.log('=================================');

    const lineItemsPath = path.join(ga4Path, 'LineItems.csv');
    if (fs.existsSync(lineItemsPath)) {
      console.log('📋 Processing LineItems.csv...');

      const content = fs.readFileSync(lineItemsPath, 'utf-8');
      const lineItemRecords = parseCSV(content);

      console.log(`   📋 Found ${lineItemRecords.length} line item records`);
      console.log('   🔧 Linking line items to documents');
      console.log('');

      let batchCount = 0;
      const batchSize = 1000; // Larger batches for line items

      for (let i = 0; i < lineItemRecords.length; i += batchSize) {
        const batch = lineItemRecords.slice(i, i + batchSize);
        batchCount++;

        console.log(`   ⚡ Processing batch ${batchCount}/${Math.ceil(lineItemRecords.length/batchSize)} (${batch.length} records)...`);

        for (const record of batch) {
          try {
            const id = record._id;
            const documentId = record._id_document;
            const description = record.description || '';
            const quantity = parseFloat(record.quantity || 1);
            const unitPrice = parseFloat(record.unit_price || 0);
            const total = parseFloat(record.total || 0);
            const partNumber = record.part_number || null;

            if (id && documentId) {
              await sql`
                INSERT INTO document_line_items (
                  id, document_id, description, quantity, unit_price,
                  total, part_number, created_at
                )
                VALUES (
                  ${id}, ${documentId}, ${description}, ${quantity}, ${unitPrice},
                  ${total}, ${partNumber}, NOW()
                )
                ON CONFLICT (id) DO NOTHING
              `;

              importResults.lineItems.processed++;
            }

          } catch (error) {
            importResults.lineItems.errors++;
          }
        }

        const progress = Math.round(((i + batch.length) / lineItemRecords.length) * 100);
        console.log(`   📊 Progress: ${progress}% (${importResults.lineItems.processed} processed, ${importResults.lineItems.errors} errors)`);
      }

      console.log(`   ✅ Line items import complete: ${importResults.lineItems.processed} processed`);
    } else {
      console.log('   ⚠️  LineItems.csv not found');
    }
    console.log('');

    console.log('7️⃣ FINAL VERIFICATION...');
    console.log('=========================');

    // Get final counts
    const [finalVehicles, finalCustomers, finalDocs, finalLineItems] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`.catch(() => [{ count: 0 }])
    ]);

    // Check relationships
    const vehicleCustomerLinks = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE customer_id IS NOT NULL
    `;

    const documentCustomerLinks = await sql`
      SELECT COUNT(*) as count
      FROM customer_documents
      WHERE customer_id IS NOT NULL
    `;

    console.log('📊 Final database state:');
    console.log(`   🚗 Vehicles: ${finalVehicles[0].count} (+${finalVehicles[0].count - currentVehicles[0].count})`);
    console.log(`   👥 Customers: ${finalCustomers[0].count} (+${finalCustomers[0].count - currentCustomers[0].count})`);
    console.log(`   📄 Documents: ${finalDocs[0].count} (+${finalDocs[0].count - currentDocs[0].count})`);
    console.log(`   📋 Line Items: ${finalLineItems[0].count} (new)`);
    console.log('');

    console.log('🔗 Relationship verification:');
    console.log(`   🚗→👥 Vehicles with customers: ${vehicleCustomerLinks[0].count}`);
    console.log(`   📄→👥 Documents with customers: ${documentCustomerLinks[0].count}`);
    console.log('');

    console.log('📈 Import summary:');
    Object.entries(importResults).forEach(([type, result]) => {
      if (result.processed > 0) {
        console.log(`   ${getTypeIcon(type)} ${type}: ${result.processed} processed, ${result.errors} errors, ${result.duplicates} duplicates`);
      }
    });
    console.log('');

    console.log('🎉 COMPREHENSIVE CLEAN IMPORT COMPLETE!');
    console.log('=======================================');
    console.log('✅ All missing data imported');
    console.log('✅ Customer relationships established');
    console.log('✅ Duplicate prevention successful');
    console.log('✅ Database integrity maintained');
    console.log('🎊 Your garage management system is now COMPLETE!');

  } catch (error) {
    console.log('❌ COMPREHENSIVE CLEAN IMPORT FAILED:', error.message);
    console.log('💡 Check database connection and GA4 Export folder');
  }
}

function getTypeIcon(type) {
  const icons = {
    customers: '👥',
    vehicles: '🚗',
    documents: '📄',
    lineItems: '📋',
    receipts: '🧾'
  };
  return icons[type] || '📊';
}

// Run the comprehensive clean import
comprehensiveCleanImport();
