import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.NEON_DATABASE_URL);

async function quickQualityCheck() {
  console.log('🔍 QUICK DOCUMENT QUALITY CHECK');
  console.log('===============================\n');
  
  try {
    // Sample documents
    const sample = await sql`
      SELECT _id, doc_type, doc_number, total_gross, customer_name, vehicle_registration
      FROM documents 
      ORDER BY _id DESC 
      LIMIT 5
    `;
    
    console.log('📄 Sample imported documents:');
    sample.forEach((doc, i) => {
      console.log(`${i+1}. ID: ${doc._id}`);
      console.log(`   Type: ${doc.doc_type}`);
      console.log(`   Number: ${doc.doc_number || 'N/A'}`);
      console.log(`   Amount: £${doc.total_gross}`);
      console.log(`   Customer: ${doc.customer_name || 'N/A'}`);
      console.log(`   Vehicle: ${doc.vehicle_registration || 'N/A'}`);
      console.log('');
    });
    
    // Basic stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN total_gross > 0 THEN 1 END) as has_amount,
        COUNT(CASE WHEN customer_name IS NOT NULL THEN 1 END) as has_customer,
        COUNT(CASE WHEN vehicle_registration IS NOT NULL THEN 1 END) as has_vehicle,
        AVG(total_gross) as avg_amount,
        MAX(total_gross) as max_amount
      FROM documents
    `;
    
    const s = stats[0];
    console.log('📊 Overall document quality:');
    console.log(`Total documents: ${parseInt(s.total).toLocaleString()}`);
    console.log(`Has amount > 0: ${s.has_amount} (${((s.has_amount/s.total)*100).toFixed(1)}%)`);
    console.log(`Has customer: ${s.has_customer} (${((s.has_customer/s.total)*100).toFixed(1)}%)`);
    console.log(`Has vehicle: ${s.has_vehicle} (${((s.has_vehicle/s.total)*100).toFixed(1)}%)`);
    console.log(`Average amount: £${parseFloat(s.avg_amount).toFixed(2)}`);
    console.log(`Max amount: £${s.max_amount}`);
    
    console.log('\n✅ Quality check complete!');
    
  } catch (error) {
    console.error('❌ Quality check failed:', error);
  }
}

quickQualityCheck();
