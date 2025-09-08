#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkImportIssue() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING IMPORT ISSUE');
    console.log('========================\n');

    // Check if _id_customer field has data
    const customerLinks = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(_id_customer) as with_customer,
             COUNT(customer_name) as with_name,
             COUNT(total_gross) as with_total
      FROM documents
    `);
    
    console.log('📊 Data completeness:');
    const stats = customerLinks.rows[0];
    console.log(`   Total documents: ${stats.total}`);
    console.log(`   With customer ID: ${stats.with_customer}`);
    console.log(`   With customer name: ${stats.with_name}`);
    console.log(`   With total amount: ${stats.with_total}`);
    
    // Sample a few documents to see what data we have
    console.log('\n📄 Sample document data:');
    const samples = await client.query(`
      SELECT _id, _id_customer, doc_number, customer_name, total_gross, doc_status, status
      FROM documents 
      WHERE _id_customer IS NOT NULL
      LIMIT 5
    `);
    
    samples.rows.forEach((doc: any, i: number) => {
      console.log(`   ${i + 1}. ID: ${doc._id}, Customer: ${doc._id_customer}, Name: '${doc.customer_name}', Total: £${doc.total_gross}`);
    });

    // Check if we can link to customers table
    console.log('\n🔗 Checking customer links:');
    const linkedCustomers = await client.query(`
      SELECT d._id, d._id_customer, c.first_name, c.last_name, d.total_gross
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d._id_customer IS NOT NULL
      LIMIT 5
    `);
    
    if (linkedCustomers.rows.length > 0) {
      console.log('✅ Found linked customers:');
      linkedCustomers.rows.forEach((doc: any, i: number) => {
        console.log(`   ${i + 1}. Customer: ${doc.first_name} ${doc.last_name} (${doc._id_customer}), Total: £${doc.total_gross}`);
      });
    } else {
      console.log('❌ No linked customers found');
    }

    // Check the original CSV data structure
    console.log('\n📋 Checking what fields we should have imported:');
    const sampleDoc = await client.query(`
      SELECT * FROM documents LIMIT 1
    `);
    
    if (sampleDoc.rows.length > 0) {
      const doc = sampleDoc.rows[0];
      console.log('Available fields in documents table:');
      Object.keys(doc).forEach(key => {
        const value = doc[key];
        console.log(`   ${key}: ${value === null ? 'NULL' : typeof value === 'string' ? `'${value}'` : value}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error checking import issue:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkImportIssue().catch(console.error);
