import { sql } from "@/lib/database/neon-client"

async function testAPIQuery() {
  console.log('🔍 TESTING API QUERY TO SEE WHAT IT RETURNS');
  console.log('='.repeat(60));
  
  try {
    // Run the exact same query as the API
    const result = await sql`
      SELECT
        d.id,
        d.document_number,
        d.vehicle_registration,
        d.status
      FROM customer_documents d
      WHERE d.document_type = 'JS'
      ORDER BY d.vehicle_registration
      LIMIT 5
    `;
    
    console.log('📊 API Query Results:');
    result.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.vehicle_registration} - ${row.document_number || 'NULL'} (Status: ${row.status})`);
    });
    
    // Also test the COALESCE function
    const coalesceResult = await sql`
      SELECT
        d.id,
        COALESCE(d.document_number, 'NO-REF') as job_number,
        d.vehicle_registration,
        d.status
      FROM customer_documents d
      WHERE d.document_type = 'JS'
      ORDER BY d.vehicle_registration
      LIMIT 5
    `;
    
    console.log('\n📊 API Query with COALESCE:');
    coalesceResult.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.vehicle_registration} - ${row.job_number} (Status: ${row.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing API query:', error);
  }
}

// Run the test
testAPIQuery();
