require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function intelligentVehicleAssignment() {
  try {
    console.log('🧠 Intelligent vehicle assignment based on service history...\n');

    // 1. Current state
    const currentStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as orphaned_vehicles
      FROM vehicles
    `;
    
    console.log('1. Current state:');
    console.log(`   - Total vehicles: ${currentStats[0].total_vehicles}`);
    console.log(`   - With owner: ${currentStats[0].vehicles_with_owner}`);
    console.log(`   - Orphaned: ${currentStats[0].orphaned_vehicles}`);

    // 2. Find vehicles that have clear service history indicating real ownership
    console.log('\n2. Analyzing service history to identify legitimate vehicle ownership...');
    
    const vehicleServiceAnalysis = await sql`
      SELECT 
        d.vehicle_registration,
        d._id_customer,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(d.id) as service_count,
        MIN(d.doc_date_issued) as first_service,
        MAX(d.doc_date_issued) as last_service,
        -- Check if vehicle exists in vehicles table
        v.registration as vehicle_exists,
        v.owner_id as current_owner
      FROM documents d
      INNER JOIN customers c ON d._id_customer = c.id
      LEFT JOIN vehicles v ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE d.vehicle_registration IS NOT NULL 
        AND d.vehicle_registration != ''
        AND c.id IS NOT NULL
      GROUP BY d.vehicle_registration, d._id_customer, c.first_name, c.last_name, c.phone, v.registration, v.owner_id
      HAVING COUNT(d.id) >= 2  -- At least 2 services to indicate real ownership
      ORDER BY d.vehicle_registration, COUNT(d.id) DESC
    `;
    
    console.log(`Found ${vehicleServiceAnalysis.length} vehicle-customer relationships with 2+ services`);

    // 3. Group by vehicle to handle cases where multiple customers serviced the same vehicle
    const vehicleOwnership = new Map();
    
    vehicleServiceAnalysis.forEach(record => {
      const reg = record.vehicle_registration;
      if (!vehicleOwnership.has(reg)) {
        vehicleOwnership.set(reg, []);
      }
      vehicleOwnership.get(reg).push(record);
    });

    console.log(`\n3. Processing ${vehicleOwnership.size} unique vehicles with service history...`);

    let assignedCount = 0;
    let multipleOwnerCases = 0;

    // 4. Assign vehicles to customers based on service history
    for (const [registration, owners] of vehicleOwnership) {
      // Sort by service count (most services first) and recency
      owners.sort((a, b) => {
        if (b.service_count !== a.service_count) {
          return b.service_count - a.service_count;
        }
        return new Date(b.last_service) - new Date(a.last_service);
      });

      const primaryOwner = owners[0];
      
      // Check if vehicle exists in vehicles table
      if (primaryOwner.vehicle_exists) {
        // Assign to the customer with most/recent services
        const assignResult = await sql`
          UPDATE vehicles 
          SET owner_id = ${primaryOwner._id_customer}, updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
        `;
        
        if (assignResult.count > 0) {
          assignedCount++;
          
          if (assignedCount <= 10) {
            const customerName = `${primaryOwner.first_name || ''} ${primaryOwner.last_name || ''}`.trim();
            console.log(`  ✅ ${registration} → ${customerName} (${primaryOwner.service_count} services)`);
          }
        }

        // Log if multiple customers serviced this vehicle
        if (owners.length > 1) {
          multipleOwnerCases++;
          if (multipleOwnerCases <= 5) {
            console.log(`    ⚠️  ${registration} also serviced by ${owners.length - 1} other customer(s)`);
          }
        }
      }
    }

    console.log(`\n✅ Assigned ${assignedCount} vehicles based on service history`);
    console.log(`⚠️  ${multipleOwnerCases} vehicles had multiple potential owners (assigned to most frequent)`);

    // 5. Check for customers who now legitimately have multiple vehicles
    console.log('\n4. Customers with multiple vehicles (legitimate ownership):');
    
    const multiVehicleCustomers = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration || ' (' || COALESCE(v.make, 'Unknown') || ')', ', ' ORDER BY v.registration) as vehicles
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 1
      ORDER BY COUNT(v.registration) DESC
      LIMIT 10
    `;
    
    if (multiVehicleCustomers.length > 0) {
      console.log('Customers with multiple vehicles:');
      multiVehicleCustomers.forEach(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        console.log(`  - ${name} (${customer.phone || 'No phone'}): ${customer.vehicle_count} vehicles`);
        console.log(`    ${customer.vehicles}`);
      });
    } else {
      console.log('No customers currently have multiple vehicles');
    }

    // 6. Final statistics
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as orphaned_vehicles
      FROM vehicles
    `;
    
    console.log('\n5. Final statistics:');
    console.log(`   - Total vehicles: ${finalStats[0].total_vehicles}`);
    console.log(`   - With owner: ${finalStats[0].vehicles_with_owner}`);
    console.log(`   - Still orphaned: ${finalStats[0].orphaned_vehicles}`);

    // 7. Verify NATANIEL still has his vehicle
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
    
    console.log('\n6. NATANIEL verification:');
    if (natanielCheck.length > 0) {
      const n = natanielCheck[0];
      console.log(`   ✅ ${n.first_name} ${n.last_name}: ${n.vehicle_count} vehicle(s) - ${n.vehicles || 'None'}`);
    }

    console.log('\n🎉 Intelligent vehicle assignment completed!');
    console.log('\n📋 SUMMARY:');
    console.log(`- Assigned ${assignedCount} vehicles based on service history`);
    console.log(`- Customers can now legitimately have multiple vehicles`);
    console.log(`- Only vehicles with 2+ service records were assigned`);
    console.log(`- ${finalStats[0].orphaned_vehicles} vehicles remain unassigned (no clear service history)`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

intelligentVehicleAssignment();
