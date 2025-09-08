#!/usr/bin/env node

/**
 * 🧪 SCALE PLAN CONNECTION TEST
 * Quick test to verify Neon Scale Plan accessibility
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🧪 SCALE PLAN CONNECTION TEST');
console.log('==============================');
console.log('⏰ Time:', new Date().toLocaleTimeString());

async function testScalePlan() {
  try {
    console.log('1️⃣ Testing Scale Plan connection...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 10000,
      queryTimeoutMillis: 8000
    });
    
    const startTime = Date.now();
    const result = await sql`
      SELECT 
        NOW() as current_time,
        version() as db_version,
        current_database() as database_name,
        current_user as user_name
    `;
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Scale Plan connection successful!');
    console.log(`⚡ Response time: ${responseTime}ms`);
    console.log(`📊 Database: ${result[0].database_name}`);
    console.log(`👤 User: ${result[0].user_name}`);
    console.log(`🕐 DB Time: ${result[0].current_time}`);
    console.log(`💾 Version: ${result[0].db_version.split(' ')[0]} ${result[0].db_version.split(' ')[1]}`);
    console.log('');
    
    console.log('2️⃣ Testing Scale Plan performance...');
    
    const perfStart = Date.now();
    const [customers, documents, vehicles] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM vehicles`
    ]);
    const perfTime = Date.now() - perfStart;
    
    console.log('✅ Concurrent queries successful!');
    console.log(`⚡ Concurrent query time: ${perfTime}ms`);
    console.log(`👥 Customers: ${customers[0].count}`);
    console.log(`📄 Documents: ${documents[0].count}`);
    console.log(`🚗 Vehicles: ${vehicles[0].count}`);
    console.log('');
    
    console.log('3️⃣ Scale Plan assessment...');
    
    if (responseTime < 1000 && perfTime < 2000) {
      console.log('🎉 EXCELLENT Scale Plan performance!');
      console.log('✅ Ready for enterprise-grade imports');
      console.log('✅ 8 CU autoscaling is responsive');
    } else if (responseTime < 3000 && perfTime < 5000) {
      console.log('✅ Good Scale Plan performance');
      console.log('✅ Ready for standard imports');
    } else {
      console.log('⚠️  Scale Plan performance slower than expected');
      console.log('💡 May need smaller batch sizes');
    }
    
    console.log('');
    console.log('✅ SCALE PLAN TEST COMPLETE');
    
  } catch (error) {
    console.log('❌ Scale Plan test failed:', error.message);
    console.log('🔍 Error code:', error.code || 'No code');
    
    if (error.message.includes('timeout')) {
      console.log('💡 Database may be scaling up - try again in 30 seconds');
    } else if (error.message.includes('connection')) {
      console.log('💡 Check DATABASE_URL in .env.local');
    } else {
      console.log('💡 Unexpected error - check Neon dashboard');
    }
  }
}

testScalePlan();
