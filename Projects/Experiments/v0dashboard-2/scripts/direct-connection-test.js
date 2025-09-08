require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🔍 DIRECT CONNECTION TEST');
console.log('=========================');
console.log(`⏰ Test time: ${new Date().toLocaleTimeString()}`);
console.log('');

// Get the original pooler URL
const poolerUrl = process.env.DATABASE_URL;
console.log('🔗 Original URL (pooler):', poolerUrl.replace(/:[^:@]*@/, ':***@'));

// Create direct connection URL (remove -pooler)
const directUrl = poolerUrl.replace('-pooler.eu-west-2.aws.neon.tech', '.eu-west-2.aws.neon.tech');
console.log('🎯 Direct URL:', directUrl.replace(/:[^:@]*@/, ':***@'));
console.log('');

async function testConnections() {
  console.log('1️⃣ Testing POOLER connection...');
  try {
    const poolerSql = neon(poolerUrl, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 5000
    });
    
    const start1 = Date.now();
    const result1 = await poolerSql`SELECT NOW() as current_time, 'Pooler connection' as type`;
    const time1 = Date.now() - start1;
    
    console.log(`   ✅ POOLER SUCCESS: ${time1}ms`);
    console.log(`   📅 Time: ${result1[0].current_time}`);
    console.log(`   🔗 Type: ${result1[0].type}`);
    
  } catch (error) {
    console.log(`   ❌ POOLER FAILED: ${error.message}`);
  }
  
  console.log('');
  console.log('2️⃣ Testing DIRECT connection...');
  try {
    const directSql = neon(directUrl, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 5000
    });
    
    const start2 = Date.now();
    const result2 = await directSql`SELECT NOW() as current_time, 'Direct connection' as type`;
    const time2 = Date.now() - start2;
    
    console.log(`   ✅ DIRECT SUCCESS: ${time2}ms`);
    console.log(`   📅 Time: ${result2[0].current_time}`);
    console.log(`   🔗 Type: ${result2[0].type}`);
    
  } catch (error) {
    console.log(`   ❌ DIRECT FAILED: ${error.message}`);
  }
  
  console.log('');
  console.log('3️⃣ Testing database status...');
  
  // Try with whichever connection worked
  let workingSql = null;
  try {
    workingSql = neon(poolerUrl, { connectionTimeoutMillis: 3000 });
    await workingSql`SELECT 1`;
    console.log('   🔗 Using pooler connection for status check');
  } catch (error) {
    try {
      workingSql = neon(directUrl, { connectionTimeoutMillis: 3000 });
      await workingSql`SELECT 1`;
      console.log('   🎯 Using direct connection for status check');
    } catch (error2) {
      console.log('   ❌ Both connections failed for status check');
      return;
    }
  }
  
  if (workingSql) {
    try {
      const status = await workingSql`
        SELECT 
          (SELECT COUNT(*) FROM customers) as customers,
          (SELECT COUNT(*) FROM vehicles) as vehicles,
          (SELECT COUNT(*) FROM documents) as documents
      `;
      
      const counts = status[0];
      console.log('   📊 Current database status:');
      console.log(`      👥 Customers: ${counts.customers}`);
      console.log(`      🚗 Vehicles: ${counts.vehicles}`);
      console.log(`      📄 Documents: ${counts.documents}`);
      
      console.log('');
      console.log('🎉 DATABASE IS RESPONSIVE!');
      console.log('Ready to proceed with optimized import!');
      
    } catch (error) {
      console.log(`   ⚠️  Status check failed: ${error.message}`);
    }
  }
}

testConnections().catch(error => {
  console.log(`💥 Test failed: ${error.message}`);
});
