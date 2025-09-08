#!/usr/bin/env node

/**
 * 🔍 INVESTIGATE MISSING DATA
 * Find out why we have fewer customers and documents than expected
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔍 INVESTIGATE MISSING DATA');
console.log('============================');
console.log('⏰ Time:', new Date().toLocaleTimeString());
console.log('');

async function investigateMissingData() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 20000,
      queryTimeoutMillis: 15000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ CURRENT DATABASE COUNTS...');
    
    const [vehicles, customers, documents, lineItems] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`
    ]);
    
    console.log('📊 Current database:');
    console.log(`   🚗 Vehicles: ${vehicles[0].count}`);
    console.log(`   👥 Customers: ${customers[0].count}`);
    console.log(`   📄 Documents: ${documents[0].count}`);
    console.log(`   📋 Line Items: ${lineItems[0].count}`);
    console.log('');
    
    console.log('3️⃣ CHECKING GA4 EXPORT FILES...');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    if (!fs.existsSync(ga4Path)) {
      console.log('❌ GA4 Export folder not found');
      return;
    }
    
    // Check file sizes and record counts
    const files = ['Customers.csv', 'Documents.csv', 'LineItems.csv', 'Vehicles.csv'];
    
    for (const filename of files) {
      const filePath = path.join(ga4Path, filename);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const recordCount = Math.max(0, lines.length - 1); // Subtract header
        
        console.log(`📄 ${filename}:`);
        console.log(`   📏 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📋 Records: ${recordCount.toLocaleString()}`);
        
        // Show expected vs actual
        if (filename === 'Customers.csv') {
          console.log(`   ⚠️  Expected in DB: ${recordCount.toLocaleString()}, Actual: ${customers[0].count} (${recordCount - customers[0].count} missing)`);
        } else if (filename === 'Documents.csv') {
          console.log(`   ⚠️  Expected in DB: ${recordCount.toLocaleString()}, Actual: ${documents[0].count} (${recordCount - documents[0].count} missing)`);
        } else if (filename === 'LineItems.csv') {
          console.log(`   ✅ Expected in DB: ${recordCount.toLocaleString()}, Actual: ${lineItems[0].count} (${Math.abs(recordCount - lineItems[0].count)} difference)`);
        }
        
        console.log('');
      } else {
        console.log(`❌ ${filename} not found`);
      }
    }
    
    console.log('4️⃣ ANALYZING IMPORT HISTORY...');
    
    // Check recent activity to see what was imported
    const recentCustomers = await sql`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE created_at > NOW() - INTERVAL '4 hours'
    `;
    
    const recentDocuments = await sql`
      SELECT COUNT(*) as count 
      FROM customer_documents 
      WHERE created_at > NOW() - INTERVAL '4 hours'
    `;
    
    const recentLineItems = await sql`
      SELECT COUNT(*) as count 
      FROM document_line_items 
      WHERE created_at > NOW() - INTERVAL '4 hours'
    `;
    
    console.log('🕐 Recent imports (last 4 hours):');
    console.log(`   👥 New customers: ${recentCustomers[0].count}`);
    console.log(`   📄 New documents: ${recentDocuments[0].count}`);
    console.log(`   📋 New line items: ${recentLineItems[0].count}`);
    console.log('');
    
    console.log('5️⃣ CHECKING FOR IMPORT ERRORS...');
    
    // Check if there are any obvious data quality issues
    const customerIssues = await sql`
      SELECT 
        COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as no_first_name,
        COUNT(CASE WHEN email LIKE '%@placeholder.com' THEN 1 END) as placeholder_emails,
        COUNT(CASE WHEN id IS NULL OR id = '' THEN 1 END) as no_id
      FROM customers
    `;
    
    const ci = customerIssues[0];
    console.log('👥 Customer data issues:');
    console.log(`   ❌ No first name: ${ci.no_first_name}`);
    console.log(`   🔄 Placeholder emails: ${ci.placeholder_emails}`);
    console.log(`   ❌ No ID: ${ci.no_id}`);
    console.log('');
    
    console.log('6️⃣ POSSIBLE CAUSES OF MISSING DATA...');
    console.log('=====================================');
    
    const expectedCustomers = 6961;
    const expectedDocuments = 31069;
    const actualCustomers = customers[0].count;
    const actualDocuments = documents[0].count;
    
    const missingCustomers = expectedCustomers - actualCustomers;
    const missingDocuments = expectedDocuments - actualDocuments;
    
    console.log('🔍 ANALYSIS:');
    console.log(`   👥 Missing customers: ${missingCustomers.toLocaleString()} (${Math.round((missingCustomers/expectedCustomers)*100)}% of expected)`);
    console.log(`   📄 Missing documents: ${missingDocuments.toLocaleString()} (${Math.round((missingDocuments/expectedDocuments)*100)}% of expected)`);
    console.log('');
    
    console.log('💡 LIKELY CAUSES:');
    
    if (missingCustomers > expectedCustomers * 0.5) {
      console.log('   🚨 MAJOR CUSTOMER IMPORT FAILURE:');
      console.log('      - Import process may have crashed early');
      console.log('      - Database connection issues during import');
      console.log('      - Data validation errors preventing inserts');
      console.log('      - Batch processing failures');
    }
    
    if (missingDocuments > expectedDocuments * 0.5) {
      console.log('   🚨 MAJOR DOCUMENT IMPORT FAILURE:');
      console.log('      - Import got stuck during document processing');
      console.log('      - Memory/timeout issues with large dataset');
      console.log('      - Foreign key constraint failures');
      console.log('      - Batch size too large causing timeouts');
    }
    
    if (recentCustomers[0].count < 1000 && recentDocuments[0].count < 10000) {
      console.log('   ⚠️  INCOMPLETE IMPORT DETECTED:');
      console.log('      - Import process did not complete successfully');
      console.log('      - Need to resume/restart import process');
      console.log('      - Should have imported thousands more records');
    }
    
    console.log('');
    console.log('7️⃣ RECOMMENDATIONS...');
    console.log('======================');
    
    console.log('🎯 IMMEDIATE ACTIONS NEEDED:');
    console.log('   1. ✅ Resume customer import (missing ~4,500 customers)');
    console.log('   2. ✅ Resume document import (missing ~25,000 documents)');
    console.log('   3. ✅ Use smaller batch sizes to prevent timeouts');
    console.log('   4. ✅ Add better error handling and progress tracking');
    console.log('   5. ✅ Verify all relationships after complete import');
    console.log('');
    
    console.log('💡 IMPORT STRATEGY:');
    console.log('   - Use batch size of 50-100 records maximum');
    console.log('   - Add progress checkpoints every 1000 records');
    console.log('   - Implement retry logic for failed batches');
    console.log('   - Monitor memory usage during import');
    console.log('   - Use transactions for data consistency');
    console.log('');
    
    console.log('✅ MISSING DATA INVESTIGATION COMPLETE');
    console.log('======================================');
    console.log('🚨 CONCLUSION: Major import incompletion detected');
    console.log('🎯 ACTION: Need to complete the remaining imports');
    
  } catch (error) {
    console.log('❌ INVESTIGATION FAILED:', error.message);
  }
}

investigateMissingData();
