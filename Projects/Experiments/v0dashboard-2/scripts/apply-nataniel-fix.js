require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function applyNatanielFix() {
  try {
    console.log('🔧 Applying NATANIEL customer-vehicle connection fix...\n');

    // Step 1: Show current problematic state
    console.log('1. Current problematic state:');
    const beforeStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `;
    console.log('Before fix:', beforeStats[0]);

    // Step 2: Copy customer_id to owner_id where owner_id is null
    console.log('\n2. Copying customer_id to owner_id where missing...');
    const fixStep1 = await sql`
      UPDATE vehicles 
      SET owner_id = customer_id, updated_at = NOW()
      WHERE owner_id IS NULL AND customer_id IS NOT NULL
    `;
    console.log(`✅ Fixed ${fixStep1.count || 0} vehicles by copying customer_id to owner_id`);

    // Step 3: Clear customer_id field to standardize on owner_id
    console.log('\n3. Clearing customer_id fields to standardize on owner_id...');
    const fixStep2 = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL
    `;
    console.log(`✅ Cleared ${fixStep2.count || 0} customer_id fields`);

    // Step 4: Show final state
    console.log('\n4. Final state after fix:');
    const afterStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `;
    console.log('After fix:', afterStats[0]);

    // Step 5: Verify NATANIEL's vehicles after fix
    console.log('\n5. NATANIEL\'s vehicles after fix:');
    const natanielVehicles = await sql`
      SELECT 
        v.registration, v.make, v.model, v.owner_id,
        c.first_name || ' ' || c.last_name as owner_name
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.owner_id = '1FA093E387AEF549A5B64117154DA223'
      ORDER BY v.registration
    `;
    console.log(`NATANIEL now has ${natanielVehicles.length} vehicles (should be his actual vehicles only):`);
    natanielVehicles.slice(0, 5).forEach(v => {
      console.log(`  - ${v.registration}: ${v.make} ${v.model}`);
    });

    // Step 6: Check specific problematic vehicles
    console.log('\n6. Checking previously problematic vehicles:');
    const problematicVehicles = ['EX18UXJ', 'WK17WXV', 'L10FTX'];
    
    for (const reg of problematicVehicles) {
      const vehicle = await sql`
        SELECT 
          v.registration, v.make, v.model, v.owner_id, v.customer_id,
          c.first_name || ' ' || c.last_name as owner_name
        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        WHERE v.registration = ${reg}
      `;
      
      if (vehicle.length > 0) {
        const v = vehicle[0];
        console.log(`  ${v.registration}: Now owned by ${v.owner_name || 'Unknown'} (owner_id: ${v.owner_id}, customer_id: ${v.customer_id})`);
      }
    }

    console.log('\n✅ NATANIEL customer-vehicle connection fix completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Fixed ${fixStep1.count || 0} vehicles by copying customer_id to owner_id`);
    console.log(`- Cleared ${fixStep2.count || 0} customer_id fields to eliminate confusion`);
    console.log('- All API queries now use only owner_id for consistent results');
    console.log('- NATANIEL should now only see his actual vehicles');

  } catch (error) {
    console.error('❌ Error applying fix:', error);
  }
}

applyNatanielFix();
