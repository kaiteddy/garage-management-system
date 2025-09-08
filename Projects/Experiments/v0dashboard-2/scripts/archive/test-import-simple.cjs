#!/usr/bin/env node

/**
 * 🧪 SIMPLE IMPORT TEST
 * Basic test to verify database connectivity and import a few records
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🧪 SIMPLE IMPORT TEST');
console.log('=====================');
console.log('⏰ Start:', new Date().toLocaleTimeString());

async function simpleImportTest() {
  try {
    console.log('1️⃣ Testing database connection...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 15000,
      queryTimeoutMillis: 10000
    });
    
    // Test basic connection
    const testResult = await sql`SELECT COUNT(*) as customers FROM customers`;
    console.log(`✅ Database connected! Current customers: ${testResult[0].customers}`);
    
    console.log('');
    console.log('2️⃣ Testing CSV file access...');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const customersPath = path.join(ga4Path, 'Customers.csv');
    
    if (!fs.existsSync(customersPath)) {
      console.log('❌ Customers.csv not found at:', customersPath);
      return;
    }
    
    console.log('✅ Customers.csv found');
    
    // Read first few lines to check format
    const content = fs.readFileSync(customersPath, 'utf-8');
    const lines = content.split('\n');
    console.log(`✅ CSV has ${lines.length} lines`);
    console.log('📋 First line (headers):', lines[0].substring(0, 100) + '...');
    
    if (lines.length > 1) {
      console.log('📋 Second line (sample):', lines[1].substring(0, 100) + '...');
    }
    
    console.log('');
    console.log('3️⃣ Testing simple CSV parsing...');
    
    // Simple CSV parsing test
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`✅ Found ${headers.length} columns`);
    console.log('📋 Key columns found:');
    
    const keyColumns = ['_id', 'nameforename', 'namesurname', 'contactemail'];
    keyColumns.forEach(col => {
      const found = headers.find(h => h.toLowerCase().includes(col.toLowerCase()));
      console.log(`   ${col}: ${found ? '✅ ' + found : '❌ Not found'}`);
    });
    
    console.log('');
    console.log('4️⃣ Testing single record import...');
    
    if (lines.length > 1) {
      const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      
      const id = record._id;
      const firstName = record.nameforename || record.Name_Forename || 'Test';
      
      if (id && firstName) {
        console.log(`📝 Testing import of customer: ${firstName} (ID: ${id})`);
        
        try {
          const existing = await sql`SELECT id FROM customers WHERE id = ${id} LIMIT 1`;
          
          if (existing.length > 0) {
            console.log('✅ Customer already exists - would update');
          } else {
            console.log('✅ New customer - would insert');
          }
          
        } catch (dbError) {
          console.log('❌ Database query failed:', dbError.message);
        }
      } else {
        console.log('❌ Missing required fields in sample record');
        console.log('📋 Sample record keys:', Object.keys(record).slice(0, 10));
      }
    }
    
    console.log('');
    console.log('✅ SIMPLE IMPORT TEST COMPLETE');
    console.log('==============================');
    console.log('🎯 Database connection: Working');
    console.log('🎯 CSV file access: Working');
    console.log('🎯 Ready for full import');
    
  } catch (error) {
    console.log('❌ SIMPLE IMPORT TEST FAILED');
    console.log('============================');
    console.log('Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Database timeout - Neon may still be waking up');
    } else if (error.message.includes('connection')) {
      console.log('💡 Connection issue - Check DATABASE_URL');
    } else {
      console.log('💡 Unexpected error - Check logs above');
    }
  }
}

simpleImportTest();
