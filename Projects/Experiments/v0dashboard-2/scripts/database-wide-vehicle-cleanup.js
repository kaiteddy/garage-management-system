require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function databaseWideVehicleCleanup() {
  try {
    console.log('🔧 Starting database-wide customer-vehicle relationship cleanup...\n');

    // 1. Analyze current problematic state
    console.log('1. Analyzing current database state:');
    const currentStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `;
    console.log('Current state:', currentStats[0]);

    // 2. Find customers with suspiciously high vehicle counts (like NATANIEL had)
    console.log('\n2. Finding customers with suspiciously high vehicle counts:');
    const suspiciousCustomers = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 5
      ORDER BY COUNT(v.registration) DESC
      LIMIT 10
    `;
    
    console.log('Customers with >5 vehicles (potentially incorrect):');
    suspiciousCustomers.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      console.log(`  - ${name} (${customer.phone}): ${customer.vehicle_count} vehicles`);
    });

    // 3. Strategy: Remove all vehicle assignments and rebuild based on service history
    console.log('\n3. PHASE 1: Clearing all vehicle assignments to start fresh...');
    
    const clearAllResult = await sql`
      UPDATE vehicles 
      SET owner_id = NULL, updated_at = NOW()
      WHERE owner_id IS NOT NULL
    `;
    
    console.log(`✅ Cleared ${clearAllResult.count || 0} vehicle assignments`);

    // 4. Rebuild assignments based on service history
    console.log('\n4. PHASE 2: Rebuilding assignments based on actual service history...');
    
    // Get all vehicles that have service records
    const vehiclesWithServices = await sql`
      SELECT DISTINCT
        d.vehicle_registration,
        d._id_customer,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(d.id) as service_count,
        MAX(d.doc_date_issued) as last_service
      FROM documents d
      INNER JOIN customers c ON d._id_customer = c.id
      WHERE d.vehicle_registration IS NOT NULL 
        AND d.vehicle_registration != ''
        AND c.id IS NOT NULL
      GROUP BY d.vehicle_registration, d._id_customer, c.first_name, c.last_name, c.phone
      ORDER BY d.vehicle_registration, COUNT(d.id) DESC
    `;
    
    console.log(`Found ${vehiclesWithServices.length} vehicle-customer relationships from service history`);

    // 5. For each vehicle, assign to the customer with the most recent/frequent service
    let assignedCount = 0;
    let processedVehicles = new Set();
    
    console.log('\n5. Assigning vehicles to customers based on service history...');
    
    for (const service of vehiclesWithServices) {
      // Skip if we've already processed this vehicle
      if (processedVehicles.has(service.vehicle_registration)) {
        continue;
      }
      
      // Find the vehicle in the vehicles table
      const vehicleExists = await sql`
        SELECT registration, make, model
        FROM vehicles
        WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${service.vehicle_registration}, ' ', ''))
        LIMIT 1
      `;
      
      if (vehicleExists.length > 0) {
        // Assign this vehicle to the customer with most services
        const assignResult = await sql`
          UPDATE vehicles 
          SET owner_id = ${service._id_customer}, updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${service.vehicle_registration}, ' ', ''))
        `;
        
        if (assignResult.count > 0) {
          assignedCount++;
          processedVehicles.add(service.vehicle_registration);
          
          if (assignedCount <= 10) {
            const customerName = `${service.first_name || ''} ${service.last_name || ''}`.trim();
            console.log(`  ✅ ${service.vehicle_registration} → ${customerName} (${service.service_count} services)`);
          }
        }
      }
    }
    
    console.log(`\n✅ Successfully assigned ${assignedCount} vehicles based on service history`);

    // 6. Handle special cases - manually assign known vehicles like NATANIEL's
    console.log('\n6. Handling special cases...');
    
    // Restore NATANIEL's vehicle if it got unassigned
    const natanielId = '1FA093E387AEF549A5B64117154DA223';
    const natanielVehicleCheck = await sql`
      SELECT registration, owner_id
      FROM vehicles 
      WHERE registration = 'WK17WXV'
    `;
    
    if (natanielVehicleCheck.length > 0 && !natanielVehicleCheck[0].owner_id) {
      await sql`
        UPDATE vehicles 
        SET owner_id = ${natanielId}, updated_at = NOW()
        WHERE registration = 'WK17WXV'
      `;
      console.log('  ✅ Restored NATANIEL\'s vehicle WK17WXV');
    }

    // 7. Final statistics
    console.log('\n7. Final database statistics:');
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as vehicles_without_owner
      FROM vehicles
    `;
    
    console.log('Final state:', finalStats[0]);

    // 8. Show customers with most vehicles (should be more reasonable now)
    const topCustomersAfter = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 0
      ORDER BY COUNT(v.registration) DESC
      LIMIT 10
    `;
    
    console.log('\nTop customers by vehicle count (after cleanup):');
    topCustomersAfter.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      console.log(`  - ${name} (${customer.phone}): ${customer.vehicle_count} vehicles`);
    });

    console.log('\n🎉 DATABASE-WIDE CLEANUP COMPLETED!');
    console.log('\n📊 SUMMARY:');
    console.log(`- Cleared all existing assignments: ${clearAllResult.count || 0} vehicles`);
    console.log(`- Reassigned based on service history: ${assignedCount} vehicles`);
    console.log(`- Vehicles now properly assigned: ${finalStats[0].vehicles_with_owner}`);
    console.log(`- Orphaned vehicles (no service history): ${finalStats[0].vehicles_without_owner}`);
    console.log('\n✅ All customers should now have correct vehicle assignments!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

databaseWideVehicleCleanup();
