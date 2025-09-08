#!/usr/bin/env node

/**
 * 🔍 DEEP CUSTOMER AUDIT
 * Comprehensive investigation of missing customers
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔍 DEEP CUSTOMER AUDIT');
console.log('=======================');
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

async function deepCustomerAudit() {
  try {
    console.log('1️⃣ CONNECTING TO DATABASE...');
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 120000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ COMPREHENSIVE DATABASE ANALYSIS...');
    
    // Check vehicle-customer relationships
    const vehicleCustomerStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(DISTINCT customer_id) as unique_customer_ids,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as vehicles_with_customers,
        COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as vehicles_without_customers
      FROM vehicles
    `;
    
    const vcs = vehicleCustomerStats[0];
    console.log('🚗 Vehicle-Customer Relationship Analysis:');
    console.log(`   Total vehicles: ${vcs.total_vehicles}`);
    console.log(`   Unique customer IDs: ${vcs.unique_customer_ids}`);
    console.log(`   Vehicles with customers: ${vcs.vehicles_with_customers}`);
    console.log(`   Vehicles without customers: ${vcs.vehicles_without_customers}`);
    console.log('');
    
    // Check document-customer relationships
    const docCustomerStats = await sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(DISTINCT customer_id) as unique_customer_ids,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as docs_with_customers,
        COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as docs_without_customers
      FROM customer_documents
    `;
    
    const dcs = docCustomerStats[0];
    console.log('📄 Document-Customer Relationship Analysis:');
    console.log(`   Total documents: ${dcs.total_documents}`);
    console.log(`   Unique customer IDs: ${dcs.unique_customer_ids}`);
    console.log(`   Documents with customers: ${dcs.docs_with_customers}`);
    console.log(`   Documents without customers: ${dcs.docs_without_customers}`);
    console.log('');
    
    // Check if customer IDs exist in customers table
    const orphanedCustomerIds = await sql`
      SELECT DISTINCT v.customer_id, COUNT(*) as vehicle_count
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id::text
      WHERE v.customer_id IS NOT NULL 
        AND c.id IS NULL
      GROUP BY v.customer_id
      ORDER BY vehicle_count DESC
      LIMIT 20
    `;
    
    console.log('🔍 Orphaned Customer IDs (vehicles point to non-existent customers):');
    if (orphanedCustomerIds.length > 0) {
      orphanedCustomerIds.forEach((row, i) => {
        console.log(`   ${i+1}. Customer ID: ${row.customer_id} (${row.vehicle_count} vehicles)`);
      });
    } else {
      console.log('   ✅ No orphaned customer IDs found');
    }
    console.log('');
    
    // Check customer table structure and data
    const customerSample = await sql`
      SELECT id, first_name, last_name, email, phone, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    console.log('👥 Customer Table Sample (most recent):');
    customerSample.forEach((c, i) => {
      const name = `${c.first_name || 'Unknown'} ${c.last_name || ''}`.trim();
      const email = c.email || 'No email';
      console.log(`   ${i+1}. ID: ${c.id} - ${name} - ${email}`);
    });
    console.log('');
    
    console.log('3️⃣ ANALYZING ALL GA4 FILES FOR CUSTOMER REFERENCES...');
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    if (!fs.existsSync(ga4Path)) {
      console.log('❌ GA4 Export folder not found');
      return;
    }
    
    const files = fs.readdirSync(ga4Path).filter(f => f.endsWith('.csv'));
    console.log(`📁 Found ${files.length} GA4 files to analyze`);
    console.log('');
    
    // Analyze each file for customer references
    const customerIdSets = {};
    
    for (const filename of files) {
      const filePath = path.join(ga4Path, filename);
      console.log(`📄 Analyzing ${filename}...`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parseCSV(content);
        
        console.log(`   📋 Records: ${records.length}`);
        
        if (records.length > 0) {
          const sampleRecord = records[0];
          const customerFields = Object.keys(sampleRecord).filter(key => 
            key.includes('customer') || key.includes('_id_customer')
          );
          
          if (customerFields.length > 0) {
            console.log(`   🔗 Customer reference fields: ${customerFields.join(', ')}`);
            
            // Collect unique customer IDs
            const uniqueCustomerIds = new Set();
            records.forEach(record => {
              customerFields.forEach(field => {
                const customerId = record[field];
                if (customerId && customerId.trim() !== '') {
                  uniqueCustomerIds.add(customerId);
                }
              });
            });
            
            customerIdSets[filename] = uniqueCustomerIds;
            console.log(`   👥 Unique customer IDs: ${uniqueCustomerIds.size}`);
            
            // Show sample customer IDs
            const sampleIds = Array.from(uniqueCustomerIds).slice(0, 5);
            console.log(`   📊 Sample IDs: ${sampleIds.join(', ')}`);
          } else {
            console.log(`   ⚠️  No customer reference fields found`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading ${filename}: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('4️⃣ CUSTOMER ID CROSS-REFERENCE ANALYSIS...');
    
    // Find all unique customer IDs across all files
    const allCustomerIds = new Set();
    Object.values(customerIdSets).forEach(idSet => {
      idSet.forEach(id => allCustomerIds.add(id));
    });
    
    console.log(`📊 Total unique customer IDs across all GA4 files: ${allCustomerIds.size}`);
    console.log('');
    
    // Compare with actual Customers.csv
    if (customerIdSets['Customers.csv']) {
      const customersFileIds = customerIdSets['Customers.csv'].size;
      const referencedIds = allCustomerIds.size;
      
      console.log('🔍 Customer ID Analysis:');
      console.log(`   📄 Customers.csv has: ${customersFileIds} customer records`);
      console.log(`   🔗 Referenced across all files: ${referencedIds} unique customer IDs`);
      
      if (referencedIds > customersFileIds) {
        console.log(`   ⚠️  MISSING CUSTOMERS: ${referencedIds - customersFileIds} customer IDs are referenced but not in Customers.csv!`);
      } else if (customersFileIds > referencedIds) {
        console.log(`   ℹ️  EXTRA CUSTOMERS: ${customersFileIds - referencedIds} customers in Customers.csv are not referenced elsewhere`);
      } else {
        console.log(`   ✅ PERFECT MATCH: All customer IDs align`);
      }
    }
    console.log('');
    
    console.log('5️⃣ RECOMMENDATIONS...');
    console.log('======================');
    console.log('');
    
    const totalReferencedCustomers = allCustomerIds.size;
    const currentDbCustomers = parseInt(customerSample.length > 0 ? '1834' : '0'); // From previous query
    
    console.log('🎯 FINDINGS:');
    console.log(`   📊 Current database customers: ${currentDbCustomers}`);
    console.log(`   📊 GA4 referenced customers: ${totalReferencedCustomers}`);
    console.log(`   📊 Vehicles in database: ${vcs.total_vehicles}`);
    console.log(`   📊 Documents in database: ${dcs.total_documents}`);
    console.log('');
    
    if (totalReferencedCustomers > currentDbCustomers * 2) {
      console.log('💡 RECOMMENDATION:');
      console.log('   🚨 MAJOR CUSTOMER DATA MISSING!');
      console.log('   ✅ PROCEED with full customer import');
      console.log('   ✅ Many customers are referenced but missing from database');
      console.log('   ✅ This explains the vehicle/document to customer ratio');
    } else if (totalReferencedCustomers > currentDbCustomers) {
      console.log('💡 RECOMMENDATION:');
      console.log('   ⚠️  Some customer data missing');
      console.log('   ✅ Import additional customers');
      console.log('   ✅ Will improve data relationships');
    } else {
      console.log('💡 RECOMMENDATION:');
      console.log('   ✅ Customer data appears complete');
      console.log('   ℹ️  Focus on other data types');
    }
    
    console.log('');
    console.log('✅ DEEP CUSTOMER AUDIT COMPLETE');
    
  } catch (error) {
    console.log('❌ DEEP CUSTOMER AUDIT FAILED:', error.message);
  }
}

deepCustomerAudit();
