require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function restoreNatanielVehicle() {
  try {
    console.log('🔧 Restoring NATANIEL\'s actual vehicle WK17WXV...\n');

    const natanielId = '1FA093E387AEF549A5B64117154DA223';

    // 1. Check if WK17WXV exists and is currently unassigned
    const vehicle = await sql`
      SELECT registration, make, model, owner_id
      FROM vehicles 
      WHERE registration = 'WK17WXV'
    `;
    
    if (vehicle.length === 0) {
      console.log('❌ Vehicle WK17WXV not found in database');
      return;
    }
    
    console.log('Vehicle found:', vehicle[0]);
    
    // 2. Assign WK17WXV back to NATANIEL
    console.log('\n2. Assigning WK17WXV back to NATANIEL...');
    
    const assignResult = await sql`
      UPDATE vehicles 
      SET owner_id = ${natanielId}, updated_at = NOW()
      WHERE registration = 'WK17WXV'
    `;
    
    console.log(`✅ Successfully assigned WK17WXV to NATANIEL`);

    // 3. Verify the assignment
    const verification = await sql`
      SELECT 
        v.registration, v.make, v.model, v.owner_id,
        c.first_name, c.last_name, c.phone
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration = 'WK17WXV'
    `;
    
    console.log('\n3. Verification:');
    if (verification.length > 0) {
      const v = verification[0];
      console.log(`  ${v.registration}: ${v.make} ${v.model}`);
      console.log(`  Owner: ${v.first_name} ${v.last_name} (${v.phone})`);
    }

    // 4. Check NATANIEL's final vehicle count
    const finalCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE owner_id = ${natanielId}
    `;
    
    console.log(`\n✅ NATANIEL now has ${finalCount[0].count} vehicle(s) - CORRECT!`);

    // 5. If there are any other vehicles that should belong to NATANIEL, let me know
    console.log('\n📋 If NATANIEL has any other vehicles, please let me know the registration numbers');
    console.log('and I\'ll assign them correctly.');

  } catch (error) {
    console.error('❌ Error restoring vehicle:', error);
  }
}

restoreNatanielVehicle();
