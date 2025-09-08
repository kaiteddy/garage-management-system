require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function verifyDatabaseState() {
  try {
    console.log('🔍 Verifying current database state...\n');

    // 1. Overall statistics
    const overallStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as vehicles_without_owner
      FROM vehicles
    `;
    
    console.log('1. Overall vehicle statistics:');
    console.log(`   - Total vehicles: ${overallStats[0].total_vehicles}`);
    console.log(`   - With owner: ${overallStats[0].vehicles_with_owner}`);
    console.log(`   - Without owner: ${overallStats[0].vehicles_without_owner}`);

    // 2. Customer distribution
    const customerStats = await sql`
      SELECT 
        vehicle_count,
        COUNT(*) as customers_with_this_count
      FROM (
        SELECT 
          c.id,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id
      ) customer_counts
      WHERE vehicle_count > 0
      GROUP BY vehicle_count
      ORDER BY vehicle_count DESC
      LIMIT 10
    `;
    
    console.log('\n2. Customer vehicle distribution (top counts):');
    customerStats.forEach(stat => {
      console.log(`   - ${stat.customers_with_this_count} customers have ${stat.vehicle_count} vehicle(s)`);
    });

    // 3. Check for problematic customers (>10 vehicles)
    const problematicCustomers = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 10
      ORDER BY COUNT(v.registration) DESC
      LIMIT 5
    `;
    
    console.log('\n3. Customers with >10 vehicles (potentially problematic):');
    if (problematicCustomers.length === 0) {
      console.log('   ✅ No customers found with >10 vehicles');
    } else {
      problematicCustomers.forEach(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        console.log(`   - ${name} (${customer.phone || 'No phone'}): ${customer.vehicle_count} vehicles`);
      });
    }

    // 4. Verify NATANIEL
    const natanielCheck = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      GROUP BY c.id, c.first_name, c.last_name, c.phone
    `;
    
    console.log('\n4. NATANIEL verification:');
    if (natanielCheck.length > 0) {
      const n = natanielCheck[0];
      console.log(`   - ${n.first_name} ${n.last_name} (${n.phone}): ${n.vehicle_count} vehicle(s)`);
      if (n.vehicles) {
        console.log(`   - Vehicles: ${n.vehicles}`);
      }
    } else {
      console.log('   ❌ NATANIEL not found');
    }

    // 5. Summary assessment
    console.log('\n📊 ASSESSMENT:');
    const totalProblematic = problematicCustomers.length;
    if (totalProblematic === 0) {
      console.log('✅ Database appears clean - no customers with excessive vehicle assignments');
    } else {
      console.log(`⚠️  ${totalProblematic} customers still have >10 vehicles - may need cleanup`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyDatabaseState();
