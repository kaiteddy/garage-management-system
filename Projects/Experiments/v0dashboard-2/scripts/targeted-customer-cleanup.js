require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function targetedCustomerCleanup() {
  try {
    console.log('🎯 Targeted cleanup of customers with excessive vehicle assignments...\n');

    // 1. Find customers with >20 vehicles (clearly problematic like NATANIEL was)
    const problematicCustomers = await sql`
      SELECT 
        c.id,
        c.first_name, 
        c.last_name, 
        c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 20
      ORDER BY COUNT(v.registration) DESC
      LIMIT 10
    `;
    
    console.log(`Found ${problematicCustomers.length} customers with >20 vehicles:`);
    problematicCustomers.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
      console.log(`  - ${name} (${customer.phone || 'No phone'}): ${customer.vehicle_count} vehicles`);
    });

    if (problematicCustomers.length === 0) {
      console.log('✅ No customers found with >20 vehicles - database appears clean!');
      
      // Check for customers with >10 vehicles instead
      const moderatelyProblematic = await sql`
        SELECT 
          c.id,
          c.first_name, 
          c.last_name, 
          c.phone,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id, c.first_name, c.last_name, c.phone
        HAVING COUNT(v.registration) > 10
        ORDER BY COUNT(v.registration) DESC
        LIMIT 5
      `;
      
      if (moderatelyProblematic.length > 0) {
        console.log(`\nFound ${moderatelyProblematic.length} customers with >10 vehicles:`);
        moderatelyProblematic.forEach(customer => {
          const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
          console.log(`  - ${name} (${customer.phone || 'No phone'}): ${customer.vehicle_count} vehicles`);
        });
      } else {
        console.log('✅ No customers found with >10 vehicles either - excellent!');
      }
      
      return;
    }

    // 2. For each problematic customer, check how many vehicles actually have service records
    console.log('\n2. Analyzing service history for problematic customers:');
    
    for (const customer of problematicCustomers.slice(0, 5)) { // Process top 5
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
      console.log(`\n${name} (${customer.vehicle_count} vehicles):`);
      
      // Check which vehicles have actual service records
      const vehicleAnalysis = await sql`
        SELECT 
          v.registration,
          v.make,
          v.model,
          CASE WHEN EXISTS (
            SELECT 1 FROM documents d 
            WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
              AND d._id_customer = ${customer.id}
          ) THEN 'CUSTOMER_SERVICES' 
          WHEN EXISTS (
            SELECT 1 FROM documents d 
            WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
          ) THEN 'OTHER_CUSTOMER_SERVICES'
          ELSE 'NO_SERVICES' END as service_status
        FROM vehicles v
        WHERE v.owner_id = ${customer.id}
        ORDER BY v.registration
      `;
      
      const customerServices = vehicleAnalysis.filter(v => v.service_status === 'CUSTOMER_SERVICES').length;
      const otherServices = vehicleAnalysis.filter(v => v.service_status === 'OTHER_CUSTOMER_SERVICES').length;
      const noServices = vehicleAnalysis.filter(v => v.service_status === 'NO_SERVICES').length;
      
      console.log(`  - ${customerServices} vehicles with services for this customer`);
      console.log(`  - ${otherServices} vehicles with services for OTHER customers`);
      console.log(`  - ${noServices} vehicles with NO services at all`);
      
      // If most vehicles don't belong to this customer, clean them up
      if (customerServices < (customer.vehicle_count * 0.1)) { // Less than 10% are actually theirs
        console.log(`  🔧 Cleaning up ${customer.vehicle_count - customerServices} incorrectly assigned vehicles...`);
        
        // Remove vehicles that don't have services for this customer
        const cleanupResult = await sql`
          UPDATE vehicles 
          SET owner_id = NULL, updated_at = NOW()
          WHERE owner_id = ${customer.id}
            AND NOT EXISTS (
              SELECT 1 FROM documents d 
              WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(vehicles.registration, ' ', ''))
                AND d._id_customer = ${customer.id}
            )
        `;
        
        console.log(`  ✅ Removed ${cleanupResult.count || 0} incorrectly assigned vehicles`);
      }
    }

    // 3. Final verification
    console.log('\n3. Final verification:');
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN vehicle_count > 20 THEN 1 END) as customers_with_20plus,
        COUNT(CASE WHEN vehicle_count > 10 THEN 1 END) as customers_with_10plus,
        COUNT(CASE WHEN vehicle_count > 5 THEN 1 END) as customers_with_5plus
      FROM (
        SELECT 
          c.id,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id
      ) customer_counts
    `;
    
    console.log('Final statistics:', finalStats[0]);

    // 4. Verify NATANIEL still has his vehicle
    const natanielCheck = await sql`
      SELECT 
        c.first_name, c.last_name,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      GROUP BY c.id, c.first_name, c.last_name
    `;
    
    if (natanielCheck.length > 0) {
      console.log(`\n✅ NATANIEL verification: ${natanielCheck[0].vehicle_count} vehicle(s) - ${natanielCheck[0].vehicles || 'None'}`);
    }

    console.log('\n🎉 Targeted cleanup completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

targetedCustomerCleanup();
