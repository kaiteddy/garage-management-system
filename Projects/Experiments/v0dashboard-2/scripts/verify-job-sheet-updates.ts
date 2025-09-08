import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function verifyJobSheetUpdates() {
  console.log('🔍 VERIFYING JOB SHEET REFERENCE NUMBER UPDATES');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Check current state of job sheet reference numbers
    const result = await client.query(`
      SELECT 
        id,
        document_number,
        vehicle_registration,
        status,
        updated_at
      FROM customer_documents 
      WHERE document_type = 'JS'
      ORDER BY vehicle_registration
      LIMIT 10
    `);
    
    console.log(`📊 Current Job Sheet Status (first 10):`);
    result.rows.forEach((row, index) => {
      const refNumber = row.document_number || 'NO-REF';
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.vehicle_registration} - ${refNumber} (Status: ${row.status})`);
    });
    
    // Count how many have reference numbers
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(document_number) as with_reference,
        COUNT(*) - COUNT(document_number) as without_reference
      FROM customer_documents 
      WHERE document_type = 'JS'
    `);
    
    const stats = countResult.rows[0];
    console.log(`\n📊 Summary:`);
    console.log(`   Total job sheets: ${stats.total}`);
    console.log(`   With reference numbers: ${stats.with_reference}`);
    console.log(`   Without reference numbers: ${stats.without_reference}`);
    
    if (parseInt(stats.with_reference) === 0) {
      console.log('\n❌ NO REFERENCE NUMBERS FOUND - Updates did not work!');
      console.log('The update script may have failed or used incorrect IDs.');
    } else {
      console.log('\n✅ Reference numbers found - Updates worked!');
    }
    
  } catch (error) {
    console.error('❌ Error verifying updates:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await verifyJobSheetUpdates();
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();
