require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function quickDatabaseAnalysis() {
  try {
    console.log('🔍 Quick analysis of database-wide vehicle assignment issues...\n');

    // 1. Find the most problematic customers (like NATANIEL was)
    console.log('1. Customers with suspiciously high vehicle counts:');
    const problematicCustomers = await sql`
      SELECT 
        c.id,
        c.first_name, 
        c.last_name, 
        c.phone,
        COUNT(v.registration) as vehicle_count,
        -- Count how many of these vehicles have actual service records
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM documents d 
          WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
        ) THEN 1 END) as vehicles_with_services
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 10
      ORDER BY COUNT(v.registration) DESC
      LIMIT 15
    `;
    
    console.log('Top problematic customers:');
    problematicCustomers.forEach(customer => {
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
      const serviceRatio = customer.vehicle_count > 0 ? 
        Math.round((customer.vehicles_with_services / customer.vehicle_count) * 100) : 0;
      console.log(`  - ${name} (${customer.phone || 'No phone'}): ${customer.vehicle_count} vehicles, ${customer.vehicles_with_services} with services (${serviceRatio}%)`);
    });

    // 2. Check total impact
    console.log('\n2. Database-wide impact:');
    const totalStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN vehicle_count > 10 THEN 1 END) as customers_with_10plus_vehicles,
        COUNT(CASE WHEN vehicle_count > 5 THEN 1 END) as customers_with_5plus_vehicles,
        SUM(CASE WHEN vehicle_count > 10 THEN vehicle_count ELSE 0 END) as vehicles_in_10plus_accounts
      FROM (
        SELECT 
          c.id,
          COUNT(v.registration) as vehicle_count
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id
      ) customer_counts
    `;
    
    console.log('Impact analysis:', totalStats[0]);

    // 3. Sample a few customers to see the pattern
    console.log('\n3. Detailed analysis of top 3 problematic customers:');
    
    for (let i = 0; i < Math.min(3, problematicCustomers.length); i++) {
      const customer = problematicCustomers[i];
      const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
      
      console.log(`\n${name} (${customer.phone || 'No phone'}):`);
      
      // Get sample of their vehicles
      const sampleVehicles = await sql`
        SELECT 
          v.registration, 
          v.make, 
          v.model,
          CASE WHEN EXISTS (
            SELECT 1 FROM documents d 
            WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
          ) THEN 'HAS SERVICES' ELSE 'NO SERVICES' END as service_status
        FROM vehicles v
        WHERE v.owner_id = ${customer.id}
        ORDER BY v.registration
        LIMIT 5
      `;
      
      sampleVehicles.forEach(vehicle => {
        console.log(`  - ${vehicle.registration}: ${vehicle.make || 'Unknown'} ${vehicle.model || ''} (${vehicle.service_status})`);
      });
      
      if (customer.vehicle_count > 5) {
        console.log(`  ... and ${customer.vehicle_count - 5} more vehicles`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('- Multiple customers have been incorrectly assigned large numbers of vehicles');
    console.log('- Many of these vehicles have no service history (orphaned data)');
    console.log('- This is the same issue NATANIEL had, but database-wide');
    console.log('\n🔧 RECOMMENDATION:');
    console.log('- Need to clear incorrect assignments and rebuild based on actual service history');
    console.log('- Focus on customers with >10 vehicles first (highest impact)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickDatabaseAnalysis();
