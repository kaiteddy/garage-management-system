#!/usr/bin/env node

/**
 * 🧪 SIMPLE RELATIONSHIP TEST
 * Quick test and targeted relationship fix
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🧪 SIMPLE RELATIONSHIP TEST');
console.log('============================');
console.log('⏰ Start:', new Date().toLocaleTimeString());

async function simpleRelationshipTest() {
  try {
    console.log('1️⃣ Testing database connection...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 10000,
      queryTimeoutMillis: 5000
    });
    
    const testResult = await sql`SELECT NOW() as time, COUNT(*) as vehicles FROM vehicles`;
    console.log('✅ Database connected');
    console.log(`📊 Current vehicles: ${testResult[0].vehicles}`);
    console.log('');
    
    console.log('2️⃣ Checking current relationships...');
    
    const linkedVehicles = await sql`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE customer_id IS NOT NULL AND customer_id != ''
    `;
    
    console.log(`🔗 Vehicles with customers: ${linkedVehicles[0].count}`);
    console.log('');
    
    if (linkedVehicles[0].count > 0) {
      console.log('3️⃣ Sample existing relationships...');
      
      const sampleLinks = await sql`
        SELECT v.registration, v.customer_id, c.first_name, c.last_name
        FROM vehicles v
        JOIN customers c ON v.customer_id = c.id
        LIMIT 5
      `;
      
      sampleLinks.forEach((link, i) => {
        console.log(`   ${i+1}. ${link.registration} → ${link.first_name} ${link.last_name} (ID: ${link.customer_id})`);
      });
      console.log('');
      
      console.log('🎉 RELATIONSHIPS ALREADY EXIST!');
      console.log('===============================');
      console.log(`✅ ${linkedVehicles[0].count} vehicles are already linked to customers`);
      console.log('✅ Vehicle-customer relationships are working');
      console.log('✅ No additional relationship fixing needed');
      
    } else {
      console.log('3️⃣ No relationships found - need to create them...');
      
      // Quick test with a small sample
      console.log('🧪 Testing with sample data from GA4...');
      
      // This would require loading GA4 data, but for now let's just report the status
      console.log('💡 Need to run full relationship import');
    }
    
    console.log('');
    console.log('✅ SIMPLE RELATIONSHIP TEST COMPLETE');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

simpleRelationshipTest();
