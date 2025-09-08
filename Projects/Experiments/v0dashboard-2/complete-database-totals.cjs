#!/usr/bin/env node

/**
 * 📊 COMPLETE DATABASE TOTALS
 * Get comprehensive counts of all data in the system
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('📊 COMPLETE DATABASE TOTALS');
console.log('============================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function getCompleteTotals() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 60000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ GETTING COMPREHENSIVE COUNTS...');
    console.log('===================================');
    
    // Core data counts
    const [
      vehicles,
      customers, 
      documents,
      lineItems,
      receipts,
      appointments,
      reminders,
      stock
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM receipts`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM appointments`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM reminders`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM stock`.catch(() => [{ count: 0 }])
    ]);
    
    console.log('📋 CORE DATA TOTALS:');
    console.log(`   🚗 Vehicles: ${vehicles[0].count.toLocaleString()}`);
    console.log(`   👥 Customers: ${customers[0].count.toLocaleString()}`);
    console.log(`   📄 Documents: ${documents[0].count.toLocaleString()}`);
    console.log(`   📋 Line Items: ${lineItems[0].count.toLocaleString()}`);
    console.log(`   🧾 Receipts: ${receipts[0].count.toLocaleString()}`);
    console.log(`   📅 Appointments: ${appointments[0].count.toLocaleString()}`);
    console.log(`   🔔 Reminders: ${reminders[0].count.toLocaleString()}`);
    console.log(`   📦 Stock: ${stock[0].count.toLocaleString()}`);
    console.log('');
    
    // Relationship counts
    console.log('3️⃣ RELATIONSHIP ANALYSIS...');
    console.log('============================');
    
    const [
      vehiclesWithCustomers,
      documentsWithCustomers,
      lineItemsWithDocuments,
      receiptsWithDocuments
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL AND customer_id != ''`,
      sql`SELECT COUNT(*) as count FROM customer_documents WHERE customer_id IS NOT NULL AND customer_id != ''`,
      sql`SELECT COUNT(*) as count FROM document_line_items WHERE document_id IS NOT NULL AND document_id != ''`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM receipts WHERE document_id IS NOT NULL AND document_id != ''`.catch(() => [{ count: 0 }])
    ]);
    
    console.log('🔗 RELATIONSHIP TOTALS:');
    console.log(`   🚗→👥 Vehicles linked to customers: ${vehiclesWithCustomers[0].count.toLocaleString()}`);
    console.log(`   📄→👥 Documents linked to customers: ${documentsWithCustomers[0].count.toLocaleString()}`);
    console.log(`   📋→📄 Line items linked to documents: ${lineItemsWithDocuments[0].count.toLocaleString()}`);
    console.log(`   🧾→📄 Receipts linked to documents: ${receiptsWithDocuments[0].count.toLocaleString()}`);
    console.log('');
    
    // Calculate percentages
    const vehicleLinkageRate = Math.round((vehiclesWithCustomers[0].count / vehicles[0].count) * 100);
    const documentLinkageRate = Math.round((documentsWithCustomers[0].count / documents[0].count) * 100);
    
    console.log('📊 LINKAGE RATES:');
    console.log(`   🚗 Vehicle-Customer linkage: ${vehicleLinkageRate}%`);
    console.log(`   📄 Document-Customer linkage: ${documentLinkageRate}%`);
    console.log('');
    
    // Data quality analysis
    console.log('4️⃣ DATA QUALITY ANALYSIS...');
    console.log('============================');
    
    const customerQuality = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email NOT LIKE '%@placeholder.com' THEN 1 END) as real_emails,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' AND first_name != 'Unknown' THEN 1 END) as real_names,
        COUNT(CASE WHEN company IS NOT NULL AND company != '' THEN 1 END) as with_company
      FROM customers
    `;
    
    const cq = customerQuality[0];
    console.log('👥 CUSTOMER DATA QUALITY:');
    console.log(`   📧 Real emails: ${cq.real_emails.toLocaleString()} (${Math.round((cq.real_emails/cq.total)*100)}%)`);
    console.log(`   📱 Phone numbers: ${cq.with_phone.toLocaleString()} (${Math.round((cq.with_phone/cq.total)*100)}%)`);
    console.log(`   👤 Real names: ${cq.real_names.toLocaleString()} (${Math.round((cq.real_names/cq.total)*100)}%)`);
    console.log(`   🏢 Company info: ${cq.with_company.toLocaleString()} (${Math.round((cq.with_company/cq.total)*100)}%)`);
    console.log('');
    
    // Vehicle data quality
    const vehicleQuality = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN make IS NOT NULL AND make != '' AND make != 'Unknown' THEN 1 END) as real_makes,
        COUNT(CASE WHEN model IS NOT NULL AND model != '' AND model != 'Unknown' THEN 1 END) as real_models,
        COUNT(CASE WHEN year IS NOT NULL AND year > 1900 THEN 1 END) as with_year,
        COUNT(CASE WHEN vin IS NOT NULL AND vin != '' THEN 1 END) as with_vin,
        COUNT(CASE WHEN engine_size IS NOT NULL THEN 1 END) as with_engine_size
      FROM vehicles
    `;
    
    const vq = vehicleQuality[0];
    console.log('🚗 VEHICLE DATA QUALITY:');
    console.log(`   🏭 Real makes: ${vq.real_makes.toLocaleString()} (${Math.round((vq.real_makes/vq.total)*100)}%)`);
    console.log(`   🚙 Real models: ${vq.real_models.toLocaleString()} (${Math.round((vq.real_models/vq.total)*100)}%)`);
    console.log(`   📅 With year: ${vq.with_year.toLocaleString()} (${Math.round((vq.with_year/vq.total)*100)}%)`);
    console.log(`   🔧 With VIN: ${vq.with_vin.toLocaleString()} (${Math.round((vq.with_vin/vq.total)*100)}%)`);
    console.log(`   ⚙️  With engine size: ${vq.with_engine_size.toLocaleString()} (${Math.round((vq.with_engine_size/vq.total)*100)}%)`);
    console.log('');
    
    // Financial totals
    console.log('5️⃣ FINANCIAL TOTALS...');
    console.log('=======================');
    
    const financialTotals = await sql`
      SELECT 
        COUNT(*) as total_docs,
        SUM(total_gross) as total_revenue,
        AVG(total_gross) as avg_invoice,
        MAX(total_gross) as largest_invoice,
        COUNT(CASE WHEN total_gross > 0 THEN 1 END) as paid_docs
      FROM customer_documents
      WHERE total_gross IS NOT NULL
    `;
    
    const ft = financialTotals[0];
    console.log('💰 FINANCIAL SUMMARY:');
    console.log(`   📄 Total documents: ${ft.total_docs.toLocaleString()}`);
    console.log(`   💷 Total revenue: £${parseFloat(ft.total_revenue || 0).toLocaleString()}`);
    console.log(`   💷 Average invoice: £${parseFloat(ft.avg_invoice || 0).toFixed(2)}`);
    console.log(`   💷 Largest invoice: £${parseFloat(ft.largest_invoice || 0).toLocaleString()}`);
    console.log(`   💳 Paid documents: ${ft.paid_docs.toLocaleString()}`);
    console.log('');
    
    // Calculate total records
    const totalRecords = 
      vehicles[0].count + 
      customers[0].count + 
      documents[0].count + 
      lineItems[0].count + 
      receipts[0].count + 
      appointments[0].count + 
      reminders[0].count + 
      stock[0].count;
    
    console.log('6️⃣ GRAND TOTALS...');
    console.log('==================');
    console.log(`🎯 TOTAL RECORDS IN DATABASE: ${totalRecords.toLocaleString()}`);
    console.log('');
    console.log('📊 BREAKDOWN:');
    console.log(`   🚗 Vehicles: ${vehicles[0].count.toLocaleString()} (${Math.round((vehicles[0].count/totalRecords)*100)}%)`);
    console.log(`   📋 Line Items: ${lineItems[0].count.toLocaleString()} (${Math.round((lineItems[0].count/totalRecords)*100)}%)`);
    console.log(`   📄 Documents: ${documents[0].count.toLocaleString()} (${Math.round((documents[0].count/totalRecords)*100)}%)`);
    console.log(`   👥 Customers: ${customers[0].count.toLocaleString()} (${Math.round((customers[0].count/totalRecords)*100)}%)`);
    console.log(`   🧾 Receipts: ${receipts[0].count.toLocaleString()} (${Math.round((receipts[0].count/totalRecords)*100)}%)`);
    console.log(`   🔔 Reminders: ${reminders[0].count.toLocaleString()} (${Math.round((reminders[0].count/totalRecords)*100)}%)`);
    console.log(`   📅 Appointments: ${appointments[0].count.toLocaleString()} (${Math.round((appointments[0].count/totalRecords)*100)}%)`);
    console.log(`   📦 Stock: ${stock[0].count.toLocaleString()} (${Math.round((stock[0].count/totalRecords)*100)}%)`);
    console.log('');
    
    console.log('🎉 DATABASE HEALTH ASSESSMENT:');
    console.log('==============================');
    
    if (vehicleLinkageRate > 15 && documentLinkageRate > 90) {
      console.log('🎊 EXCELLENT DATABASE HEALTH!');
      console.log('   ✅ Strong vehicle-customer relationships');
      console.log('   ✅ Excellent document-customer linkage');
      console.log('   ✅ Comprehensive data coverage');
    } else if (vehicleLinkageRate > 10 && documentLinkageRate > 70) {
      console.log('✅ GOOD DATABASE HEALTH!');
      console.log('   ✅ Decent vehicle-customer relationships');
      console.log('   ✅ Good document-customer linkage');
    } else {
      console.log('⚠️  DATABASE NEEDS IMPROVEMENT');
      console.log('   ⚠️  Low relationship linkage rates');
    }
    
    console.log('');
    console.log('✅ COMPLETE DATABASE TOTALS ANALYSIS FINISHED');
    console.log('==============================================');
    
  } catch (error) {
    console.log('❌ TOTALS ANALYSIS FAILED:', error.message);
  }
}

getCompleteTotals();
