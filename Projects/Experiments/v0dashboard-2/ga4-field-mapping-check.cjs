#!/usr/bin/env node

/**
 * 🔧 GA4 FIELD MAPPING CHECK
 * Check actual GA4 customer data with correct field names
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

console.log('🔧 GA4 FIELD MAPPING CHECK');
console.log('===========================');
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

async function checkGA4Fields() {
  try {
    console.log('1️⃣ ANALYZING GA4 CUSTOMER DATA WITH CORRECT FIELDS...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    const customersPath = path.join(ga4Path, 'Customers.csv');
    
    if (!fs.existsSync(customersPath)) {
      console.log('❌ GA4 Customers.csv not found');
      return;
    }
    
    const content = fs.readFileSync(customersPath, 'utf-8');
    const ga4Records = parseCSV(content);
    
    console.log('📊 GA4 Customer analysis:');
    console.log(`   📋 Total records: ${ga4Records.length}`);
    console.log('');
    
    if (ga4Records.length > 0) {
      // Check actual field mapping
      const sampleRecord = ga4Records[0];
      console.log('📊 GA4 Field mapping:');
      console.log(`   🏷️  Name: nameforename="${sampleRecord.nameforename}", namesurname="${sampleRecord.namesurname}"`);
      console.log(`   📧 Email: contactemail="${sampleRecord.contactemail}"`);
      console.log(`   📱 Phone: contactmobile="${sampleRecord.contactmobile}", contacttelephone="${sampleRecord.contacttelephone}"`);
      console.log(`   🏠 Address: addresshouseno="${sampleRecord.addresshouseno}", addressroad="${sampleRecord.addressroad}"`);
      console.log(`   🏢 Company: namecompany="${sampleRecord.namecompany}"`);
      console.log('');
      
      // Analyze actual customer data quality
      let realEmails = 0;
      let realNames = 0;
      let realPhones = 0;
      let companies = 0;
      
      const customerSamples = [];
      
      ga4Records.forEach(record => {
        // Check email
        const email = record.contactemail || '';
        if (email && email.includes('@') && email.includes('.') && !email.includes('placeholder')) {
          realEmails++;
        }
        
        // Check name
        const firstName = record.nameforename || '';
        const lastName = record.namesurname || '';
        if (firstName && firstName.trim() !== '') {
          realNames++;
        }
        
        // Check phone
        const mobile = record.contactmobile || '';
        const telephone = record.contacttelephone || '';
        if (mobile || telephone) {
          realPhones++;
        }
        
        // Check company
        const company = record.namecompany || '';
        if (company && company.trim() !== '') {
          companies++;
        }
        
        // Collect samples
        if (customerSamples.length < 15 && (firstName || email || company)) {
          customerSamples.push({
            id: record._id,
            name: `${firstName} ${lastName}`.trim(),
            email: email,
            phone: mobile || telephone,
            company: company
          });
        }
      });
      
      console.log('📊 GA4 Customer data quality:');
      console.log(`   📧 Real emails: ${realEmails} (${((realEmails/ga4Records.length)*100).toFixed(1)}%)`);
      console.log(`   👤 Real names: ${realNames} (${((realNames/ga4Records.length)*100).toFixed(1)}%)`);
      console.log(`   📱 Phone numbers: ${realPhones} (${((realPhones/ga4Records.length)*100).toFixed(1)}%)`);
      console.log(`   🏢 Companies: ${companies} (${((companies/ga4Records.length)*100).toFixed(1)}%)`);
      console.log('');
      
      console.log('👥 Sample GA4 customers (with correct field mapping):');
      customerSamples.forEach((c, i) => {
        const displayName = c.name || c.company || 'Unknown';
        const displayEmail = c.email || 'No email';
        const displayPhone = c.phone || 'No phone';
        console.log(`   ${i+1}. ${displayName} - ${displayEmail} (${displayPhone}) [ID: ${c.id}]`);
      });
      console.log('');
      
      console.log('2️⃣ FIELD MAPPING SOLUTION...');
      console.log('=============================');
      console.log('');
      console.log('🔧 CORRECT FIELD MAPPING:');
      console.log('   Database → GA4');
      console.log('   first_name → nameforename');
      console.log('   last_name → namesurname');
      console.log('   email → contactemail');
      console.log('   phone → contactmobile OR contacttelephone');
      console.log('   company → namecompany');
      console.log('');
      
      console.log('📊 IMPORT POTENTIAL:');
      if (realEmails > 100) {
        console.log(`   ✅ ${realEmails} customers with real emails - WORTH IMPORTING`);
      } else {
        console.log(`   ⚠️  Only ${realEmails} customers with real emails - LIMITED VALUE`);
      }
      
      if (realNames > 1000) {
        console.log(`   ✅ ${realNames} customers with real names - GOOD DATA QUALITY`);
      } else {
        console.log(`   ⚠️  Only ${realNames} customers with real names - POOR DATA QUALITY`);
      }
      
      console.log('');
      console.log('💡 RECOMMENDATION:');
      
      if (realEmails > 100 && realNames > 1000) {
        console.log('   ✅ PROCEED with customer import using correct field mapping');
        console.log('   ✅ Will add significant real customer data');
        console.log('   ✅ Use contactemail for deduplication');
      } else if (realNames > 1000) {
        console.log('   ⚠️  PROCEED with caution - good names but few emails');
        console.log('   ⚠️  Consider importing for name/phone data only');
      } else {
        console.log('   ❌ SKIP customer import - poor data quality');
        console.log('   ❌ Focus on documents and line items instead');
      }
    }
    
    console.log('');
    console.log('✅ GA4 FIELD MAPPING CHECK COMPLETE');
    
  } catch (error) {
    console.log('❌ GA4 FIELD MAPPING CHECK FAILED:', error.message);
  }
}

checkGA4Fields();
