require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkStatus() {
  try {
    console.log('🔍 Checking import status...\n');
    
    // Get basic counts
    const customers = await sql`SELECT COUNT(*) as count FROM customers`;
    const vehicles = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const documents = await sql`SELECT COUNT(*) as count FROM documents`;
    
    console.log('📊 CURRENT DATABASE STATUS:');
    console.log('==========================');
    console.log(`✅ Customers: ${customers[0].count.toLocaleString()}`);
    console.log(`🚗 Vehicles: ${vehicles[0].count.toLocaleString()}`);
    console.log(`📄 Documents: ${documents[0].count.toLocaleString()}`);
    
    const total = parseInt(customers[0].count) + parseInt(vehicles[0].count) + parseInt(documents[0].count);
    console.log(`📈 Total Records: ${total.toLocaleString()}`);
    
    // Check if import is successful
    if (parseInt(customers[0].count) > 100 && parseInt(vehicles[0].count) > 100) {
      console.log('\n🎉 IMPORT APPEARS SUCCESSFUL!');
    } else if (parseInt(customers[0].count) > 0 || parseInt(vehicles[0].count) > 0) {
      console.log('\n🔄 IMPORT IN PROGRESS...');
    } else {
      console.log('\n⏳ IMPORT NOT STARTED OR FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

checkStatus();
