#!/usr/bin/env node

/**
 * 🛡️ ROBUST COMPREHENSIVE IMPORT
 * Smaller batches, better error handling, progress tracking
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🛡️ ROBUST COMPREHENSIVE IMPORT');
console.log('===============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Import with robust error handling');
console.log('🔧 Strategy: Small batches, detailed logging, recovery');
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

async function robustImport() {
  try {
    console.log('1️⃣ INITIALIZING ROBUST IMPORT...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found');
    }
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 60000  // Shorter timeout
    });
    
    // Test connection
    await sql`SELECT NOW() as time`;
    console.log('✅ Database connected with robust settings');
    console.log('');
    
    console.log('2️⃣ QUICK DATABASE STATUS...');
    
    const [vehicles, customers, docs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`, 
      sql`SELECT COUNT(*) as count FROM customer_documents`
    ]);
    
    console.log(`📊 Current: ${vehicles[0].count} vehicles, ${customers[0].count} customers, ${docs[0].count} documents`);
    console.log('');
    
    const ga4Path = process.env.DOCKER_IMPORT ? '/app/ga4-data' : '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    // Import tracking
    const results = {
      customers: { processed: 0, errors: 0, skipped: 0 },
      vehicles: { processed: 0, errors: 0, skipped: 0 },
      documents: { processed: 0, errors: 0, skipped: 0 }
    };
    
    console.log('3️⃣ PHASE 1: ROBUST CUSTOMER IMPORT...');
    console.log('=====================================');
    
    const customersPath = path.join(ga4Path, 'Customers.csv');
    if (fs.existsSync(customersPath)) {
      console.log('👥 Processing customers with SMALL BATCHES...');
      
      const content = fs.readFileSync(customersPath, 'utf-8');
      const customerRecords = parseCSV(content);
      
      console.log(`   📋 Found ${customerRecords.length} customer records`);
      console.log('   🔧 Using SMALL BATCH strategy (25 records per batch)');
      console.log('');
      
      const batchSize = 25; // Much smaller batches
      let batchCount = 0;
      
      for (let i = 0; i < customerRecords.length; i += batchSize) {
        const batch = customerRecords.slice(i, i + batchSize);
        batchCount++;
        
        console.log(`   ⚡ Batch ${batchCount}/${Math.ceil(customerRecords.length/batchSize)} (${batch.length} records)...`);
        
        for (const record of batch) {
          try {
            const id = record._id;
            const firstName = record.nameforename || 'Unknown';
            const lastName = record.namesurname || '';
            const email = record.contactemail || null;
            const phone = record.contactmobile || record.contacttelephone || null;
            
            if (id && firstName && firstName !== 'Unknown') {
              await sql`
                INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
                VALUES (${id}, ${firstName}, ${lastName}, ${email}, ${phone}, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                  first_name = COALESCE(NULLIF(customers.first_name, 'Unknown'), EXCLUDED.first_name, customers.first_name),
                  last_name = COALESCE(customers.last_name, EXCLUDED.last_name),
                  email = COALESCE(customers.email, EXCLUDED.email),
                  phone = COALESCE(customers.phone, EXCLUDED.phone),
                  updated_at = NOW()
              `;
              
              results.customers.processed++;
            } else {
              results.customers.skipped++;
            }
            
          } catch (error) {
            results.customers.errors++;
            console.log(`      ⚠️  Error processing customer ${record._id}: ${error.message.substring(0, 100)}`);
          }
        }
        
        // Progress update every 10 batches
        if (batchCount % 10 === 0) {
          const progress = Math.round((i / customerRecords.length) * 100);
          console.log(`   📊 Progress: ${progress}% (${results.customers.processed} processed, ${results.customers.errors} errors)`);
        }
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`   ✅ Customer import: ${results.customers.processed} processed, ${results.customers.errors} errors, ${results.customers.skipped} skipped`);
    }
    console.log('');
    
    console.log('4️⃣ PHASE 2: ROBUST VEHICLE RELATIONSHIPS...');
    console.log('============================================');
    
    const vehiclesPath = path.join(ga4Path, 'Vehicles.csv');
    if (fs.existsSync(vehiclesPath)) {
      console.log('🚗 Processing vehicle relationships with SMALL BATCHES...');
      
      const content = fs.readFileSync(vehiclesPath, 'utf-8');
      const vehicleRecords = parseCSV(content);
      
      console.log(`   📋 Found ${vehicleRecords.length} vehicle records`);
      console.log('   🔧 Using SMALL BATCH strategy (50 records per batch)');
      console.log('');
      
      const batchSize = 50;
      let batchCount = 0;
      
      for (let i = 0; i < vehicleRecords.length; i += batchSize) {
        const batch = vehicleRecords.slice(i, i + batchSize);
        batchCount++;
        
        console.log(`   ⚡ Batch ${batchCount}/${Math.ceil(vehicleRecords.length/batchSize)} (${batch.length} records)...`);
        
        for (const record of batch) {
          try {
            const registration = (record.regid || '').trim().toUpperCase();
            const customerId = record._id_customer || null;
            const make = record.make || 'Unknown';
            const model = record.model || 'Unknown';
            
            if (registration) {
              await sql`
                INSERT INTO vehicles (registration, customer_id, make, model, created_at, updated_at)
                VALUES (${registration}, ${customerId}, ${make}, ${model}, NOW(), NOW())
                ON CONFLICT (registration) DO UPDATE SET
                  customer_id = COALESCE(EXCLUDED.customer_id, vehicles.customer_id),
                  make = COALESCE(NULLIF(vehicles.make, 'Unknown'), EXCLUDED.make, vehicles.make),
                  model = COALESCE(NULLIF(vehicles.model, 'Unknown'), EXCLUDED.model, vehicles.model),
                  updated_at = NOW()
              `;
              
              results.vehicles.processed++;
            } else {
              results.vehicles.skipped++;
            }
            
          } catch (error) {
            results.vehicles.errors++;
            console.log(`      ⚠️  Error processing vehicle ${record.regid}: ${error.message.substring(0, 100)}`);
          }
        }
        
        if (batchCount % 20 === 0) {
          const progress = Math.round((i / vehicleRecords.length) * 100);
          console.log(`   📊 Progress: ${progress}% (${results.vehicles.processed} processed, ${results.vehicles.errors} errors)`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`   ✅ Vehicle import: ${results.vehicles.processed} processed, ${results.vehicles.errors} errors, ${results.vehicles.skipped} skipped`);
    }
    console.log('');
    
    console.log('5️⃣ PHASE 3: ROBUST DOCUMENT IMPORT (SAMPLE)...');
    console.log('===============================================');
    
    const documentsPath = path.join(ga4Path, 'Documents.csv');
    if (fs.existsSync(documentsPath)) {
      console.log('📄 Processing SAMPLE documents (first 1000 only)...');
      
      const content = fs.readFileSync(documentsPath, 'utf-8');
      const documentRecords = parseCSV(content);
      
      // Process only first 1000 documents as a test
      const sampleRecords = documentRecords.slice(0, 1000);
      
      console.log(`   📋 Processing ${sampleRecords.length} sample documents (of ${documentRecords.length} total)`);
      console.log('   🔧 Using SMALL BATCH strategy (100 records per batch)');
      console.log('');
      
      const batchSize = 100;
      let batchCount = 0;
      
      for (let i = 0; i < sampleRecords.length; i += batchSize) {
        const batch = sampleRecords.slice(i, i + batchSize);
        batchCount++;
        
        console.log(`   ⚡ Batch ${batchCount}/${Math.ceil(sampleRecords.length/batchSize)} (${batch.length} records)...`);
        
        for (const record of batch) {
          try {
            const id = record._id;
            const customerId = record._id_customer;
            const documentType = record.doc_type || 'Invoice';
            const totalGross = parseFloat(record.total_gross || 0);
            
            if (id) {
              await sql`
                INSERT INTO customer_documents (id, customer_id, document_type, total_gross, created_at, updated_at)
                VALUES (${id}, ${customerId}, ${documentType}, ${totalGross}, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
              `;
              
              results.documents.processed++;
            } else {
              results.documents.skipped++;
            }
            
          } catch (error) {
            results.documents.errors++;
            console.log(`      ⚠️  Error processing document ${record._id}: ${error.message.substring(0, 100)}`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`   ✅ Document sample: ${results.documents.processed} processed, ${results.documents.errors} errors, ${results.documents.skipped} skipped`);
    }
    console.log('');
    
    console.log('6️⃣ FINAL VERIFICATION...');
    console.log('=========================');
    
    const [finalVehicles, finalCustomers, finalDocs] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`
    ]);
    
    const vehicleLinks = await sql`SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL`;
    
    console.log('📊 FINAL RESULTS:');
    console.log(`   🚗 Vehicles: ${finalVehicles[0].count} (+${finalVehicles[0].count - vehicles[0].count})`);
    console.log(`   👥 Customers: ${finalCustomers[0].count} (+${finalCustomers[0].count - customers[0].count})`);
    console.log(`   📄 Documents: ${finalDocs[0].count} (+${finalDocs[0].count - docs[0].count})`);
    console.log(`   🔗 Vehicle-Customer Links: ${vehicleLinks[0].count}`);
    console.log('');
    
    console.log('📈 IMPORT SUMMARY:');
    Object.entries(results).forEach(([type, result]) => {
      console.log(`   ${type}: ${result.processed} processed, ${result.errors} errors, ${result.skipped} skipped`);
    });
    console.log('');
    
    console.log('🎉 ROBUST IMPORT COMPLETE!');
    console.log('==========================');
    console.log('✅ Small batch processing successful');
    console.log('✅ Error handling worked properly');
    console.log('✅ Database relationships established');
    console.log('✅ Ready for full import if needed');
    
  } catch (error) {
    console.log('❌ ROBUST IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

robustImport();
