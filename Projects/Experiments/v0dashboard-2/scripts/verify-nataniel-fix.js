require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function verifyNatanielFix() {
  try {
    console.log('🔍 Verifying NATANIEL fix status...\n');

    // Check current database state
    const currentStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both
      FROM vehicles
    `;
    
    console.log('Current database state:', currentStats[0]);
    
    const bothFieldsCount = parseInt(currentStats[0].vehicles_with_both);
    
    if (bothFieldsCount === 0) {
      console.log('✅ Fix appears to be COMPLETE - no vehicles have both fields populated');
      
      // Test NATANIEL's vehicles after fix
      const natanielVehicles = await sql`
        SELECT 
          v.registration, v.make, v.model, v.owner_id, v.customer_id,
          c.first_name || ' ' || c.last_name as owner_name
        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        WHERE v.owner_id = '1FA093E387AEF549A5B64117154DA223'
        ORDER BY v.registration
      `;
      
      console.log(`\nNATANIEL now has ${natanielVehicles.length} vehicles:`);
      natanielVehicles.slice(0, 10).forEach(v => {
        console.log(`  - ${v.registration}: ${v.make || 'Unknown'} ${v.model || ''} (customer_id: ${v.customer_id || 'NULL'})`);
      });
      
      // Check the previously problematic vehicles
      console.log('\nChecking previously problematic vehicles:');
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
          console.log(`  ${v.registration}: Owner = ${v.owner_name || 'Unknown'}, customer_id = ${v.customer_id || 'NULL'}`);
        }
      }
      
    } else {
      console.log(`⏳ Fix still in progress - ${bothFieldsCount} vehicles still have both fields populated`);
    }

  } catch (error) {
    console.error('❌ Error verifying fix:', error);
  }
}

verifyNatanielFix();
