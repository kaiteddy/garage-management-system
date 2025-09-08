require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function quickImportStatus() {
  try {
    console.log('📊 Quick import status check...\n');

    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    console.log('Current database counts:');
    console.log(`   - Customers: ${stats[0].customers}`);
    console.log(`   - Vehicles: ${stats[0].vehicles}`);
    console.log(`   - Documents: ${stats[0].documents}`);
    
    if (parseInt(stats[0].customers) > 0) {
      console.log('\n✅ Customer import is progressing');
    } else {
      console.log('\n⏳ Customer import not yet visible in database');
    }

  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

quickImportStatus();
