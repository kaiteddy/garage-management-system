require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkNatanielFinalStatus() {
  try {
    console.log('🔍 Checking NATANIEL\'s final status...\n');

    const natanielId = '1FA093E387AEF549A5B64117154DA223';

    // 1. Check current vehicle count
    const currentVehicles = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id = ${natanielId}
    `;
    
    console.log(`NATANIEL currently has ${currentVehicles[0].count} vehicles assigned`);

    // 2. If he still has vehicles, let's remove them manually
    if (parseInt(currentVehicles[0].count) > 0) {
      console.log('\n2. Manually removing all vehicles from NATANIEL...');
      
      const manualRemove = await sql`
        UPDATE vehicles 
        SET owner_id = NULL, updated_at = NOW()
        WHERE owner_id = ${natanielId}
      `;
      
      console.log(`✅ Manually removed ${manualRemove.count || 0} vehicles from NATANIEL`);
    }

    // 3. Final verification
    const finalCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id = ${natanielId}
    `;
    
    console.log(`\nFINAL RESULT: NATANIEL now has ${finalCount[0].count} vehicles`);

    // 4. Check total orphaned vehicles
    const orphanedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id IS NULL
    `;
    
    console.log(`Total orphaned vehicles (no owner): ${orphanedCount[0].count}`);

    if (parseInt(finalCount[0].count) === 0) {
      console.log('\n✅ SUCCESS: NATANIEL now has the correct number of vehicles (0)');
      console.log('The customer record should now show "No vehicles found" or similar');
    } else {
      console.log('\n❌ Still has vehicles assigned - need further investigation');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkNatanielFinalStatus();
