#!/usr/bin/env node

/**
 * 🔧 FIXED COMPLETE IMPORT
 * Proper deduplication with ALL existing IDs
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIXED COMPLETE IMPORT');
console.log('=========================');
console.log('⏰ Start:', new Date().toLocaleTimeString());
console.log('🎯 Mission: Import remaining customers and documents with PROPER deduplication');
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

async function fixedCompleteImport() {
  try {
    console.log('1️⃣ INITIALIZING FIXED IMPORT...');
    
    const sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 30000,
      queryTimeoutMillis: 45000
    });
    
    await sql`SELECT 1`;
    console.log('✅ Database connected');
    console.log('');
    
    console.log('2️⃣ LOADING ALL EXISTING IDS FOR PROPER DEDUPLICATION...');
    
    // Load ALL existing customer and document IDs (not just 100!)
    console.log('   📊 Loading all existing customer IDs...');
    const existingCustomers = await sql`SELECT id FROM customers`;
    const existingCustomerIds = new Set(existingCustomers.map(c => c.id));
    
    console.log('   📊 Loading all existing document IDs...');
    const existingDocuments = await sql`SELECT id FROM customer_documents`;
    const existingDocumentIds = new Set(existingDocuments.map(d => d.id));
    
    console.log(`✅ Loaded ${existingCustomerIds.size} existing customer IDs`);
    console.log(`✅ Loaded ${existingDocumentIds.size} existing document IDs`);
    console.log('');
    
    const ga4Path = '/Users/adamrutstein/Desktop/GA4 EXPORT';
    
    // Import tracking
    const results = {
      customers: { processed: 0, imported: 0, skipped: 0, errors: 0 },
      documents: { processed: 0, imported: 0, skipped: 0, errors: 0 }
    };
    
    console.log('3️⃣ IMPORTING REMAINING CUSTOMERS...');
    console.log('===================================');
    
    const customersPath = path.join(ga4Path, 'Customers.csv');
    if (fs.existsSync(customersPath)) {
      const content = fs.readFileSync(customersPath, 'utf-8');
      const customerRecords = parseCSV(content);
      
      console.log(`📋 Total GA4 customers: ${customerRecords.length}`);
      console.log(`📊 Already in database: ${existingCustomerIds.size}`);
      
      // Pre-filter to find only new customers
      const newCustomers = customerRecords.filter(record => {
        const id = record._id;
        const firstName = record.nameforename || 'Unknown';
        
        return id && 
               !existingCustomerIds.has(id) && 
               firstName && 
               firstName !== 'Unknown';
      });
      
      console.log(`🎯 New customers to import: ${newCustomers.length}`);
      console.log('');
      
      if (newCustomers.length === 0) {
        console.log('✅ All customers already imported!');
      } else {
        const batchSize = 50;
        let batchCount = 0;
        
        for (let i = 0; i < newCustomers.length; i += batchSize) {
          const batch = newCustomers.slice(i, i + batchSize);
          batchCount++;
          
          console.log(`   ⚡ Customer batch ${batchCount}/${Math.ceil(newCustomers.length/batchSize)} (${batch.length} records)...`);
          
          for (const record of batch) {
            try {
              results.customers.processed++;
              
              const id = record._id;
              const firstName = record.nameforename;
              const lastName = record.namesurname || '';
              const email = record.contactemail || null;
              const phone = record.contactmobile || record.contacttelephone || null;
              const company = record.namecompany || null;
              const address = `${record.addresshouseno || ''} ${record.addressroad || ''}`.trim() || null;
              const postcode = record.addresspostcode || null;
              
              await sql`
                INSERT INTO customers (
                  id, first_name, last_name, email, phone, company, 
                  address, postcode, created_at, updated_at
                )
                VALUES (
                  ${id}, ${firstName}, ${lastName}, ${email}, ${phone}, ${company},
                  ${address}, ${postcode}, NOW(), NOW()
                )
              `;
              
              results.customers.imported++;
              
            } catch (error) {
              results.customers.errors++;
              if (!error.message.includes('duplicate')) {
                console.log(`      ⚠️  Customer error: ${error.message.substring(0, 60)}`);
              }
            }
          }
          
          // Progress update every 20 batches
          if (batchCount % 20 === 0) {
            const progress = Math.round((i / newCustomers.length) * 100);
            console.log(`   📊 Progress: ${progress}% (${results.customers.imported} imported, ${results.customers.errors} errors)`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`   ✅ Customer import: ${results.customers.imported} imported, ${results.customers.errors} errors`);
    }
    console.log('');
    
    console.log('4️⃣ IMPORTING REMAINING DOCUMENTS...');
    console.log('====================================');
    
    const documentsPath = path.join(ga4Path, 'Documents.csv');
    if (fs.existsSync(documentsPath)) {
      const content = fs.readFileSync(documentsPath, 'utf-8');
      const documentRecords = parseCSV(content);
      
      console.log(`📋 Total GA4 documents: ${documentRecords.length}`);
      console.log(`📊 Already in database: ${existingDocumentIds.size}`);
      
      // Pre-filter to find only new documents
      const newDocuments = documentRecords.filter(record => {
        const id = record._id;
        return id && !existingDocumentIds.has(id);
      });
      
      console.log(`🎯 New documents to import: ${newDocuments.length}`);
      console.log('');
      
      if (newDocuments.length === 0) {
        console.log('✅ All documents already imported!');
      } else {
        const batchSize = 100;
        let batchCount = 0;
        
        for (let i = 0; i < newDocuments.length; i += batchSize) {
          const batch = newDocuments.slice(i, i + batchSize);
          batchCount++;
          
          console.log(`   ⚡ Document batch ${batchCount}/${Math.ceil(newDocuments.length/batchSize)} (${batch.length} records)...`);
          
          for (const record of batch) {
            try {
              results.documents.processed++;
              
              const id = record._id;
              const customerId = record._id_customer;
              const vehicleReg = record.vehicle_registration;
              const documentType = record.doc_type || 'Invoice';
              const documentNumber = record.doc_number || record._id;
              const documentDate = record.doc_date;
              const totalGross = parseFloat(record.total_gross || 0);
              const totalNet = parseFloat(record.total_net || 0);
              const totalTax = parseFloat(record.total_tax || 0);
              const status = record.status || 'Active';
              
              await sql`
                INSERT INTO customer_documents (
                  id, customer_id, vehicle_registration, document_type, 
                  document_number, document_date, total_gross, total_net, 
                  total_tax, status, created_at, updated_at
                )
                VALUES (
                  ${id}, ${customerId}, ${vehicleReg}, ${documentType}, ${documentNumber}, 
                  ${documentDate}, ${totalGross}, ${totalNet}, ${totalTax}, ${status}, 
                  NOW(), NOW()
                )
              `;
              
              results.documents.imported++;
              
            } catch (error) {
              results.documents.errors++;
              if (!error.message.includes('duplicate')) {
                console.log(`      ⚠️  Document error: ${error.message.substring(0, 60)}`);
              }
            }
          }
          
          // Progress update every 50 batches
          if (batchCount % 50 === 0) {
            const progress = Math.round((i / newDocuments.length) * 100);
            console.log(`   📊 Progress: ${progress}% (${results.documents.imported} imported, ${results.documents.errors} errors)`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log(`   ✅ Document import: ${results.documents.imported} imported, ${results.documents.errors} errors`);
    }
    console.log('');
    
    console.log('5️⃣ FINAL VERIFICATION...');
    console.log('=========================');
    
    // Get final counts
    const [finalVehicles, finalCustomers, finalDocs, finalLineItems] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM customer_documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`
    ]);
    
    const finalLinkedVehicles = await sql`
      SELECT COUNT(*) as count FROM vehicles WHERE customer_id IS NOT NULL AND customer_id != ''
    `;
    
    console.log('📊 FINAL DATABASE TOTALS:');
    console.log(`   🚗 Vehicles: ${finalVehicles[0].count.toLocaleString()}`);
    console.log(`   👥 Customers: ${finalCustomers[0].count.toLocaleString()}`);
    console.log(`   📄 Documents: ${finalDocs[0].count.toLocaleString()}`);
    console.log(`   📋 Line Items: ${finalLineItems[0].count.toLocaleString()}`);
    console.log(`   🔗 Linked Vehicles: ${finalLinkedVehicles[0].count.toLocaleString()}`);
    console.log('');
    
    const totalRecords = finalVehicles[0].count + finalCustomers[0].count + finalDocs[0].count + finalLineItems[0].count;
    console.log(`🎊 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);
    console.log('');
    
    console.log('📈 THIS SESSION RESULTS:');
    console.log(`   👥 Customers: ${results.customers.imported} imported, ${results.customers.errors} errors`);
    console.log(`   📄 Documents: ${results.documents.imported} imported, ${results.documents.errors} errors`);
    console.log('');
    
    // Calculate completion rates
    const customerCompletion = Math.round((finalCustomers[0].count / 6961) * 100);
    const documentCompletion = Math.round((finalDocs[0].count / 33196) * 100);
    
    console.log('🎯 COMPLETION ASSESSMENT:');
    console.log('=========================');
    
    if (customerCompletion > 95 && documentCompletion > 95) {
      console.log('🎉 EXCELLENT! IMPORT COMPLETION SUCCESS!');
      console.log(`   ✅ Customers: ${customerCompletion}% complete (${finalCustomers[0].count}/${6961})`);
      console.log(`   ✅ Documents: ${documentCompletion}% complete (${finalDocs[0].count}/${33196})`);
      console.log('   ✅ Database is now comprehensive and complete');
    } else if (customerCompletion > 80 && documentCompletion > 80) {
      console.log('✅ GOOD! MAJOR IMPROVEMENT ACHIEVED!');
      console.log(`   ✅ Customers: ${customerCompletion}% complete (${finalCustomers[0].count}/${6961})`);
      console.log(`   ✅ Documents: ${documentCompletion}% complete (${finalDocs[0].count}/${33196})`);
      console.log('   💡 Most data successfully imported');
    } else {
      console.log('⚠️  PARTIAL SUCCESS - MORE WORK NEEDED');
      console.log(`   ⚠️  Customers: ${customerCompletion}% complete (${finalCustomers[0].count}/${6961})`);
      console.log(`   ⚠️  Documents: ${documentCompletion}% complete (${finalDocs[0].count}/${33196})`);
      console.log('   💡 Additional import attempts may be needed');
    }
    
    console.log('');
    console.log('✅ FIXED COMPLETE IMPORT FINISHED!');
    console.log('==================================');
    
  } catch (error) {
    console.log('❌ FIXED IMPORT FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

fixedCompleteImport();
