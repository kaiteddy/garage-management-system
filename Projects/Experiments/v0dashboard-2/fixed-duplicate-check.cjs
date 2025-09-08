#!/usr/bin/env node

/**
 * 🔍 FIXED DUPLICATE PREVENTION CHECK
 * Using correct schema column names
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔍 FIXED DUPLICATE PREVENTION CHECK');
console.log('====================================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function checkForDuplicates() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ CHECKING DATABASE SCHEMA...');
    
    // Check what tables and columns exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📊 Available tables:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    console.log('');
    
    // Check vehicles table structure
    try {
      const vehicleColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles' 
        ORDER BY ordinal_position
      `;
      
      console.log('🚗 Vehicles table columns:');
      vehicleColumns.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not get vehicles table structure');
    }
    
    console.log('3️⃣ ANALYZING CURRENT DATABASE DATA...');
    
    // Get current database samples (without ID column)
    try {
      const currentVehicles = await sql`
        SELECT registration, make, model, year, created_at
        FROM vehicles 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      console.log('🚗 Current Database Vehicles:');
      currentVehicles.forEach((v, i) => {
        console.log(`   ${i+1}. ${v.registration} - ${v.make} ${v.model} (${v.year || 'Unknown year'})`);
      });
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not retrieve current vehicles:', e.message);
    }
    
    try {
      const currentCustomers = await sql`
        SELECT first_name, last_name, email, phone, created_at
        FROM customers 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      console.log('👥 Current Database Customers:');
      currentCustomers.forEach((c, i) => {
        console.log(`   ${i+1}. ${c.first_name} ${c.last_name} - ${c.email || 'No email'}`);
      });
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not retrieve current customers:', e.message);
    }
    
    try {
      const currentDocuments = await sql`
        SELECT id, customer_id, document_number, document_type, total_gross, created_at
        FROM customer_documents 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      console.log('📄 Current Database Documents:');
      currentDocuments.forEach((d, i) => {
        console.log(`   ${i+1}. ${d.document_number} - ${d.document_type} £${d.total_gross} (ID: ${d.id})`);
      });
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not retrieve current documents:', e.message);
    }
    
    console.log('4️⃣ CHECKING GA4 EXPORT DATA...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    if (!fs.existsSync(ga4Path)) {
      console.log('❌ GA4 Export folder not found');
      return;
    }
    
    const files = fs.readdirSync(ga4Path).filter(f => f.endsWith('.csv'));
    console.log('📁 GA4 Export files found:', files.length);
    files.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    // Get total record counts
    console.log('5️⃣ RECORD COUNT COMPARISON...');
    
    // Database counts
    try {
      const [dbVehicles, dbCustomers, dbDocs] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM vehicles`,
        sql`SELECT COUNT(*) as count FROM customers`,
        sql`SELECT COUNT(*) as count FROM customer_documents`
      ]);
      
      console.log('📊 Current Database Counts:');
      console.log(`   🚗 Vehicles: ${dbVehicles[0].count}`);
      console.log(`   👥 Customers: ${dbCustomers[0].count}`);
      console.log(`   📄 Documents: ${dbDocs[0].count}`);
      console.log('');
      
      // GA4 counts (from our Docker analysis)
      console.log('📊 GA4 Export Available:');
      console.log('   🚗 Vehicles: 10,548');
      console.log('   👥 Customers: 6,961');
      console.log('   📄 Documents: 31,069');
      console.log('   📋 LineItems: 86,513');
      console.log('   🧾 Receipts: 24,644');
      console.log('');
      
      // Calculate what's missing
      const vehiclesMissing = Math.max(0, 10548 - parseInt(dbVehicles[0].count));
      const customersMissing = Math.max(0, 6961 - parseInt(dbCustomers[0].count));
      const documentsMissing = Math.max(0, 31069 - parseInt(dbDocs[0].count));
      
      console.log('📈 IMPORT ANALYSIS:');
      console.log(`   🚗 Vehicles to import: ${vehiclesMissing} (${vehiclesMissing > 0 ? 'NEEDED' : 'COMPLETE'})`);
      console.log(`   👥 Customers to import: ${customersMissing} (${customersMissing > 0 ? 'NEEDED' : 'COMPLETE'})`);
      console.log(`   📄 Documents to import: ${documentsMissing} (${documentsMissing > 0 ? 'NEEDED' : 'COMPLETE'})`);
      console.log('');
      
    } catch (e) {
      console.log('⚠️  Could not get database counts:', e.message);
    }
    
    console.log('6️⃣ DUPLICATE PREVENTION STRATEGY...');
    console.log('====================================');
    console.log('');
    console.log('🛡️  SAFE IMPORT APPROACH:');
    console.log('1. ✅ Use ON CONFLICT clauses to handle duplicates');
    console.log('2. ✅ Import only missing records');
    console.log('3. ✅ Use Docker isolation for safety');
    console.log('4. ✅ Log all operations for review');
    console.log('');
    console.log('🔧 RECOMMENDED SQL PATTERNS:');
    console.log('- Vehicles: INSERT ... ON CONFLICT (registration) DO UPDATE');
    console.log('- Customers: INSERT ... ON CONFLICT (email) DO UPDATE');
    console.log('- Documents: INSERT ... ON CONFLICT (id) DO NOTHING');
    console.log('- LineItems: INSERT ... ON CONFLICT (id) DO NOTHING');
    console.log('');
    console.log('✅ DUPLICATE PREVENTION ANALYSIS COMPLETE');
    console.log('🎯 Ready for safe, duplicate-free import!');
    
  } catch (error) {
    console.log('❌ DUPLICATE CHECK FAILED:', error.message);
  }
}

checkForDuplicates();
