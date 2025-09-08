require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function investigateServiceRecords() {
  try {
    console.log('🔍 Investigating service records and vehicle relationships...\n');

    // 1. Check documents table structure and sample data
    console.log('1. Documents table sample:');
    const documentSample = await sql`
      SELECT 
        doc_number,
        doc_type,
        vehicle_registration,
        customer_name,
        _id_customer,
        doc_date_issued,
        total_gross
      FROM documents 
      WHERE vehicle_registration IS NOT NULL 
        AND vehicle_registration != ''
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `;
    
    console.log(`Found ${documentSample.length} documents with vehicle registrations:`);
    documentSample.forEach(doc => {
      console.log(`  - ${doc.vehicle_registration}: ${doc.customer_name} (${doc.doc_type}) - ${doc.doc_date_issued}`);
    });

    // 2. Check total documents with vehicle registrations
    const totalDocsWithVehicles = await sql`
      SELECT COUNT(*) as count
      FROM documents 
      WHERE vehicle_registration IS NOT NULL 
        AND vehicle_registration != ''
    `;
    
    console.log(`\n2. Total documents with vehicle registrations: ${totalDocsWithVehicles[0].count}`);

    // 3. Check how many of these vehicle registrations exist in vehicles table
    const matchingVehicles = await sql`
      SELECT 
        COUNT(DISTINCT d.vehicle_registration) as unique_registrations_in_docs,
        COUNT(DISTINCT v.registration) as matching_in_vehicles_table
      FROM documents d
      LEFT JOIN vehicles v ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE d.vehicle_registration IS NOT NULL 
        AND d.vehicle_registration != ''
    `;
    
    console.log('\n3. Registration matching:');
    console.log(`   - Unique registrations in documents: ${matchingVehicles[0].unique_registrations_in_docs}`);
    console.log(`   - Matching in vehicles table: ${matchingVehicles[0].matching_in_vehicles_table}`);

    // 4. Sample of documents with customer IDs
    const docsWithCustomers = await sql`
      SELECT 
        d.vehicle_registration,
        d.customer_name,
        d._id_customer,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(*) as service_count
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d.vehicle_registration IS NOT NULL 
        AND d.vehicle_registration != ''
        AND d._id_customer IS NOT NULL
      GROUP BY d.vehicle_registration, d.customer_name, d._id_customer, c.first_name, c.last_name, c.phone
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    
    console.log('\n4. Documents with customer relationships:');
    if (docsWithCustomers.length > 0) {
      console.log('Top vehicle-customer relationships by service count:');
      docsWithCustomers.forEach(doc => {
        const customerName = doc.first_name ? `${doc.first_name} ${doc.last_name}` : doc.customer_name;
        console.log(`  - ${doc.vehicle_registration}: ${customerName} (${doc.service_count} services)`);
      });
    } else {
      console.log('❌ No documents found with valid customer relationships');
    }

    // 5. Check specific examples - try to find vehicles that should have multiple services
    const multiServiceVehicles = await sql`
      SELECT 
        d.vehicle_registration,
        COUNT(d.id) as service_count,
        COUNT(DISTINCT d._id_customer) as different_customers,
        STRING_AGG(DISTINCT d.customer_name, ', ') as customer_names
      FROM documents d
      WHERE d.vehicle_registration IS NOT NULL 
        AND d.vehicle_registration != ''
      GROUP BY d.vehicle_registration
      HAVING COUNT(d.id) >= 2
      ORDER BY COUNT(d.id) DESC
      LIMIT 10
    `;
    
    console.log('\n5. Vehicles with multiple service records:');
    if (multiServiceVehicles.length > 0) {
      multiServiceVehicles.forEach(vehicle => {
        console.log(`  - ${vehicle.vehicle_registration}: ${vehicle.service_count} services, ${vehicle.different_customers} different customers`);
        console.log(`    Customers: ${vehicle.customer_names}`);
      });
    } else {
      console.log('❌ No vehicles found with multiple service records');
    }

    // 6. Check why the intelligent assignment found 0 relationships
    console.log('\n6. Debugging intelligent assignment criteria:');
    const debugQuery = await sql`
      SELECT 
        COUNT(*) as total_docs_with_vehicle_and_customer,
        COUNT(CASE WHEN service_count >= 2 THEN 1 END) as relationships_with_2plus_services
      FROM (
        SELECT 
          d.vehicle_registration,
          d._id_customer,
          COUNT(d.id) as service_count
        FROM documents d
        WHERE d.vehicle_registration IS NOT NULL 
          AND d.vehicle_registration != ''
          AND d._id_customer IS NOT NULL
        GROUP BY d.vehicle_registration, d._id_customer
      ) grouped_services
    `;
    
    console.log(`   - Total vehicle-customer relationships: ${debugQuery[0].total_docs_with_vehicle_and_customer}`);
    console.log(`   - Relationships with 2+ services: ${debugQuery[0].relationships_with_2plus_services}`);

    console.log('\n📊 ANALYSIS:');
    if (parseInt(debugQuery[0].relationships_with_2plus_services) === 0) {
      console.log('❌ Issue found: No vehicle-customer relationships have 2+ services');
      console.log('   This suggests either:');
      console.log('   - Most customers only had 1 service per vehicle');
      console.log('   - Data import issues with customer-document relationships');
      console.log('   - Need to lower the threshold to 1+ services');
    } else {
      console.log('✅ Data looks good for intelligent assignment');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

investigateServiceRecords();
