require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

// Use your Neon database connection string
const sql = neon(process.env.DATABASE_URL);

async function testNatanielConnections() {
  try {
    console.log('🔍 Testing NATANIEL customer-vehicle connections...\n');

    // 1. Find NATANIEL customer(s)
    console.log('1. Finding NATANIEL customer records:');
    const natanielCustomers = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers
      WHERE UPPER(first_name) LIKE '%NATANIEL%'
      OR UPPER(last_name) LIKE '%NATANIEL%'
      LIMIT 5
    `;
    console.log('NATANIEL customers found:', natanielCustomers);

    if (natanielCustomers.length === 0) {
      console.log('❌ No NATANIEL customers found');
      return;
    }

    const natanielId = natanielCustomers[0].id;
    console.log(`\n2. Checking vehicles for NATANIEL (ID: ${natanielId}):`);

    // 2. Check vehicles using owner_id only
    const vehiclesOwnerOnly = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles
      WHERE owner_id = ${natanielId}
      ORDER BY registration
    `;
    console.log('Vehicles via owner_id:', vehiclesOwnerOnly);

    // 3. Check vehicles using customer_id only
    const vehiclesCustomerOnly = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles
      WHERE customer_id = ${natanielId}
      ORDER BY registration
    `;
    console.log('Vehicles via customer_id:', vehiclesCustomerOnly);

    // 4. Check vehicles using OR condition (current problematic query)
    const vehiclesOldWay = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles
      WHERE owner_id = ${natanielId} OR customer_id = ${natanielId}
      ORDER BY registration
    `;
    console.log('Vehicles via OR condition (problematic):', vehiclesOldWay);

    // 5. Show database statistics
    console.log('\n3. Database statistics:');
    const stats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `;
    console.log('Vehicle connection statistics:', stats[0]);

    // 6. Show sample of problematic data
    console.log('\n4. Sample of vehicles with both owner_id and customer_id:');
    const problematicVehicles = await sql`
      SELECT registration, make, model, owner_id, customer_id
      FROM vehicles
      WHERE owner_id IS NOT NULL AND customer_id IS NOT NULL
      LIMIT 5
    `;
    console.log('Vehicles with both fields:', problematicVehicles);

  } catch (error) {
    console.error('❌ Error testing connections:', error);
  }
}

testNatanielConnections();
