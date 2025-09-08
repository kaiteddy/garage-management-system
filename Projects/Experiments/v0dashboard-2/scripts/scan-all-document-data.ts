#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function scanAllDocumentData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 SCANNING ALL DOCUMENT-RELATED DATA');
    console.log('=====================================\n');

    // 1. Check documents table
    console.log('📄 DOCUMENTS TABLE:');
    const docCount = await client.query('SELECT COUNT(*) FROM documents');
    console.log(`   Total documents: ${docCount.rows[0].count}`);
    
    const docSample = await client.query(`
      SELECT doc_number, doc_type, customer_name, total_gross, _id_customer, doc_status
      FROM documents 
      WHERE doc_number IS NOT NULL
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('   Sample documents:');
    docSample.rows.forEach((doc: any, i: number) => {
      console.log(`     ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - ${doc.customer_name || 'NO NAME'} - £${doc.total_gross || '0'} - Customer: ${doc._id_customer || 'NONE'}`);
    });

    // 2. Check line_items table
    console.log('\n📊 LINE_ITEMS TABLE:');
    const lineItemsCount = await client.query('SELECT COUNT(*) FROM line_items');
    console.log(`   Total line items: ${lineItemsCount.rows[0].count}`);
    
    // First check what columns exist in line_items
    const lineItemsColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'line_items'
      ORDER BY ordinal_position
    `);

    console.log('   Line items columns:');
    lineItemsColumns.rows.forEach((col: any) => {
      console.log(`     - ${col.column_name}`);
    });

    const lineItemsSample = await client.query(`
      SELECT * FROM line_items
      ORDER BY id DESC
      LIMIT 3
    `);

    console.log('   Sample line items:');
    lineItemsSample.rows.forEach((item: any, i: number) => {
      console.log(`     ${i + 1}. Doc: ${item.document_id} - ${item.description} - Qty: ${item.quantity}`);
      console.log(`        Fields: ${Object.keys(item).map(k => `${k}=${item[k]}`).join(', ')}`);
    });

    // 3. Check document_extras table
    console.log('\n📋 DOCUMENT_EXTRAS TABLE:');
    const extrasCount = await client.query('SELECT COUNT(*) FROM document_extras');
    console.log(`   Total document extras: ${extrasCount.rows[0].count}`);

    // Check what columns exist in document_extras
    const extrasColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'document_extras'
      ORDER BY ordinal_position
    `);

    console.log('   Document extras columns:');
    extrasColumns.rows.forEach((col: any) => {
      console.log(`     - ${col.column_name}`);
    });

    const extrasSample = await client.query(`
      SELECT * FROM document_extras
      ORDER BY id DESC
      LIMIT 3
    `);

    console.log('   Sample document extras:');
    extrasSample.rows.forEach((extra: any, i: number) => {
      console.log(`     ${i + 1}. Doc: ${extra.document_id}`);
      console.log(`        Fields: ${Object.keys(extra).map(k => `${k}=${extra[k]}`).join(', ')}`);
    });

    // 4. Check relationships between tables
    console.log('\n🔗 CHECKING RELATIONSHIPS:');
    
    // Find documents with line items (using correct column names)
    const docsWithItems = await client.query(`
      SELECT d.doc_number, d.doc_type, d.customer_name, COUNT(li.id) as item_count
      FROM documents d
      LEFT JOIN line_items li ON d._id = li.document_id
      WHERE d.doc_number IS NOT NULL
      GROUP BY d.doc_number, d.doc_type, d.customer_name
      HAVING COUNT(li.id) > 0
      ORDER BY item_count DESC
      LIMIT 5
    `);

    console.log('   Documents with line items:');
    docsWithItems.rows.forEach((doc: any, i: number) => {
      console.log(`     ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - ${doc.customer_name || 'NO NAME'} - ${doc.item_count} items`);
    });

    // Find documents with extras
    const docsWithExtras = await client.query(`
      SELECT d.doc_number, d.doc_type, COUNT(de.id) as extra_count
      FROM documents d
      LEFT JOIN document_extras de ON d._id = de.document_id
      WHERE d.doc_number IS NOT NULL
      GROUP BY d.doc_number, d.doc_type
      HAVING COUNT(de.id) > 0
      ORDER BY extra_count DESC
      LIMIT 5
    `);
    
    console.log('   Documents with extras:');
    docsWithExtras.rows.forEach((doc: any, i: number) => {
      console.log(`     ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - ${doc.extra_count} extras`);
    });

    // 5. Check for potential job sheets by looking at line items
    console.log('\n🔧 LOOKING FOR JOB SHEET PATTERNS:');
    
    // Look for service/labour items (without total_price for now)
    const serviceItems = await client.query(`
      SELECT li.document_id, li.description, d.doc_number, d.customer_name
      FROM line_items li
      JOIN documents d ON li.document_id = d._id
      WHERE li.description ILIKE '%service%'
         OR li.description ILIKE '%labour%'
         OR li.description ILIKE '%repair%'
         OR li.description ILIKE '%mot%'
      LIMIT 5
    `);

    if (serviceItems.rows.length > 0) {
      console.log('   Found service/labour items:');
      serviceItems.rows.forEach((item: any, i: number) => {
        console.log(`     ${i + 1}. Doc ${item.doc_number}: ${item.description} - Customer: ${item.customer_name || 'NO NAME'}`);
      });
    } else {
      console.log('   ❌ No obvious service items found');
    }

    // 6. Check document status patterns
    console.log('\n📊 DOCUMENT STATUS ANALYSIS:');
    
    // Skip status extras check for now since we need to see the column structure first
    console.log('   Status analysis will be done after seeing the column structure');

  } catch (error: any) {
    console.error('❌ Error scanning document data:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the scan
scanAllDocumentData().catch(console.error);
