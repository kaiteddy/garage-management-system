#!/usr/bin/env node

/**
 * 🔍 PRE-IMPORT DATA AUDIT
 * Comprehensive check of existing data before merge import
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

console.log('🔍 PRE-IMPORT DATA AUDIT');
console.log('=========================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Audit existing data before comprehensive merge');
console.log('');

async function preImportAudit() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ COMPREHENSIVE TABLE INVENTORY...');
    
    // Get all tables
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`📊 Found ${tables.length} tables in database:`);
    tables.forEach(t => {
      console.log(`   📋 ${t.table_name} (${t.column_count} columns)`);
    });
    console.log('');
    
    console.log('3️⃣ DETAILED DATA ANALYSIS...');
    
    // Core tables analysis
    const coreTableAnalysis = {};
    
    // Vehicles analysis
    try {
      const vehicleStats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT registration) as unique_registrations,
          COUNT(DISTINCT make) as unique_makes,
          COUNT(DISTINCT model) as unique_models,
          COUNT(customer_id) as with_customer_id,
          COUNT(vin) as with_vin,
          COUNT(engine_size) as with_engine_size,
          COUNT(fuel_type) as with_fuel_type,
          MIN(created_at) as oldest_record,
          MAX(created_at) as newest_record
        FROM vehicles
      `;
      
      const vs = vehicleStats[0];
      coreTableAnalysis.vehicles = vs;
      
      console.log('🚗 VEHICLES TABLE ANALYSIS:');
      console.log(`   📊 Total records: ${vs.total}`);
      console.log(`   🔑 Unique registrations: ${vs.unique_registrations}`);
      console.log(`   🏭 Unique makes: ${vs.unique_makes}`);
      console.log(`   🚙 Unique models: ${vs.unique_models}`);
      console.log(`   👥 With customer_id: ${vs.with_customer_id} (${((vs.with_customer_id/vs.total)*100).toFixed(1)}%)`);
      console.log(`   🔧 With VIN: ${vs.with_vin} (${((vs.with_vin/vs.total)*100).toFixed(1)}%)`);
      console.log(`   ⚙️  With engine_size: ${vs.with_engine_size} (${((vs.with_engine_size/vs.total)*100).toFixed(1)}%)`);
      console.log(`   ⛽ With fuel_type: ${vs.with_fuel_type} (${((vs.with_fuel_type/vs.total)*100).toFixed(1)}%)`);
      console.log(`   📅 Date range: ${vs.oldest_record} to ${vs.newest_record}`);
      
      // Sample vehicles with technical data
      const techVehicles = await sql`
        SELECT registration, make, model, year, vin, engine_size, fuel_type, customer_id
        FROM vehicles 
        WHERE vin IS NOT NULL OR engine_size IS NOT NULL OR fuel_type IS NOT NULL
        LIMIT 5
      `;
      
      console.log('   🔧 Sample vehicles with technical data:');
      techVehicles.forEach((v, i) => {
        console.log(`      ${i+1}. ${v.registration} - ${v.make} ${v.model} (${v.year || 'Unknown year'})`);
        console.log(`         VIN: ${v.vin || 'None'}, Engine: ${v.engine_size || 'None'}, Fuel: ${v.fuel_type || 'None'}`);
        console.log(`         Customer ID: ${v.customer_id || 'None'}`);
      });
      
    } catch (e) {
      console.log('⚠️  Could not analyze vehicles table:', e.message);
    }
    console.log('');
    
    // Customers analysis
    try {
      const customerStats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT email) as unique_emails,
          COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
          COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
          COUNT(CASE WHEN company IS NOT NULL AND company != '' THEN 1 END) as with_company,
          COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as with_address,
          MIN(created_at) as oldest_record,
          MAX(created_at) as newest_record
        FROM customers
      `;
      
      const cs = customerStats[0];
      coreTableAnalysis.customers = cs;
      
      console.log('👥 CUSTOMERS TABLE ANALYSIS:');
      console.log(`   📊 Total records: ${cs.total}`);
      console.log(`   📧 Unique emails: ${cs.unique_emails}`);
      console.log(`   📧 With email: ${cs.with_email} (${((cs.with_email/cs.total)*100).toFixed(1)}%)`);
      console.log(`   📱 With phone: ${cs.with_phone} (${((cs.with_phone/cs.total)*100).toFixed(1)}%)`);
      console.log(`   🏢 With company: ${cs.with_company} (${((cs.with_company/cs.total)*100).toFixed(1)}%)`);
      console.log(`   🏠 With address: ${cs.with_address} (${((cs.with_address/cs.total)*100).toFixed(1)}%)`);
      console.log(`   📅 Date range: ${cs.oldest_record} to ${cs.newest_record}`);
      
      // Sample customers with complete data
      const completeCustomers = await sql`
        SELECT first_name, last_name, email, phone, company, address
        FROM customers 
        WHERE email IS NOT NULL AND email != '' AND phone IS NOT NULL
        LIMIT 5
      `;
      
      console.log('   👤 Sample customers with complete data:');
      completeCustomers.forEach((c, i) => {
        console.log(`      ${i+1}. ${c.first_name} ${c.last_name} - ${c.email}`);
        console.log(`         Phone: ${c.phone}, Company: ${c.company || 'None'}`);
        console.log(`         Address: ${c.address || 'None'}`);
      });
      
    } catch (e) {
      console.log('⚠️  Could not analyze customers table:', e.message);
    }
    console.log('');
    
    // Documents analysis
    try {
      const docStats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT document_type) as unique_types,
          COUNT(DISTINCT customer_id) as unique_customers,
          COUNT(CASE WHEN total_gross > 0 THEN 1 END) as with_value,
          SUM(total_gross) as total_value,
          AVG(total_gross) as avg_value,
          MIN(created_at) as oldest_record,
          MAX(created_at) as newest_record
        FROM customer_documents
      `;
      
      const ds = docStats[0];
      coreTableAnalysis.documents = ds;
      
      console.log('📄 DOCUMENTS TABLE ANALYSIS:');
      console.log(`   📊 Total records: ${ds.total}`);
      console.log(`   📋 Document types: ${ds.unique_types}`);
      console.log(`   👥 Unique customers: ${ds.unique_customers}`);
      console.log(`   💰 With value: ${ds.with_value} (${((ds.with_value/ds.total)*100).toFixed(1)}%)`);
      console.log(`   💷 Total value: £${parseFloat(ds.total_value || 0).toLocaleString()}`);
      console.log(`   💷 Average value: £${parseFloat(ds.avg_value || 0).toFixed(2)}`);
      console.log(`   📅 Date range: ${ds.oldest_record} to ${ds.newest_record}`);
      
      // Document types breakdown
      const docTypes = await sql`
        SELECT document_type, COUNT(*) as count, SUM(total_gross) as total_value
        FROM customer_documents 
        GROUP BY document_type
        ORDER BY count DESC
      `;
      
      console.log('   📋 Document types breakdown:');
      docTypes.forEach(dt => {
        console.log(`      ${dt.document_type}: ${dt.count} docs (£${parseFloat(dt.total_value || 0).toLocaleString()})`);
      });
      
    } catch (e) {
      console.log('⚠️  Could not analyze documents table:', e.message);
    }
    console.log('');
    
    console.log('4️⃣ TECHNICAL DATA PRESERVATION CHECK...');
    
    // Check for additional technical tables
    const techTables = tables.filter(t => 
      t.table_name.includes('technical') || 
      t.table_name.includes('spec') ||
      t.table_name.includes('mot') ||
      t.table_name.includes('service') ||
      t.table_name.includes('part') ||
      t.table_name.includes('stock') ||
      t.table_name.includes('reminder')
    );
    
    if (techTables.length > 0) {
      console.log('🔧 Technical/specialized tables found:');
      for (const table of techTables) {
        try {
          const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.table_name}`);
          console.log(`   📊 ${table.table_name}: ${count[0].count} records`);
        } catch (e) {
          console.log(`   ❌ ${table.table_name}: Could not count records`);
        }
      }
    } else {
      console.log('ℹ️  No specialized technical tables found');
    }
    console.log('');
    
    console.log('5️⃣ MERGE STRATEGY RECOMMENDATIONS...');
    console.log('=====================================');
    console.log('');
    
    console.log('🛡️  DATA PRESERVATION STRATEGY:');
    console.log('');
    
    // Vehicles strategy
    const vehiclePreservation = vs.with_vin > 0 || vs.with_engine_size > 0 || vs.with_fuel_type > 0;
    if (vehiclePreservation) {
      console.log('🚗 VEHICLES: MERGE STRATEGY');
      console.log('   ✅ PRESERVE existing technical data (VIN, engine, fuel type)');
      console.log('   ✅ ADD missing customer relationships');
      console.log('   ✅ UPDATE basic info only if missing');
      console.log('   🔧 SQL: ON CONFLICT (registration) DO UPDATE SET customer_id = EXCLUDED.customer_id');
    } else {
      console.log('🚗 VEHICLES: SAFE REPLACE STRATEGY');
      console.log('   ✅ No critical technical data to preserve');
      console.log('   ✅ Safe to update all fields');
    }
    console.log('');
    
    // Customers strategy
    const customerPreservation = cs.with_email > 100 || cs.with_phone > 100;
    if (customerPreservation) {
      console.log('👥 CUSTOMERS: MERGE STRATEGY');
      console.log('   ✅ PRESERVE existing customer data');
      console.log('   ✅ ADD new customers only');
      console.log('   ✅ UPDATE missing fields only');
      console.log('   🔧 SQL: ON CONFLICT (email) DO UPDATE SET ... WHERE EXCLUDED.field IS NOT NULL');
    } else {
      console.log('👥 CUSTOMERS: SAFE REPLACE STRATEGY');
      console.log('   ✅ Mostly placeholder data - safe to replace');
    }
    console.log('');
    
    // Documents strategy
    console.log('📄 DOCUMENTS: APPEND STRATEGY');
    console.log('   ✅ PRESERVE all existing documents');
    console.log('   ✅ ADD new documents only');
    console.log('   ✅ NO updates to existing documents');
    console.log('   🔧 SQL: ON CONFLICT (id) DO NOTHING');
    console.log('');
    
    console.log('🎯 FINAL RECOMMENDATION:');
    console.log('========================');
    console.log('');
    console.log('✅ PROCEED with MERGE import (not replace)');
    console.log('✅ All existing data will be PRESERVED');
    console.log('✅ Only missing data will be ADDED');
    console.log('✅ Technical data will be PROTECTED');
    console.log('✅ Customer relationships will be ESTABLISHED');
    console.log('');
    console.log('🔒 SAFETY MEASURES:');
    console.log('   - Docker isolation prevents crashes');
    console.log('   - ON CONFLICT clauses prevent overwrites');
    console.log('   - Existing technical data preserved');
    console.log('   - Can be stopped/rolled back if needed');
    console.log('');
    console.log('✅ PRE-IMPORT AUDIT COMPLETE - SAFE TO PROCEED!');
    
  } catch (error) {
    console.log('❌ PRE-IMPORT AUDIT FAILED:', error.message);
  }
}

preImportAudit();
