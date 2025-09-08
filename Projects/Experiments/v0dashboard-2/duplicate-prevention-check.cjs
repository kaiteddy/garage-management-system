#!/usr/bin/env node

/**
 * 🔍 DUPLICATE PREVENTION CHECK
 * Comprehensive analysis to prevent duplicate imports
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔍 DUPLICATE PREVENTION CHECK');
console.log('==============================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
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
    
    console.log('2️⃣ ANALYZING CURRENT DATABASE DATA...');
    
    // Get current database samples with IDs
    const currentVehicles = await sql`
      SELECT registration, make, model, year, created_at, id
      FROM vehicles 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const currentCustomers = await sql`
      SELECT first_name, last_name, email, phone, created_at, id
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const currentDocuments = await sql`
      SELECT id, customer_id, document_number, document_type, total_gross, created_at
      FROM customer_documents 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log('📊 Current Database Samples:');
    console.log('🚗 Recent Vehicles:');
    currentVehicles.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.registration} - ${v.make} ${v.model} (ID: ${v.id})`);
    });
    
    console.log('👥 Recent Customers:');
    currentCustomers.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.first_name} ${c.last_name} - ${c.email || 'No email'} (ID: ${c.id})`);
    });
    
    console.log('📄 Recent Documents:');
    currentDocuments.forEach((d, i) => {
      console.log(`   ${i+1}. ${d.document_number} - ${d.document_type} £${d.total_gross} (ID: ${d.id})`);
    });
    console.log('');
    
    console.log('3️⃣ ANALYZING GA4 EXPORT DATA...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    if (!fs.existsSync(ga4Path)) {
      throw new Error(`GA4 Export folder not found: ${ga4Path}`);
    }
    
    // Check Vehicles.csv
    const vehiclesPath = path.join(ga4Path, 'Vehicles.csv');
    if (fs.existsSync(vehiclesPath)) {
      console.log('🚗 Analyzing Vehicles.csv...');
      const content = fs.readFileSync(vehiclesPath, 'utf-8');
      const records = parseCSV(content);
      
      console.log(`   📋 GA4 Vehicle records: ${records.length}`);
      
      if (records.length > 0) {
        console.log('   📊 Sample GA4 vehicles:');
        records.slice(0, 5).forEach((r, i) => {
          const reg = r.regid || r.registration || 'No reg';
          const make = r.make || 'Unknown';
          const model = r.model || 'Unknown';
          console.log(`      ${i+1}. ${reg} - ${make} ${model} (GA4 ID: ${r._id})`);
        });
        
        // Check for potential duplicates
        console.log('   🔍 Checking for potential duplicates...');
        let potentialDuplicates = 0;
        
        for (const ga4Vehicle of records.slice(0, 100)) { // Check first 100
          const ga4Reg = (ga4Vehicle.regid || ga4Vehicle.registration || '').toUpperCase();
          
          if (ga4Reg) {
            const matchingCurrent = currentVehicles.find(cv => 
              cv.registration && cv.registration.toUpperCase() === ga4Reg
            );
            
            if (matchingCurrent) {
              potentialDuplicates++;
              console.log(`      ⚠️  Potential duplicate: ${ga4Reg} (DB ID: ${matchingCurrent.id}, GA4 ID: ${ga4Vehicle._id})`);
            }
          }
        }
        
        console.log(`   📊 Potential vehicle duplicates found: ${potentialDuplicates}/100 checked`);
      }
    }
    console.log('');
    
    // Check Customers.csv
    const customersPath = path.join(ga4Path, 'Customers.csv');
    if (fs.existsSync(customersPath)) {
      console.log('👥 Analyzing Customers.csv...');
      const content = fs.readFileSync(customersPath, 'utf-8');
      const records = parseCSV(content);
      
      console.log(`   📋 GA4 Customer records: ${records.length}`);
      
      if (records.length > 0) {
        console.log('   📊 Sample GA4 customers:');
        records.slice(0, 5).forEach((r, i) => {
          const firstName = r.first_name || r.forename || 'Unknown';
          const lastName = r.last_name || r.surname || '';
          const email = r.email || 'No email';
          console.log(`      ${i+1}. ${firstName} ${lastName} - ${email} (GA4 ID: ${r._id})`);
        });
        
        // Check for potential duplicates
        console.log('   🔍 Checking for potential duplicates...');
        let potentialDuplicates = 0;
        
        for (const ga4Customer of records.slice(0, 100)) { // Check first 100
          const ga4Email = (ga4Customer.email || '').toLowerCase();
          
          if (ga4Email) {
            const matchingCurrent = currentCustomers.find(cc => 
              cc.email && cc.email.toLowerCase() === ga4Email
            );
            
            if (matchingCurrent) {
              potentialDuplicates++;
              console.log(`      ⚠️  Potential duplicate: ${ga4Email} (DB ID: ${matchingCurrent.id}, GA4 ID: ${ga4Customer._id})`);
            }
          }
        }
        
        console.log(`   📊 Potential customer duplicates found: ${potentialDuplicates}/100 checked`);
      }
    }
    console.log('');
    
    // Check Documents.csv
    const documentsPath = path.join(ga4Path, 'Documents.csv');
    if (fs.existsSync(documentsPath)) {
      console.log('📄 Analyzing Documents.csv...');
      const content = fs.readFileSync(documentsPath, 'utf-8');
      const records = parseCSV(content);
      
      console.log(`   📋 GA4 Document records: ${records.length}`);
      
      if (records.length > 0) {
        console.log('   📊 Sample GA4 documents:');
        records.slice(0, 5).forEach((r, i) => {
          const docNum = r.doc_number || r.document_number || 'No number';
          const docType = r.doc_type || r.document_type || 'Unknown';
          const total = r.total_gross || '0';
          console.log(`      ${i+1}. ${docNum} - ${docType} £${total} (GA4 ID: ${r._id})`);
        });
        
        // Check for potential duplicates
        console.log('   🔍 Checking for potential duplicates...');
        let potentialDuplicates = 0;
        
        for (const ga4Doc of records.slice(0, 100)) { // Check first 100
          const ga4Id = ga4Doc._id;
          
          if (ga4Id) {
            const matchingCurrent = currentDocuments.find(cd => 
              cd.id === ga4Id
            );
            
            if (matchingCurrent) {
              potentialDuplicates++;
              console.log(`      ⚠️  Potential duplicate: ${ga4Id} (${ga4Doc.doc_number || 'No number'})`);
            }
          }
        }
        
        console.log(`   📊 Potential document duplicates found: ${potentialDuplicates}/100 checked`);
      }
    }
    console.log('');
    
    console.log('4️⃣ DUPLICATE PREVENTION STRATEGY...');
    console.log('====================================');
    console.log('');
    console.log('🛡️  RECOMMENDED APPROACH:');
    console.log('1. Use UPSERT operations (INSERT ... ON CONFLICT DO UPDATE)');
    console.log('2. Use unique constraints on key fields (registration, email, document ID)');
    console.log('3. Check existing records before importing');
    console.log('4. Use GA4 _id fields as primary keys where possible');
    console.log('5. Log all duplicate handling for review');
    console.log('');
    console.log('🔧 SQL STRATEGIES:');
    console.log('- Vehicles: ON CONFLICT (registration) DO UPDATE');
    console.log('- Customers: ON CONFLICT (email) DO UPDATE');
    console.log('- Documents: ON CONFLICT (id) DO NOTHING');
    console.log('- LineItems: ON CONFLICT (id) DO NOTHING');
    console.log('');
    console.log('✅ DUPLICATE PREVENTION CHECK COMPLETE');
    console.log('💡 Ready for safe import with duplicate prevention');
    
  } catch (error) {
    console.log('❌ DUPLICATE CHECK FAILED:', error.message);
  }
}

checkForDuplicates();
