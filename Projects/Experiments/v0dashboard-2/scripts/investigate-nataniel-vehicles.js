require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function investigateNatanielVehicles() {
  try {
    console.log('🔍 Investigating NATANIEL\'s vehicle assignments...\n');

    // 1. Get NATANIEL's customer info
    const nataniel = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers 
      WHERE UPPER(first_name) LIKE '%NATANIEL%'
      LIMIT 1
    `;
    
    console.log('NATANIEL customer info:', nataniel[0]);
    const natanielId = nataniel[0].id;

    // 2. Get all vehicles currently assigned to NATANIEL
    const assignedVehicles = await sql`
      SELECT registration, make, model, year, owner_id
      FROM vehicles 
      WHERE owner_id = ${natanielId}
      ORDER BY registration
    `;
    
    console.log(`\nVehicles currently assigned to NATANIEL: ${assignedVehicles.length}`);
    
    // 3. For each vehicle, check if there are documents (service records) that show the REAL owner
    console.log('\nChecking service records to find REAL owners:\n');
    
    for (let i = 0; i < Math.min(assignedVehicles.length, 10); i++) {
      const vehicle = assignedVehicles[i];
      
      // Find documents for this vehicle
      const documents = await sql`
        SELECT DISTINCT
          d.customer_name,
          d._id_customer,
          c.first_name,
          c.last_name,
          c.phone,
          COUNT(*) as service_count
        FROM documents d
        LEFT JOIN customers c ON d._id_customer = c.id
        WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${vehicle.registration}, ' ', ''))
        GROUP BY d.customer_name, d._id_customer, c.first_name, c.last_name, c.phone
        ORDER BY COUNT(*) DESC
      `;
      
      console.log(`${vehicle.registration} (${vehicle.make || 'Unknown'} ${vehicle.model || ''})`);
      
      if (documents.length > 0) {
        console.log('  Service records show real owner(s):');
        documents.forEach(doc => {
          const realOwner = doc.first_name ? `${doc.first_name} ${doc.last_name}` : doc.customer_name;
          console.log(`    - ${realOwner} (${doc.service_count} services) - Phone: ${doc.phone || 'N/A'}`);
        });
      } else {
        console.log('  ❌ No service records found');
      }
      console.log('');
    }

    // 4. Find NATANIEL's actual vehicle by checking his phone number in documents
    console.log('4. Finding NATANIEL\'s ACTUAL vehicle(s) by phone number match:\n');
    
    const natanielPhone = nataniel[0].phone;
    if (natanielPhone) {
      const actualVehicles = await sql`
        SELECT DISTINCT
          d.vehicle_registration,
          v.make,
          v.model,
          v.owner_id,
          COUNT(d.id) as service_count
        FROM documents d
        LEFT JOIN vehicles v ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
        LEFT JOIN customers c ON d._id_customer = c.id
        WHERE c.phone = ${natanielPhone}
          OR d.customer_name ILIKE '%nataniel%'
        GROUP BY d.vehicle_registration, v.make, v.model, v.owner_id
        ORDER BY COUNT(d.id) DESC
      `;
      
      console.log(`NATANIEL's ACTUAL vehicles (based on phone ${natanielPhone}):`);
      actualVehicles.forEach(v => {
        const currentOwner = v.owner_id === natanielId ? 'CORRECTLY ASSIGNED' : 'WRONGLY ASSIGNED';
        console.log(`  - ${v.vehicle_registration}: ${v.make || 'Unknown'} ${v.model || ''} (${v.service_count} services) - ${currentOwner}`);
      });
    }

    // 5. Show summary
    console.log('\n📊 SUMMARY:');
    console.log(`- NATANIEL is currently assigned ${assignedVehicles.length} vehicles`);
    console.log('- Most of these are likely incorrectly assigned during data import');
    console.log('- Need to reassign vehicles based on actual service history/phone numbers');

  } catch (error) {
    console.error('❌ Error investigating:', error);
  }
}

investigateNatanielVehicles();
