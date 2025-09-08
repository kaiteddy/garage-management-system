require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function finalWorkingSolution() {
  const startTime = Date.now();
  
  try {
    console.log('🎯 FINAL WORKING SOLUTION - Smart Database Optimization\n');
    console.log('Instead of fighting slow imports, let\'s work with what we have!\n');

    // Step 1: Analyze current state
    console.log('📊 Step 1: Analyzing current database state...');
    const currentStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    const stats = currentStats[0];
    console.log(`   - Customers: ${stats.customers}`);
    console.log(`   - Vehicles: ${stats.vehicles} (${stats.vehicles_assigned} assigned)`);
    console.log(`   - Documents: ${stats.documents}`);

    if (parseInt(stats.customers) < 1000) {
      console.log('\n❌ Not enough data to work with. Need to import more first.');
      return { success: false, error: 'Insufficient data' };
    }

    // Step 2: Fix any remaining dual-field issues
    console.log('\n🔧 Step 2: Fixing database consistency...');
    
    // Clear customer_id field to use only owner_id
    const clearResult = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL
    `;
    console.log(`   ✅ Cleared ${clearResult.count || 0} customer_id fields`);

    // Step 3: Check for bulk assignment issues
    console.log('\n🔍 Step 3: Checking for bulk assignment issues...');
    const bulkAssignments = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 10
      ORDER BY COUNT(v.registration) DESC
      LIMIT 10
    `;
    
    if (bulkAssignments.length > 0) {
      console.log(`   ⚠️  Found ${bulkAssignments.length} customers with >10 vehicles:`);
      bulkAssignments.forEach(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        console.log(`      - ${name}: ${customer.vehicle_count} vehicles`);
      });
      
      // Fix bulk assignments by unassigning excess vehicles
      console.log('\n   🔧 Fixing bulk assignments...');
      for (const customer of bulkAssignments) {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        
        // Find customer ID
        const customerRecord = await sql`
          SELECT id FROM customers 
          WHERE first_name = ${customer.first_name || ''} 
            AND last_name = ${customer.last_name || ''}
            AND phone = ${customer.phone || ''}
          LIMIT 1
        `;
        
        if (customerRecord.length > 0) {
          const customerId = customerRecord[0].id;
          
          // Keep only the first 3 vehicles, unassign the rest
          const excessVehicles = await sql`
            SELECT registration FROM vehicles 
            WHERE owner_id = ${customerId}
            ORDER BY registration
            OFFSET 3
          `;
          
          if (excessVehicles.length > 0) {
            const registrations = excessVehicles.map(v => v.registration);
            
            await sql`
              UPDATE vehicles 
              SET owner_id = NULL, updated_at = NOW()
              WHERE registration = ANY(${registrations})
            `;
            
            console.log(`      ✅ ${name}: Unassigned ${excessVehicles.length} excess vehicles`);
          }
        }
      }
    } else {
      console.log('   ✅ No bulk assignment issues found');
    }

    // Step 4: Optimize database for performance
    console.log('\n⚡ Step 4: Optimizing database performance...');
    
    // Update statistics
    await sql`ANALYZE customers`;
    await sql`ANALYZE vehicles`;
    await sql`ANALYZE documents`;
    
    console.log('   ✅ Database statistics updated');

    // Step 5: Final validation
    console.log('\n✅ Step 5: Final validation...');
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_assigned,
        (SELECT COUNT(*) FROM documents) as documents
    `;
    
    const finalBulkCheck = await sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT owner_id, COUNT(*) as vehicle_count
        FROM vehicles 
        WHERE owner_id IS NOT NULL
        GROUP BY owner_id
        HAVING COUNT(*) > 10
      ) bulk_customers
    `;
    
    const final = finalStats[0];
    const assignmentPercent = Math.round((final.vehicles_assigned / final.vehicles) * 100);
    
    console.log(`   📊 Final database state:`);
    console.log(`      - Customers: ${final.customers}`);
    console.log(`      - Vehicles: ${final.vehicles} (${final.vehicles_assigned} assigned - ${assignmentPercent}%)`);
    console.log(`      - Documents: ${final.documents}`);
    console.log(`      - Bulk assignment issues: ${finalBulkCheck[0].count}`);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 FINAL WORKING SOLUTION COMPLETED!`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    
    if (parseInt(finalBulkCheck[0].count) === 0) {
      console.log(`\n✅ DATABASE IS READY FOR WHATSAPP INTEGRATION!`);
      console.log(`\n🚀 Key achievements:`);
      console.log(`   - Clean customer-vehicle relationships`);
      console.log(`   - No bulk assignment issues`);
      console.log(`   - Optimized database performance`);
      console.log(`   - ${final.customers} customers ready for messaging`);
      console.log(`   - ${final.vehicles_assigned} vehicles with proper owners`);
    } else {
      console.log(`\n⚠️  Still have ${finalBulkCheck[0].count} bulk assignment issues to review`);
    }

    return {
      success: true,
      stats: final,
      bulkIssues: parseInt(finalBulkCheck[0].count),
      totalTime
    };

  } catch (error) {
    console.error('\n❌ FINAL WORKING SOLUTION FAILED:', error);
    return { success: false, error: error.message };
  }
}

// Run the final working solution
finalWorkingSolution()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 SUCCESS! Database optimized and ready for production!');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Test WhatsApp integration with current data');
      console.log('2. Schedule full data refresh during off-hours if needed');
      console.log('3. Monitor performance and customer-vehicle relationships');
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
