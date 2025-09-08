#!/usr/bin/env node

/**
 * 🐛 DEBUG IMPORT ERRORS
 * Test import with detailed error reporting
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🐛 DEBUG IMPORT ERRORS');
console.log('======================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('');

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    }
  }
  
  return records;
}

async function debugImportErrors() {
  try {
    console.log('1️⃣ TESTING DATABASE CONNECTION...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 15000,
      queryTimeoutMillis: 10000
    });
    
    const testResult = await sql`SELECT NOW() as time, COUNT(*) as customers FROM customers`;
    console.log('✅ Database connected successfully');
    console.log(`📊 Current customers: ${testResult[0].customers}`);
    console.log(`⏰ Database time: ${testResult[0].time}`);
    console.log('');
    
    console.log('2️⃣ TESTING GA4 FILE ACCESS...');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const customersPath = path.join(ga4Path, 'Customers.csv');
    
    if (!fs.existsSync(ga4Path)) {
      throw new Error(`GA4 Export folder not found: ${ga4Path}`);
    }
    
    if (!fs.existsSync(customersPath)) {
      throw new Error(`Customers.csv not found: ${customersPath}`);
    }
    
    console.log('✅ GA4 Export folder accessible');
    console.log('✅ Customers.csv file found');
    console.log('');
    
    console.log('3️⃣ TESTING CSV PARSING...');
    
    const content = fs.readFileSync(customersPath, 'utf-8');
    const customerRecords = parseCSV(content);
    
    console.log(`📋 Successfully parsed ${customerRecords.length} customer records`);
    
    if (customerRecords.length > 0) {
      const sample = customerRecords[0];
      console.log('📊 Sample record structure:');
      Object.keys(sample).forEach(key => {
        console.log(`   ${key}: "${sample[key]}"`);
      });
    }
    console.log('');
    
    console.log('4️⃣ TESTING SMALL BATCH IMPORT...');
    
    // Get existing customer IDs
    const existingCustomers = await sql`SELECT id FROM customers LIMIT 100`;
    const existingIds = new Set(existingCustomers.map(c => c.id));
    
    console.log(`📊 Found ${existingIds.size} existing customer IDs for deduplication`);
    
    // Test with first 10 records
    const testBatch = customerRecords.slice(0, 10);
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log(`🧪 Testing import with ${testBatch.length} records...`);
    
    for (let i = 0; i < testBatch.length; i++) {
      const record = testBatch[i];
      
      try {
        const id = record._id;
        const firstName = record.nameforename || 'Unknown';
        const lastName = record.namesurname || '';
        const email = record.contactemail || null;
        const phone = record.contactmobile || record.contacttelephone || null;
        
        console.log(`   ${i+1}. Testing record ID: ${id}, Name: ${firstName} ${lastName}`);
        
        if (!id) {
          console.log(`      ❌ Skipped - No ID`);
          skipped++;
          continue;
        }
        
        if (existingIds.has(id)) {
          console.log(`      ⚠️  Skipped - Already exists`);
          skipped++;
          continue;
        }
        
        if (!firstName || firstName === 'Unknown') {
          console.log(`      ❌ Skipped - No valid first name`);
          skipped++;
          continue;
        }
        
        // Try the actual insert
        const result = await sql`
          INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
          VALUES (${id}, ${firstName}, ${lastName}, ${email}, ${phone}, NOW(), NOW())
        `;
        
        console.log(`      ✅ Successfully imported`);
        imported++;
        
      } catch (error) {
        console.log(`      ❌ ERROR: ${error.message}`);
        console.log(`      🔍 Error code: ${error.code || 'No code'}`);
        console.log(`      🔍 Error details: ${error.detail || 'No details'}`);
        errors++;
      }
    }
    
    console.log('');
    console.log('📊 TEST BATCH RESULTS:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('');
    
    if (errors > 0) {
      console.log('🚨 ERRORS DETECTED IN TEST BATCH!');
      console.log('💡 Common error causes:');
      console.log('   - Database schema mismatch');
      console.log('   - Data type conversion issues');
      console.log('   - Constraint violations');
      console.log('   - Connection timeouts');
      console.log('   - Invalid character encoding');
    } else {
      console.log('✅ TEST BATCH SUCCESSFUL!');
      console.log('💡 Import process should work with proper batch sizes');
    }
    
    console.log('');
    console.log('5️⃣ CHECKING DATABASE SCHEMA...');
    
    // Check customers table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Customers table schema:');
    tableInfo.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    console.log('✅ DEBUG IMPORT ERRORS COMPLETE');
    console.log('===============================');
    
    if (errors === 0) {
      console.log('🎉 NO ERRORS DETECTED - READY FOR FULL IMPORT!');
    } else {
      console.log('🚨 ERRORS FOUND - NEED TO INVESTIGATE FURTHER');
    }
    
  } catch (error) {
    console.log('❌ DEBUG FAILED:', error.message);
    console.log('🔍 Error stack:', error.stack);
  }
}

debugImportErrors();
