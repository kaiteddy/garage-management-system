require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function superFastFreshImport() {
  const startTime = Date.now();
  
  try {
    console.log('⚡ SUPER FAST FRESH IMPORT - Using Proven API Method\n');

    // Step 1: Clear database quickly
    console.log('🗑️  Step 1: Clearing database...');
    await sql`DELETE FROM documents`;
    await sql`DELETE FROM vehicles`;  
    await sql`DELETE FROM customers`;
    console.log('   ✅ Database cleared');

    // Step 2: Use the existing update-import API that we know works
    console.log('\n📊 Step 2: Importing via proven API method...');
    
    console.log('   👥 Importing customers...');
    const customersResponse = await fetch('http://localhost:3000/api/update-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updateMode: false,  // Fresh import mode
        files: ['customers'],
        batchSize: 1000
      })
    });
    
    const customersResult = await customersResponse.json();
    console.log(`   ✅ Customers: ${customersResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (customersResult.results) {
      customersResult.results.forEach(result => {
        console.log(`      - ${result.file}: ${result.processed} processed, ${result.errors} errors`);
      });
    }

    console.log('\n   🚗 Importing vehicles...');
    const vehiclesResponse = await fetch('http://localhost:3000/api/update-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updateMode: false,  // Fresh import mode
        files: ['vehicles'],
        batchSize: 1000
      })
    });
    
    const vehiclesResult = await vehiclesResponse.json();
    console.log(`   ✅ Vehicles: ${vehiclesResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (vehiclesResult.results) {
      vehiclesResult.results.forEach(result => {
        console.log(`      - ${result.file}: ${result.processed} processed, ${result.errors} errors`);
      });
    }

    console.log('\n   📄 Importing documents...');
    const documentsResponse = await fetch('http://localhost:3000/api/update-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updateMode: false,  // Fresh import mode
        files: ['documents'],
        batchSize: 500
      })
    });
    
    const documentsResult = await documentsResponse.json();
    console.log(`   ✅ Documents: ${documentsResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (documentsResult.results) {
      documentsResult.results.forEach(result => {
        console.log(`      - ${result.file}: ${result.processed} processed, ${result.errors} errors`);
      });
    }

    // Step 3: Fix the dual field issue we discovered
    console.log('\n🔧 Step 3: Fixing vehicle assignments to use only owner_id...');
    
    // Clear customer_id field and ensure only owner_id is used
    const fixResult = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL
    `;
    console.log(`   ✅ Cleared ${fixResult.count || 0} customer_id fields`);

    // Step 4: Validation
    console.log('\n✅ Step 4: Final validation...');
    
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    const stats = finalStats[0];
    const assignmentPercent = Math.round((stats.vehicles_assigned / stats.vehicles) * 100);
    
    console.log(`   📊 Final counts:`);
    console.log(`      - Customers: ${stats.customers}`);
    console.log(`      - Vehicles: ${stats.vehicles} (${stats.vehicles_assigned} assigned - ${assignmentPercent}%)`);
    console.log(`      - Documents: ${stats.documents}`);

    // Check for bulk assignment issues
    const bulkCheck = await sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT owner_id, COUNT(*) as vehicle_count
        FROM vehicles 
        WHERE owner_id IS NOT NULL
        GROUP BY owner_id
        HAVING COUNT(*) > 10
      ) bulk_customers
    `;
    
    if (parseInt(bulkCheck[0].count) > 0) {
      console.log(`   ⚠️  ${bulkCheck[0].count} customers have >10 vehicles (may need review)`);
    } else {
      console.log(`   ✅ No bulk assignment issues detected`);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 SUPER FAST FRESH IMPORT COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`\n🚀 Database is ready for WhatsApp integration!`);

    return {
      success: true,
      stats: stats,
      totalTime: totalTime,
      bulkIssues: parseInt(bulkCheck[0].count)
    };

  } catch (error) {
    console.error('\n❌ SUPER FAST FRESH IMPORT FAILED:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the super fast import
superFastFreshImport()
  .then(result => {
    if (result.success) {
      console.log('\n✅ SUCCESS! Database ready for production use.');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 UNEXPECTED ERROR:', error);
    process.exit(1);
  });
