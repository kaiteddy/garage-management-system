#!/usr/bin/env node

/**
 * 🔗 FIX VEHICLE-CUSTOMER RELATIONSHIPS
 * Focused script to establish missing vehicle-customer links
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔗 FIX VEHICLE-CUSTOMER RELATIONSHIPS');
console.log('=====================================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Link all vehicles to their customers');
console.log('🔧 Strategy: Small batches, robust error handling');
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

async function fixVehicleRelationships() {
  try {
    console.log('1️⃣ INITIALIZING RELATIONSHIP FIXER...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 60000
    });
    
    // Test connection
    const testResult = await sql`SELECT NOW() as time`;
    console.log('✅ Database connected:', testResult[0].time);
    console.log('');
    
    console.log('2️⃣ ANALYZING CURRENT SITUATION...');
    
    // Check current state
    const [totalVehicles, vehiclesWithCustomers, totalCustomers] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL AND customer_id != ''`,
      sql`SELECT COUNT(*) as count FROM customers`
    ]);
    
    console.log('📊 Current state:');
    console.log(`   🚗 Total vehicles: ${totalVehicles[0].count}`);
    console.log(`   🔗 Vehicles with customers: ${vehiclesWithCustomers[0].count}`);
    console.log(`   👥 Total customers: ${totalCustomers[0].count}`);
    console.log(`   ❌ Vehicles missing customers: ${totalVehicles[0].count - vehiclesWithCustomers[0].count}`);
    console.log('');
    
    console.log('3️⃣ LOADING GA4 VEHICLE DATA...');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const vehiclesPath = path.join(ga4Path, 'Vehicles.csv');
    
    if (!fs.existsSync(vehiclesPath)) {
      throw new Error(`Vehicles.csv not found at ${vehiclesPath}`);
    }
    
    const content = fs.readFileSync(vehiclesPath, 'utf-8');
    const vehicleRecords = parseCSV(content);
    
    console.log(`📋 Found ${vehicleRecords.length} vehicle records in GA4 export`);
    console.log('');
    
    // Analyze the data structure
    if (vehicleRecords.length > 0) {
      const sample = vehicleRecords[0];
      console.log('🔍 GA4 Vehicle data structure:');
      console.log(`   Registration field: ${sample.regid || sample.registration || 'NOT FOUND'}`);
      console.log(`   Customer ID field: ${sample._id_customer || 'NOT FOUND'}`);
      console.log(`   Make: ${sample.make || 'NOT FOUND'}`);
      console.log(`   Model: ${sample.model || 'NOT FOUND'}`);
      console.log('');
    }
    
    console.log('4️⃣ PROCESSING VEHICLE-CUSTOMER RELATIONSHIPS...');
    console.log('================================================');
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;
    
    const batchSize = 50; // Small batches for reliability
    let batchCount = 0;
    
    for (let i = 0; i < vehicleRecords.length; i += batchSize) {
      const batch = vehicleRecords.slice(i, i + batchSize);
      batchCount++;
      
      console.log(`   ⚡ Processing batch ${batchCount}/${Math.ceil(vehicleRecords.length/batchSize)} (${batch.length} records)...`);
      
      for (const record of batch) {
        try {
          const registration = (record.regid || record.registration || '').trim().toUpperCase();
          const customerId = record._id_customer || null;
          
          if (!registration) {
            skipped++;
            continue;
          }
          
          if (!customerId) {
            skipped++;
            continue;
          }
          
          // Check if customer exists in our database
          const customerExists = await sql`
            SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
          `;
          
          if (customerExists.length === 0) {
            // Customer doesn't exist, skip this relationship
            skipped++;
            continue;
          }
          
          // Update the vehicle with customer relationship
          const updateResult = await sql`
            UPDATE vehicles 
            SET customer_id = ${customerId}, updated_at = NOW()
            WHERE registration = ${registration}
            AND (customer_id IS NULL OR customer_id = '')
          `;
          
          if (updateResult.count > 0) {
            updated++;
          }
          
          processed++;
          
        } catch (error) {
          errors++;
          console.log(`      ⚠️  Error processing ${record.regid}: ${error.message.substring(0, 80)}`);
        }
      }
      
      // Progress update every 20 batches
      if (batchCount % 20 === 0) {
        const progress = Math.round((i / vehicleRecords.length) * 100);
        console.log(`   📊 Progress: ${progress}% (${processed} processed, ${updated} updated, ${errors} errors, ${skipped} skipped)`);
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log('5️⃣ FINAL VERIFICATION...');
    console.log('=========================');
    
    // Check final state
    const [finalVehiclesWithCustomers, sampleLinkedVehicles] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL AND customer_id != ''`,
      sql`
        SELECT v.registration, v.make, v.model, v.customer_id, c.first_name, c.last_name
        FROM vehicles v
        JOIN customers c ON v.customer_id = c.id
        LIMIT 10
      `
    ]);
    
    console.log('📊 FINAL RESULTS:');
    console.log(`   🔗 Vehicles now with customers: ${finalVehiclesWithCustomers[0].count}`);
    console.log(`   📈 Improvement: +${finalVehiclesWithCustomers[0].count - vehiclesWithCustomers[0].count} new relationships`);
    console.log(`   ⚡ Processing summary: ${processed} processed, ${updated} updated, ${errors} errors, ${skipped} skipped`);
    console.log('');
    
    console.log('👥 Sample vehicle-customer relationships:');
    sampleLinkedVehicles.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.registration} (${v.make} ${v.model}) → ${v.first_name} ${v.last_name}`);
    });
    console.log('');
    
    // Calculate success rate
    const successRate = Math.round((finalVehiclesWithCustomers[0].count / totalVehicles[0].count) * 100);
    
    console.log('🎯 RELATIONSHIP FIXING RESULTS:');
    console.log('===============================');
    
    if (finalVehiclesWithCustomers[0].count > totalVehicles[0].count * 0.8) {
      console.log('🎉 EXCELLENT SUCCESS!');
      console.log(`   ✅ ${successRate}% of vehicles now linked to customers`);
      console.log('   ✅ Vehicle-customer relationships established');
      console.log('   ✅ Database integrity significantly improved');
    } else if (finalVehiclesWithCustomers[0].count > totalVehicles[0].count * 0.5) {
      console.log('✅ GOOD SUCCESS!');
      console.log(`   ✅ ${successRate}% of vehicles now linked to customers`);
      console.log('   ✅ Major improvement in relationships');
      console.log('   💡 Some vehicles may not have matching customers in GA4 data');
    } else if (finalVehiclesWithCustomers[0].count > vehiclesWithCustomers[0].count) {
      console.log('⚠️  PARTIAL SUCCESS');
      console.log(`   ⚠️  ${successRate}% of vehicles linked to customers`);
      console.log('   ⚠️  Some relationships established but many missing');
      console.log('   💡 May need to investigate data matching issues');
    } else {
      console.log('❌ LIMITED SUCCESS');
      console.log('   ❌ Few relationships established');
      console.log('   💡 Data matching issues need investigation');
    }
    
    console.log('');
    console.log('✅ VEHICLE RELATIONSHIP FIXING COMPLETE!');
    console.log('========================================');
    
  } catch (error) {
    console.log('❌ RELATIONSHIP FIXING FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

fixVehicleRelationships();
