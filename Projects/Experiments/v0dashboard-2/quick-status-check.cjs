#!/usr/bin/env node

/**
 * 🔍 QUICK STATUS CHECK
 * Check current database state after import attempts
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🔍 QUICK STATUS CHECK');
console.log('=====================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function quickStatusCheck() {
  try {
    console.log('1️⃣ TESTING DATABASE CONNECTION...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 15000,
      queryTimeoutMillis: 10000
    });
    
    // Test basic connection
    const timeTest = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful');
    console.log('⏰ Database time:', timeTest[0].current_time);
    console.log('');
    
    console.log('2️⃣ CHECKING CURRENT DATA COUNTS...');
    
    // Get current counts
    const [vehicles, customers, documents, lineItems] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`.catch(() => [{ count: 0 }])
    ]);
    
    console.log('📊 Current database counts:');
    console.log(`   🚗 Vehicles: ${vehicles[0].count}`);
    console.log(`   👥 Customers: ${customers[0].count}`);
    console.log(`   📄 Documents: ${documents[0].count}`);
    console.log(`   📋 Line Items: ${lineItems[0].count}`);
    console.log('');
    
    console.log('3️⃣ CHECKING RELATIONSHIPS...');
    
    // Check vehicle-customer relationships
    const vehicleCustomerLinks = await sql`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE customer_id IS NOT NULL AND customer_id != ''
    `;
    
    // Check document-customer relationships
    const documentCustomerLinks = await sql`
      SELECT COUNT(*) as count 
      FROM customer_documents 
      WHERE customer_id IS NOT NULL AND customer_id != ''
    `;
    
    console.log('🔗 Relationship status:');
    console.log(`   🚗→👥 Vehicles with customers: ${vehicleCustomerLinks[0].count}`);
    console.log(`   📄→👥 Documents with customers: ${documentCustomerLinks[0].count}`);
    console.log('');
    
    console.log('4️⃣ CHECKING CUSTOMER DATA QUALITY...');
    
    // Check customer data quality
    const customerQuality = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email NOT LIKE '%@placeholder.com' THEN 1 END) as real_emails,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' AND first_name != 'Unknown' THEN 1 END) as real_names
      FROM customers
    `;
    
    const cq = customerQuality[0];
    console.log('👥 Customer data quality:');
    console.log(`   📊 Total customers: ${cq.total}`);
    console.log(`   📧 Real emails: ${cq.real_emails} (${((cq.real_emails/cq.total)*100).toFixed(1)}%)`);
    console.log(`   📱 With phone: ${cq.with_phone} (${((cq.with_phone/cq.total)*100).toFixed(1)}%)`);
    console.log(`   👤 Real names: ${cq.real_names} (${((cq.real_names/cq.total)*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('5️⃣ CHECKING RECENT ACTIVITY...');
    
    // Check recent records
    const recentCustomers = await sql`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE created_at > NOW() - INTERVAL '2 hours'
    `;
    
    const recentVehicleUpdates = await sql`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE updated_at > NOW() - INTERVAL '2 hours'
    `;
    
    const recentDocuments = await sql`
      SELECT COUNT(*) as count 
      FROM customer_documents 
      WHERE created_at > NOW() - INTERVAL '2 hours'
    `;
    
    console.log('🕐 Recent activity (last 2 hours):');
    console.log(`   👥 New customers: ${recentCustomers[0].count}`);
    console.log(`   🚗 Updated vehicles: ${recentVehicleUpdates[0].count}`);
    console.log(`   📄 New documents: ${recentDocuments[0].count}`);
    console.log('');
    
    console.log('6️⃣ SAMPLE DATA CHECK...');
    
    // Sample recent customers
    const sampleCustomers = await sql`
      SELECT first_name, last_name, email, phone
      FROM customers 
      WHERE created_at > NOW() - INTERVAL '2 hours'
      AND first_name IS NOT NULL 
      AND first_name != 'Unknown'
      LIMIT 5
    `;
    
    console.log('👥 Sample recent customers:');
    sampleCustomers.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.first_name} ${c.last_name} - ${c.email || 'No email'} (${c.phone || 'No phone'})`);
    });
    console.log('');
    
    // Sample vehicles with customer links
    const sampleVehicles = await sql`
      SELECT v.registration, v.make, v.model, v.customer_id, c.first_name, c.last_name
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.customer_id IS NOT NULL
      LIMIT 5
    `;
    
    console.log('🚗 Sample vehicles with customer links:');
    sampleVehicles.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.registration} - ${v.make} ${v.model} → ${v.first_name || 'Unknown'} ${v.last_name || ''}`);
    });
    console.log('');
    
    console.log('7️⃣ STATUS SUMMARY...');
    console.log('====================');
    
    // Calculate improvements
    const vehicleImprovement = vehicleCustomerLinks[0].count > 0 ? 'IMPROVED' : 'NO CHANGE';
    const customerImprovement = cq.real_emails > 500 ? 'SIGNIFICANTLY IMPROVED' : cq.real_emails > 100 ? 'IMPROVED' : 'MINIMAL CHANGE';
    
    console.log('📈 IMPORT IMPACT ASSESSMENT:');
    console.log(`   🚗 Vehicle-Customer Links: ${vehicleImprovement}`);
    console.log(`   👥 Customer Data Quality: ${customerImprovement}`);
    console.log(`   📄 Document Count: ${documents[0].count > 5000 ? 'INCREASED' : 'STABLE'}`);
    console.log('');
    
    if (vehicleCustomerLinks[0].count > 1000) {
      console.log('🎉 SUCCESS: Vehicle-customer relationships established!');
    }
    
    if (cq.real_emails > 1000) {
      console.log('🎉 SUCCESS: Customer database significantly improved!');
    }
    
    if (recentCustomers[0].count > 1000) {
      console.log('🎉 SUCCESS: Major customer import completed recently!');
    }
    
    console.log('');
    console.log('✅ STATUS CHECK COMPLETE');
    console.log('========================');
    
  } catch (error) {
    console.log('❌ STATUS CHECK FAILED:', error.message);
    console.log('💡 Database may still be recovering from import operations');
  }
}

quickStatusCheck();
