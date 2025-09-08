require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function monitorCurrentImport() {
  try {
    console.log('📊 Monitoring current import progress...\n');

    // 1. Check current database state
    const currentStats = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_customers,
        COUNT(CASE WHEN email LIKE '%placeholder.com' THEN 1 END) as placeholder_emails
      FROM customers
    `;
    
    console.log('📈 Customer Import Progress:');
    console.log(`   - Total customers in DB: ${currentStats[0].total_customers}`);
    console.log(`   - Recently added (last hour): ${currentStats[0].recent_customers}`);
    console.log(`   - Placeholder emails: ${currentStats[0].placeholder_emails}`);

    // 2. Check vehicle state
    const vehicleStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as unassigned_vehicles,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_vehicles
      FROM vehicles
    `;
    
    console.log('\n🚗 Vehicle Import Status:');
    console.log(`   - Total vehicles in DB: ${vehicleStats[0].total_vehicles}`);
    console.log(`   - With owner assigned: ${vehicleStats[0].vehicles_with_owner}`);
    console.log(`   - Unassigned: ${vehicleStats[0].unassigned_vehicles}`);
    console.log(`   - Recently added: ${vehicleStats[0].recent_vehicles}`);

    // 3. Check document state
    const documentStats = await sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_documents
      FROM documents
    `;
    
    console.log('\n📄 Document Import Status:');
    console.log(`   - Total documents in DB: ${documentStats[0].total_documents}`);
    console.log(`   - Recently added: ${documentStats[0].recent_documents}`);

    // 4. Check NATANIEL's status
    const natanielStatus = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone, c.email,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
    `;
    
    console.log('\n👤 NATANIEL Status Check:');
    if (natanielStatus.length > 0) {
      const n = natanielStatus[0];
      console.log(`   - Name: ${n.first_name} ${n.last_name}`);
      console.log(`   - Phone: ${n.phone}`);
      console.log(`   - Email: ${n.email}`);
      console.log(`   - Vehicles: ${n.vehicle_count} (${n.vehicles || 'None'})`);
      
      if (parseInt(n.vehicle_count) === 1 && n.vehicles === 'WK17WXV') {
        console.log('   ✅ NATANIEL status is CORRECT');
      } else {
        console.log('   ⚠️  NATANIEL status needs attention');
      }
    } else {
      console.log('   ❌ NATANIEL not found');
    }

    // 5. Check for any problematic bulk assignments
    const bulkAssignments = await sql`
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
    
    console.log('\n⚠️  Bulk Assignment Check:');
    if (bulkAssignments.length > 0) {
      console.log('   Customers with >10 vehicles (potential issues):');
      bulkAssignments.forEach(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        console.log(`   - ${name}: ${customer.vehicle_count} vehicles`);
      });
    } else {
      console.log('   ✅ No bulk assignment issues detected');
    }

    // 6. Performance metrics
    const performanceCheck = await sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE tablename IN ('customers', 'vehicles', 'documents')
      ORDER BY tablename
    `;
    
    console.log('\n⚡ Performance Metrics:');
    performanceCheck.forEach(table => {
      console.log(`   ${table.tablename}: ${table.inserts} inserts, ${table.updates} updates`);
    });

    // 7. Import progress estimation
    const expectedTotals = {
      customers: 7137,
      vehicles: 10541,
      documents: 33171
    };
    
    console.log('\n📊 Import Progress Estimation:');
    const customerProgress = Math.min(100, Math.round((currentStats[0].total_customers / expectedTotals.customers) * 100));
    const vehicleProgress = Math.min(100, Math.round((vehicleStats[0].total_vehicles / expectedTotals.vehicles) * 100));
    const documentProgress = Math.min(100, Math.round((documentStats[0].total_documents / expectedTotals.documents) * 100));
    
    console.log(`   - Customers: ${customerProgress}% (${currentStats[0].total_customers}/${expectedTotals.customers})`);
    console.log(`   - Vehicles: ${vehicleProgress}% (${vehicleStats[0].total_vehicles}/${expectedTotals.vehicles})`);
    console.log(`   - Documents: ${documentProgress}% (${documentStats[0].total_documents}/${expectedTotals.documents})`);

    // 8. Learning insights
    console.log('\n🧠 Learning Insights:');
    
    if (parseInt(currentStats[0].recent_customers) > 0) {
      console.log('   ✅ Customer import is actively running');
    } else {
      console.log('   ⏸️  Customer import may have completed or stalled');
    }
    
    if (parseInt(vehicleStats[0].recent_vehicles) > 0) {
      console.log('   ✅ Vehicle import is actively running');
    } else if (vehicleProgress < 100) {
      console.log('   ⏳ Vehicle import not yet started');
    }
    
    if (parseInt(documentStats[0].recent_documents) > 0) {
      console.log('   ✅ Document import is actively running');
    } else if (documentProgress < 100) {
      console.log('   ⏳ Document import not yet started');
    }

    return {
      customerProgress,
      vehicleProgress, 
      documentProgress,
      issues: bulkAssignments.length > 0,
      natanielOk: natanielStatus.length > 0 && parseInt(natanielStatus[0].vehicle_count) === 1
    };

  } catch (error) {
    console.error('❌ Error monitoring import:', error);
    return null;
  }
}

// Run monitoring
monitorCurrentImport()
  .then(result => {
    if (result) {
      console.log('\n📋 Monitoring completed successfully');
    }
  })
  .catch(console.error);
