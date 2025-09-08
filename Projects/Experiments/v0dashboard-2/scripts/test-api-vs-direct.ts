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

async function testAPIvsDirectQuery() {
  console.log('🔍 TESTING API QUERY VS DIRECT QUERY');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Test the exact same query as the API
    const result = await client.query(`
      SELECT
        d.id,
        d.document_number,
        COALESCE(d.document_number, 'NO-REF') as job_number,
        d.vehicle_registration,
        d.status
      FROM customer_documents d
      WHERE d.document_type = 'JS'
      ORDER BY d.vehicle_registration
      LIMIT 5
    `);
    
    console.log('📊 Direct Database Query Results:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.vehicle_registration} - Raw: ${row.document_number || 'NULL'} | COALESCE: ${row.job_number} (Status: ${row.status})`);
    });
    
    // Check if there's a difference in how the API might be querying
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
      console.log('\n❌ NO REFERENCE NUMBERS FOUND!');
      console.log('This means the API should be showing NO-REF for all job sheets.');
      console.log('But our verification script shows they DO exist...');
      console.log('This suggests there might be a database connection issue.');
    } else {
      console.log('\n✅ Reference numbers found!');
      console.log('The API should be showing the actual reference numbers.');
    }
    
  } catch (error) {
    console.error('❌ Error testing queries:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testAPIvsDirectQuery();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
main();
