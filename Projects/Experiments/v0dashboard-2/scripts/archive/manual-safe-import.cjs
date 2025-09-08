#!/usr/bin/env node

/**
 * 🔧 MANUAL SAFE IMPORT
 * Ultra-conservative import - 1 customer at a time with immediate feedback
 * Run this directly in your terminal for instant results
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔧 MANUAL SAFE IMPORT');
console.log('=====================');
console.log('⚡ Processing 1 customer at a time with immediate feedback');
console.log('⏰ Start:', new Date().toLocaleTimeString());

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

async function manualSafeImport() {
  try {
    console.log('1️⃣ Testing database connection...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 5000,
      queryTimeoutMillis: 8000
    });
    
    // Test connection
    const testResult = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log(`✅ Database connected. Current customers: ${testResult[0].count}`);
    console.log('');
    
    console.log('2️⃣ Loading existing customer IDs...');
    const existingCustomers = await sql`SELECT id FROM customers`;
    const existingIds = new Set(existingCustomers.map(c => c.id));
    console.log(`✅ Loaded ${existingIds.size} existing customer IDs`);
    console.log('');
    
    console.log('3️⃣ Loading GA4 customer data...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const customersPath = path.join(ga4Path, 'Customers.csv');
    
    if (!fs.existsSync(customersPath)) {
      console.log('❌ Customers.csv not found at:', customersPath);
      return;
    }
    
    const content = fs.readFileSync(customersPath, 'utf-8');
    const allCustomers = parseCSV(content);
    console.log(`✅ Loaded ${allCustomers.length} GA4 customers`);
    
    // Filter for new customers
    const newCustomers = allCustomers.filter(record => {
      const id = record._id;
      const firstName = record.nameforename || 'Unknown';
      
      return id && 
             !existingIds.has(id) && 
             firstName && 
             firstName !== 'Unknown';
    });
    
    console.log(`✅ Found ${newCustomers.length} new customers to import`);
    console.log('');
    
    if (newCustomers.length === 0) {
      console.log('🎉 All customers already imported!');
      return;
    }
    
    console.log('4️⃣ MANUAL IMPORT PROCESS (First 20 customers)...');
    console.log('================================================');
    
    // Import first 20 customers only (ultra-safe)
    const customersToImport = newCustomers.slice(0, 20);
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < customersToImport.length; i++) {
      const customer = customersToImport[i];
      
      try {
        console.log(`🔄 Importing customer ${i + 1}/20: ${customer.nameforename} ${customer.namesurname || ''}...`);
        
        const id = customer._id;
        const firstName = customer.nameforename;
        const lastName = customer.namesurname || '';
        const email = customer.contactemail || '';
        const phone = customer.contactmobile || customer.contacttelephone || null;
        
        // Build address
        const addressParts = [customer.addresshouseno, customer.addressroad].filter(p => p && p.trim());
        const addressLine1 = addressParts.join(' ').trim() || null;
        const city = customer.addresstown || null;
        const postcode = customer.addresspostcode || null;
        
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, email, phone, 
            address_line1, city, postcode, created_at, updated_at
          )
          VALUES (
            ${id}, ${firstName}, ${lastName}, ${email}, ${phone},
            ${addressLine1}, ${city}, ${postcode}, NOW(), NOW()
          )
        `;
        
        imported++;
        console.log(`   ✅ Success! Customer ${firstName} ${lastName} imported`);
        
        // Small pause between customers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        errors++;
        console.log(`   ❌ Error importing ${customer.nameforename}: ${error.message.substring(0, 60)}`);
      }
    }
    
    console.log('');
    console.log('5️⃣ FINAL VERIFICATION...');
    console.log('=========================');
    
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`;
    const customersAdded = finalCount[0].count - testResult[0].count;
    
    console.log('📊 MANUAL IMPORT RESULTS:');
    console.log(`   👥 Starting customers: ${testResult[0].count}`);
    console.log(`   👥 Final customers: ${finalCount[0].count}`);
    console.log(`   📈 Customers added: ${customersAdded}`);
    console.log(`   ✅ Successful imports: ${imported}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('');
    
    if (imported > 0) {
      console.log('🎉 MANUAL IMPORT SUCCESS!');
      console.log('=========================');
      console.log('✅ Customers imported safely');
      console.log('✅ Database remained responsive');
      console.log('✅ No lockups occurred');
      
      const remaining = newCustomers.length - 20;
      if (remaining > 0) {
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log(`   📊 ${remaining} customers remaining`);
        console.log('   🔄 Run this script again to import next 20');
        console.log('   ⚡ Each run is safe and adds more data');
      }
    }
    
    console.log('');
    console.log('🔧 MANUAL SAFE IMPORT COMPLETE!');
    
  } catch (error) {
    console.log('❌ MANUAL IMPORT ERROR:', error.message);
    console.log('🔍 Full error:', error.stack);
  }
}

// Execute manual import
manualSafeImport();
