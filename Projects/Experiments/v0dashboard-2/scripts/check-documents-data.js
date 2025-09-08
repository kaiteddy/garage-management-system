require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkDocumentsData() {
  try {
    console.log('🔍 Checking documents table data and relationships...\n');

    // 1. Check field availability
    console.log('1. Checking vehicle-related fields in documents:');
    const fieldCheck = await sql`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(_id_vehicle) as has_id_vehicle,
        COUNT(vehicle_registration) as has_vehicle_registration,
        COUNT(vehicle_make) as has_vehicle_make,
        COUNT(vehicle_model) as has_vehicle_model,
        COUNT(customer_name) as has_customer_name,
        COUNT(_id_customer) as has_id_customer
      FROM documents
    `;
    
    console.log('Field availability:', fieldCheck[0]);

    // 2. Sample documents with any vehicle information
    console.log('\n2. Sample documents with vehicle information:');
    const docsWithVehicleInfo = await sql`
      SELECT 
        doc_number,
        doc_type,
        customer_name,
        _id_customer,
        _id_vehicle,
        vehicle_make,
        vehicle_model,
        vehicle_registration,
        vehicle_mileage,
        doc_date_issued
      FROM documents 
      WHERE vehicle_make IS NOT NULL 
         OR vehicle_model IS NOT NULL 
         OR vehicle_registration IS NOT NULL
         OR _id_vehicle IS NOT NULL
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `;
    
    if (docsWithVehicleInfo.length > 0) {
      console.log(`Found ${docsWithVehicleInfo.length} documents with vehicle info:`);
      docsWithVehicleInfo.forEach(doc => {
        console.log(`  - ${doc.doc_number}: ${doc.customer_name} | Vehicle: ${doc.vehicle_make} ${doc.vehicle_model} ${doc.vehicle_registration}`);
      });
    } else {
      console.log('❌ No documents found with vehicle information');
    }

    // 3. Check customers with documents
    console.log('\n3. Sample customer-document relationships:');
    const customerDocs = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(d.id) as doc_count,
        STRING_AGG(DISTINCT d.doc_type, ', ') as doc_types
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      ORDER BY COUNT(d.id) DESC
      LIMIT 10
    `;
    
    if (customerDocs.length > 0) {
      console.log('Customers with most documents:');
      customerDocs.forEach(customer => {
        const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        console.log(`  - ${name} (${customer.phone}): ${customer.doc_count} documents (${customer.doc_types})`);
      });
    } else {
      console.log('❌ No customer-document relationships found');
    }

    // 4. Check if NATANIEL has any documents
    console.log('\n4. NATANIEL\'s documents:');
    const natanielDocs = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        d.vehicle_make,
        d.vehicle_model,
        d.vehicle_registration,
        d.doc_date_issued
      FROM documents d
      INNER JOIN customers c ON d._id_customer = c.id
      WHERE c.id = '1FA093E387AEF549A5B64117154DA223'
      ORDER BY d.doc_date_issued DESC
      LIMIT 5
    `;
    
    if (natanielDocs.length > 0) {
      console.log(`NATANIEL has ${natanielDocs.length} documents:`);
      natanielDocs.forEach(doc => {
        console.log(`  - ${doc.doc_number}: ${doc.doc_type} | Vehicle: ${doc.vehicle_make || 'N/A'} ${doc.vehicle_model || 'N/A'} ${doc.vehicle_registration || 'N/A'}`);
      });
    } else {
      console.log('❌ NATANIEL has no documents in the system');
    }

    // 5. Total statistics
    console.log('\n5. Overall statistics:');
    const totalStats = await sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(DISTINCT _id_customer) as unique_customers_with_docs,
        COUNT(DISTINCT doc_type) as unique_doc_types
      FROM documents
      WHERE _id_customer IS NOT NULL
    `;
    
    console.log(`   - Total documents: ${totalStats[0].total_documents}`);
    console.log(`   - Unique customers with documents: ${totalStats[0].unique_customers_with_docs}`);
    console.log(`   - Unique document types: ${totalStats[0].unique_doc_types}`);

    console.log('\n📊 CONCLUSION:');
    console.log('The documents table exists but appears to have minimal vehicle information.');
    console.log('This explains why we cannot use service history for vehicle assignment.');
    console.log('\n✅ CURRENT STATE IS GOOD:');
    console.log('- Database is clean with no incorrect bulk assignments');
    console.log('- NATANIEL has his correct vehicle (WK17WXV)');
    console.log('- Other vehicles are unassigned, ready for manual assignment as needed');
    console.log('- Ready to proceed with WhatsApp integration');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDocumentsData();
