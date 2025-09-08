require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkSpecificVehicles() {
  try {
    console.log('🔍 Checking specific vehicles from screenshots...\n');

    const vehicles = ['EX18UXJ', 'WK17WXV', 'LK21UVD'];

    for (const reg of vehicles) {
      console.log(`${reg}:`);
      
      // Check current owner assignment
      const vehicle = await sql`
        SELECT 
          v.registration, v.make, v.model, v.owner_id,
          c.first_name, c.last_name, c.phone
        FROM vehicles v
        LEFT JOIN customers c ON v.owner_id = c.id
        WHERE v.registration = ${reg}
      `;
      
      if (vehicle.length > 0) {
        const v = vehicle[0];
        const owner = v.first_name ? `${v.first_name} ${v.last_name} (${v.phone})` : 'UNASSIGNED';
        console.log(`  Current owner: ${owner}`);
        console.log(`  Vehicle: ${v.make} ${v.model}`);
      } else {
        console.log(`  ❌ Vehicle not found in database`);
      }
      
      // Check service history to find real owner
      const serviceHistory = await sql`
        SELECT DISTINCT
          d.customer_name,
          c.first_name,
          c.last_name,
          c.phone,
          COUNT(*) as service_count
        FROM documents d
        LEFT JOIN customers c ON d._id_customer = c.id
        WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${reg}, ' ', ''))
        GROUP BY d.customer_name, c.first_name, c.last_name, c.phone
        ORDER BY COUNT(*) DESC
      `;
      
      if (serviceHistory.length > 0) {
        console.log(`  Service history shows real owner(s):`);
        serviceHistory.forEach(owner => {
          const name = owner.first_name ? `${owner.first_name} ${owner.last_name}` : owner.customer_name;
          console.log(`    - ${name} (${owner.service_count} services) - Phone: ${owner.phone || 'N/A'}`);
        });
      } else {
        console.log(`  ❌ No service history found`);
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSpecificVehicles();
