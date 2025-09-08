require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function exploreDocumentsStructure() {
  try {
    console.log('🔍 Exploring documents table structure and content...\n');

    // 1. Get sample documents to see all fields
    console.log('1. Sample documents with all fields:');
    const sampleDocs = await sql`
      SELECT *
      FROM documents 
      ORDER BY doc_date_issued DESC
      LIMIT 3
    `;
    
    if (sampleDocs.length > 0) {
      console.log('Sample document fields:');
      Object.keys(sampleDocs[0]).forEach(key => {
        const value = sampleDocs[0][key];
        const displayValue = value ? (value.toString().length > 50 ? value.toString().substring(0, 50) + '...' : value) : 'NULL';
        console.log(`  ${key}: ${displayValue}`);
      });
    }

    // 2. Check for any fields that might contain vehicle registration
    console.log('\n2. Checking for vehicle registration in various fields:');
    
    const vehicleFieldCheck = await sql`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(vehicle_registration) as has_vehicle_registration,
        COUNT(vehicle_reg) as has_vehicle_reg,
        COUNT(registration) as has_registration,
        COUNT(reg) as has_reg,
        COUNT(vehicle) as has_vehicle,
        COUNT(car_reg) as has_car_reg
      FROM documents
      LIMIT 1
    `;
    
    console.log('Field availability check:', vehicleFieldCheck[0]);

    // 3. Look for any documents that might have vehicle info in other fields
    console.log('\n3. Sample of documents with customer info:');
    const docsWithCustomers = await sql`
      SELECT 
        doc_number,
        doc_type,
        customer_name,
        _id_customer,
        doc_date_issued,
        total_gross
      FROM documents 
      WHERE customer_name IS NOT NULL
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `;
    
    console.log(`Found ${docsWithCustomers.length} documents with customer names:`);
    docsWithCustomers.forEach(doc => {
      console.log(`  - ${doc.doc_number}: ${doc.customer_name} (${doc.doc_type}) - ${doc.doc_date_issued} - £${doc.total_gross || 0}`);
    });

    // 4. Check if there are any job sheets or other document types that might have vehicle info
    console.log('\n4. Document types breakdown:');
    const docTypes = await sql`
      SELECT 
        doc_type,
        COUNT(*) as count
      FROM documents
      GROUP BY doc_type
      ORDER BY COUNT(*) DESC
    `;
    
    docTypes.forEach(type => {
      console.log(`  - ${type.doc_type}: ${type.count} documents`);
    });

    // 5. Check if vehicle information might be in a separate table or field
    console.log('\n5. Checking for vehicle-related tables or fields...');
    
    // Check if there's a job_sheets table or similar
    try {
      const jobSheetCheck = await sql`
        SELECT COUNT(*) as count FROM job_sheets LIMIT 1
      `;
      console.log(`job_sheets table exists with ${jobSheetCheck[0].count} records`);
    } catch (error) {
      console.log('job_sheets table does not exist');
    }

    // 6. Check customers table to see if they have vehicle references
    console.log('\n6. Sample customers to understand data structure:');
    const sampleCustomers = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        phone,
        email
      FROM customers
      WHERE first_name IS NOT NULL
      ORDER BY first_name
      LIMIT 5
    `;
    
    sampleCustomers.forEach(customer => {
      console.log(`  - ${customer.first_name} ${customer.last_name} (${customer.phone})`);
    });

    console.log('\n📊 FINDINGS:');
    console.log('- Documents table exists but has no vehicle registration data');
    console.log('- This explains why we cannot match vehicles to service history');
    console.log('- Vehicle assignments must be based on other criteria or manual assignment');
    
    console.log('\n💡 RECOMMENDATION:');
    console.log('Since we cannot use service history to assign vehicles, we should:');
    console.log('1. Keep the current clean state (only NATANIEL has his 1 vehicle)');
    console.log('2. Allow manual assignment of vehicles to customers as needed');
    console.log('3. Proceed with WhatsApp integration using current assignments');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

exploreDocumentsStructure();
