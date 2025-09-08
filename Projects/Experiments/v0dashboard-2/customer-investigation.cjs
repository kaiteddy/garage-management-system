#!/usr/bin/env node

/**
 * 🔍 CUSTOMER DATA INVESTIGATION
 * Deep analysis of customer data discrepancy
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔍 CUSTOMER DATA INVESTIGATION');
console.log('===============================');
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

async function investigateCustomers() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ DETAILED DATABASE CUSTOMER ANALYSIS...');
    
    // Get comprehensive customer statistics
    const totalCustomers = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log('📊 Total customers in database:', totalCustomers[0].count);
    
    // Check customer creation patterns
    const customersByDate = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM customers 
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 10
    `;
    
    console.log('📅 Customer creation by date (last 10 days):');
    customersByDate.forEach(row => {
      console.log(`   ${row.date}: ${row.count} customers`);
    });
    console.log('');
    
    // Check email patterns
    const emailPatterns = await sql`
      SELECT 
        CASE 
          WHEN email LIKE '%@placeholder.com' THEN 'Placeholder emails'
          WHEN email IS NULL THEN 'No email'
          WHEN email = '' THEN 'Empty email'
          ELSE 'Real emails'
        END as email_type,
        COUNT(*) as count
      FROM customers
      GROUP BY 
        CASE 
          WHEN email LIKE '%@placeholder.com' THEN 'Placeholder emails'
          WHEN email IS NULL THEN 'No email'
          WHEN email = '' THEN 'Empty email'
          ELSE 'Real emails'
        END
      ORDER BY count DESC
    `;
    
    console.log('📧 Email pattern analysis:');
    emailPatterns.forEach(row => {
      console.log(`   ${row.email_type}: ${row.count} customers`);
    });
    console.log('');
    
    // Check for real customer examples
    const realCustomers = await sql`
      SELECT first_name, last_name, email, phone, created_at
      FROM customers 
      WHERE email NOT LIKE '%@placeholder.com' 
        AND email IS NOT NULL 
        AND email != ''
        AND first_name IS NOT NULL
        AND first_name != ''
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('👥 Sample REAL customers (non-placeholder):');
    realCustomers.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.first_name} ${c.last_name} - ${c.email} (${c.phone || 'No phone'})`);
    });
    console.log('');
    
    console.log('3️⃣ ANALYZING GA4 CUSTOMER DATA...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const customersPath = path.join(ga4Path, 'Customers.csv');
    
    if (!fs.existsSync(customersPath)) {
      console.log('❌ GA4 Customers.csv not found');
      return;
    }
    
    const content = fs.readFileSync(customersPath, 'utf-8');
    const ga4Records = parseCSV(content);
    
    console.log('📊 GA4 Customer file analysis:');
    console.log(`   📋 Total records: ${ga4Records.length}`);
    console.log('');
    
    if (ga4Records.length > 0) {
      // Analyze GA4 customer structure
      const sampleRecord = ga4Records[0];
      console.log('📊 GA4 Customer fields:');
      Object.keys(sampleRecord).forEach(field => {
        console.log(`   - ${field}`);
      });
      console.log('');
      
      // Check GA4 email patterns
      let realEmails = 0;
      let noEmails = 0;
      let emptyEmails = 0;
      let placeholderEmails = 0;
      
      const emailSamples = [];
      
      ga4Records.forEach(record => {
        const email = record.email || '';
        
        if (!email || email.trim() === '') {
          noEmails++;
        } else if (email.includes('@placeholder.com')) {
          placeholderEmails++;
        } else if (email.includes('@') && email.includes('.')) {
          realEmails++;
          if (emailSamples.length < 10) {
            emailSamples.push({
              name: `${record.first_name || record.forename || 'Unknown'} ${record.last_name || record.surname || ''}`,
              email: email
            });
          }
        } else {
          emptyEmails++;
        }
      });
      
      console.log('📧 GA4 Email pattern analysis:');
      console.log(`   Real emails: ${realEmails}`);
      console.log(`   No emails: ${noEmails}`);
      console.log(`   Empty emails: ${emptyEmails}`);
      console.log(`   Placeholder emails: ${placeholderEmails}`);
      console.log('');
      
      console.log('👥 Sample GA4 customers with real emails:');
      emailSamples.forEach((c, i) => {
        console.log(`   ${i+1}. ${c.name.trim()} - ${c.email}`);
      });
      console.log('');
      
      // Check for overlap
      console.log('4️⃣ CHECKING FOR OVERLAP...');
      
      // Get all current database emails
      const dbEmails = await sql`
        SELECT DISTINCT LOWER(email) as email 
        FROM customers 
        WHERE email IS NOT NULL 
          AND email != ''
          AND email NOT LIKE '%@placeholder.com'
      `;
      
      const dbEmailSet = new Set(dbEmails.map(row => row.email));
      console.log(`📊 Database has ${dbEmailSet.size} unique real emails`);
      
      // Check GA4 emails against database
      let foundInDb = 0;
      let notInDb = 0;
      const missingCustomers = [];
      
      ga4Records.slice(0, 1000).forEach(record => { // Check first 1000
        const email = (record.email || '').toLowerCase().trim();
        
        if (email && email.includes('@') && email.includes('.') && !email.includes('@placeholder.com')) {
          if (dbEmailSet.has(email)) {
            foundInDb++;
          } else {
            notInDb++;
            if (missingCustomers.length < 10) {
              missingCustomers.push({
                name: `${record.first_name || record.forename || 'Unknown'} ${record.last_name || record.surname || ''}`,
                email: email,
                ga4_id: record._id
              });
            }
          }
        }
      });
      
      console.log(`📊 Overlap analysis (first 1000 GA4 records):`);
      console.log(`   Found in database: ${foundInDb}`);
      console.log(`   Missing from database: ${notInDb}`);
      console.log('');
      
      console.log('👥 Sample customers missing from database:');
      missingCustomers.forEach((c, i) => {
        console.log(`   ${i+1}. ${c.name.trim()} - ${c.email} (GA4 ID: ${c.ga4_id})`);
      });
      console.log('');
    }
    
    console.log('5️⃣ INVESTIGATION CONCLUSIONS...');
    console.log('================================');
    console.log('');
    
    const dbRealCustomers = realCustomers.length;
    const dbTotalCustomers = parseInt(totalCustomers[0].count);
    const dbPlaceholderCustomers = dbTotalCustomers - dbRealCustomers;
    
    console.log('🎯 FINDINGS:');
    console.log(`   📊 Database: ${dbTotalCustomers} total customers`);
    console.log(`   📊 Database: ~${dbRealCustomers} real customers (estimated)`);
    console.log(`   📊 Database: ~${dbPlaceholderCustomers} placeholder customers (estimated)`);
    console.log(`   📊 GA4: ${ga4Records.length} total customers available`);
    console.log('');
    
    console.log('💡 RECOMMENDATIONS:');
    if (notInDb > foundInDb) {
      console.log('   ✅ PROCEED with customer import - many real customers missing');
      console.log('   ✅ Use email-based deduplication');
      console.log('   ✅ Import will add significant real customer data');
    } else {
      console.log('   ⚠️  INVESTIGATE further - overlap analysis needed');
      console.log('   ⚠️  Consider smaller test import first');
    }
    
    console.log('');
    console.log('✅ CUSTOMER INVESTIGATION COMPLETE');
    
  } catch (error) {
    console.log('❌ CUSTOMER INVESTIGATION FAILED:', error.message);
  }
}

investigateCustomers();
