require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function fixNatanielCorrectAssignment() {
  try {
    console.log('🔧 Fixing NATANIEL\'s incorrect vehicle assignments...\n');

    const natanielId = '1FA093E387AEF549A5B64117154DA223';

    // 1. Show current incorrect state
    const beforeCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id = ${natanielId}
    `;
    
    console.log(`BEFORE: NATANIEL has ${beforeCount[0].count} vehicles assigned (incorrectly)`);

    // 2. Remove all incorrectly assigned vehicles from NATANIEL
    console.log('\n2. Removing all incorrectly assigned vehicles from NATANIEL...');
    
    const removeResult = await sql`
      UPDATE vehicles 
      SET owner_id = NULL, updated_at = NOW()
      WHERE owner_id = ${natanielId}
        AND NOT EXISTS (
          SELECT 1 FROM documents d 
          WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(vehicles.registration, ' ', ''))
            AND EXISTS (
              SELECT 1 FROM customers c 
              WHERE c.id = d._id_customer 
                AND (c.phone = '07894902066' OR c.first_name ILIKE '%nataniel%')
            )
        )
    `;
    
    console.log(`✅ Removed ${removeResult.count || 0} incorrectly assigned vehicles from NATANIEL`);

    // 3. Check if NATANIEL has any REAL vehicles based on service records
    console.log('\n3. Checking for NATANIEL\'s actual vehicles based on service records...');
    
    const realVehicles = await sql`
      SELECT DISTINCT
        d.vehicle_registration,
        v.registration as vehicle_reg,
        v.make,
        v.model,
        COUNT(d.id) as service_count
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      LEFT JOIN vehicles v ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE c.phone = '07894902066' 
         OR c.first_name ILIKE '%nataniel%'
         OR d.customer_name ILIKE '%nataniel%'
      GROUP BY d.vehicle_registration, v.registration, v.make, v.model
      ORDER BY COUNT(d.id) DESC
    `;
    
    if (realVehicles.length > 0) {
      console.log(`Found ${realVehicles.length} actual vehicle(s) for NATANIEL:`);
      
      for (const vehicle of realVehicles) {
        console.log(`  - ${vehicle.vehicle_registration}: ${vehicle.make || 'Unknown'} ${vehicle.model || ''} (${vehicle.service_count} services)`);
        
        // Assign this vehicle to NATANIEL
        if (vehicle.vehicle_reg) {
          const assignResult = await sql`
            UPDATE vehicles 
            SET owner_id = ${natanielId}, updated_at = NOW()
            WHERE registration = ${vehicle.vehicle_reg}
          `;
          console.log(`    ✅ Correctly assigned to NATANIEL`);
        }
      }
    } else {
      console.log('❌ No actual vehicles found for NATANIEL in service records');
    }

    // 4. Final verification
    const afterCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id = ${natanielId}
    `;
    
    console.log(`\nAFTER: NATANIEL now has ${afterCount[0].count} vehicles assigned (correctly)`);

    // 5. Show the vehicles that were unassigned (orphaned)
    const orphanedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id IS NULL
    `;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`- Removed ${removeResult.count || 0} incorrectly assigned vehicles from NATANIEL`);
    console.log(`- NATANIEL now has ${afterCount[0].count} correctly assigned vehicle(s)`);
    console.log(`- ${orphanedCount[0].count} vehicles are now unassigned (need proper owner matching)`);
    
    console.log('\n✅ NATANIEL\'s vehicle assignments have been corrected!');

  } catch (error) {
    console.error('❌ Error fixing assignments:', error);
  }
}

fixNatanielCorrectAssignment();
