#!/usr/bin/env node

/**
 * 🚀 EFFICIENT VEHICLE-CUSTOMER RELATIONSHIPS
 * Pre-load customer IDs for faster processing
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🚀 EFFICIENT VEHICLE-CUSTOMER RELATIONSHIPS');
console.log('===========================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Efficiently link vehicles to customers');
console.log('🔧 Strategy: Pre-load customer IDs, batch updates');
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

async function efficientVehicleRelationships() {
  try {
    console.log('1️⃣ INITIALIZING EFFICIENT RELATIONSHIP FIXER...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 60000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ PRE-LOADING CUSTOMER IDS...');
    
    // Get all existing customer IDs in a Set for fast lookup
    const existingCustomers = await sql`SELECT id FROM customers`;
    const customerIdSet = new Set(existingCustomers.map(c => c.id));
    
    console.log(`📊 Loaded ${customerIdSet.size} existing customer IDs for fast lookup`);
    console.log('');
    
    console.log('3️⃣ LOADING GA4 VEHICLE DATA...');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const vehiclesPath = path.join(ga4Path, 'Vehicles.csv');
    
    const content = fs.readFileSync(vehiclesPath, 'utf-8');
    const vehicleRecords = parseCSV(content);
    
    console.log(`📋 Found ${vehicleRecords.length} vehicle records`);
    console.log('');
    
    console.log('4️⃣ FILTERING VALID RELATIONSHIPS...');
    
    // Pre-filter vehicles that have valid customer IDs
    const validRelationships = [];
    let skippedNoReg = 0;
    let skippedNoCustomer = 0;
    let skippedCustomerNotExists = 0;
    
    for (const record of vehicleRecords) {
      const registration = (record.regid || record.registration || '').trim().toUpperCase();
      const customerId = record._id_customer || null;
      
      if (!registration) {
        skippedNoReg++;
        continue;
      }
      
      if (!customerId) {
        skippedNoCustomer++;
        continue;
      }
      
      if (!customerIdSet.has(customerId)) {
        skippedCustomerNotExists++;
        continue;
      }
      
      validRelationships.push({
        registration: registration,
        customerId: customerId
      });
    }
    
    console.log('📊 Filtering results:');
    console.log(`   ✅ Valid relationships: ${validRelationships.length}`);
    console.log(`   ❌ Skipped (no registration): ${skippedNoReg}`);
    console.log(`   ❌ Skipped (no customer ID): ${skippedNoCustomer}`);
    console.log(`   ❌ Skipped (customer not in DB): ${skippedCustomerNotExists}`);
    console.log('');
    
    if (validRelationships.length === 0) {
      console.log('⚠️  No valid relationships found to process');
      return;
    }
    
    console.log('5️⃣ BATCH UPDATING VEHICLE RELATIONSHIPS...');
    console.log('==========================================');
    
    let updated = 0;
    let errors = 0;
    const batchSize = 100; // Larger batches since we pre-filtered
    
    for (let i = 0; i < validRelationships.length; i += batchSize) {
      const batch = validRelationships.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(validRelationships.length / batchSize);
      
      console.log(`   ⚡ Processing batch ${batchNum}/${totalBatches} (${batch.length} relationships)...`);
      
      try {
        // Use a single transaction for the batch
        await sql.begin(async (sql) => {
          for (const rel of batch) {
            const result = await sql`
              UPDATE vehicles 
              SET customer_id = ${rel.customerId}, updated_at = NOW()
              WHERE registration = ${rel.registration}
              AND (customer_id IS NULL OR customer_id = '')
            `;
            
            if (result.count > 0) {
              updated++;
            }
          }
        });
        
        // Progress update every 10 batches
        if (batchNum % 10 === 0) {
          const progress = Math.round((i / validRelationships.length) * 100);
          console.log(`   📊 Progress: ${progress}% (${updated} vehicles updated)`);
        }
        
      } catch (error) {
        errors++;
        console.log(`   ⚠️  Batch ${batchNum} error: ${error.message.substring(0, 80)}`);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('');
    console.log('6️⃣ FINAL VERIFICATION...');
    console.log('=========================');
    
    // Check results
    const [finalLinkedVehicles, sampleLinkedVehicles] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL AND customer_id != ''`,
      sql`
        SELECT v.registration, v.make, v.model, c.first_name, c.last_name
        FROM vehicles v
        JOIN customers c ON v.customer_id = c.id
        LIMIT 10
      `
    ]);
    
    console.log('📊 FINAL RESULTS:');
    console.log(`   🔗 Vehicles now linked to customers: ${finalLinkedVehicles[0].count}`);
    console.log(`   ⚡ Vehicles updated in this run: ${updated}`);
    console.log(`   ❌ Batch errors: ${errors}`);
    console.log('');
    
    console.log('👥 Sample vehicle-customer relationships:');
    sampleLinkedVehicles.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.registration} (${v.make} ${v.model}) → ${v.first_name} ${v.last_name}`);
    });
    console.log('');
    
    // Calculate success metrics
    const totalVehicles = 10519; // From previous check
    const linkageRate = Math.round((finalLinkedVehicles[0].count / totalVehicles) * 100);
    
    console.log('🎯 RELATIONSHIP FIXING RESULTS:');
    console.log('===============================');
    
    if (finalLinkedVehicles[0].count > 5000) {
      console.log('🎉 EXCELLENT SUCCESS!');
      console.log(`   ✅ ${linkageRate}% of vehicles now linked to customers`);
      console.log(`   ✅ ${finalLinkedVehicles[0].count} vehicle-customer relationships established`);
      console.log('   ✅ Database relationships significantly improved');
    } else if (finalLinkedVehicles[0].count > 2000) {
      console.log('✅ GOOD SUCCESS!');
      console.log(`   ✅ ${linkageRate}% of vehicles linked to customers`);
      console.log(`   ✅ ${finalLinkedVehicles[0].count} relationships established`);
      console.log('   💡 Many vehicles linked - some customers may not be in current database');
    } else if (finalLinkedVehicles[0].count > 500) {
      console.log('⚠️  PARTIAL SUCCESS');
      console.log(`   ⚠️  ${linkageRate}% of vehicles linked`);
      console.log(`   ⚠️  ${finalLinkedVehicles[0].count} relationships established`);
      console.log('   💡 Limited success - customer database may be incomplete');
    } else {
      console.log('❌ LIMITED SUCCESS');
      console.log(`   ❌ Only ${finalLinkedVehicles[0].count} relationships established`);
      console.log('   💡 Customer-vehicle data matching issues');
    }
    
    console.log('');
    console.log('💡 ANALYSIS:');
    console.log(`   📊 Customer database: ${customerIdSet.size} customers`);
    console.log(`   📊 Vehicle database: ${totalVehicles} vehicles`);
    console.log(`   📊 GA4 vehicle records: ${vehicleRecords.length}`);
    console.log(`   📊 Valid relationships found: ${validRelationships.length}`);
    console.log(`   📊 Successfully linked: ${finalLinkedVehicles[0].count}`);
    
    if (validRelationships.length > finalLinkedVehicles[0].count) {
      console.log('   💡 Some valid relationships may not have matched existing vehicle registrations');
    }
    
    console.log('');
    console.log('✅ EFFICIENT VEHICLE RELATIONSHIP FIXING COMPLETE!');
    console.log('==================================================');
    
  } catch (error) {
    console.log('❌ EFFICIENT RELATIONSHIP FIXING FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

efficientVehicleRelationships();
