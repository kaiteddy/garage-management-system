#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDataRelationships() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING DATA RELATIONSHIPS');
    console.log('==============================\n');

    // Check document age distribution
    const ageCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 1 END) as last_90_days
      FROM documents
    `);
    
    console.log('📅 Document age distribution:');
    const age = ageCheck.rows[0];
    console.log(`   Total documents: ${age.total}`);
    console.log(`   Last 7 days: ${age.last_7_days}`);
    console.log(`   Last 30 days: ${age.last_30_days}`);
    console.log(`   Last 90 days: ${age.last_90_days}`);
    
    // Check line items relationships
    const lineItemCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT li.document_id) as docs_with_items,
        COUNT(DISTINCT d._id) as total_docs,
        COUNT(li.id) as total_items
      FROM documents d
      LEFT JOIN line_items li ON d._id = li.document_id
    `);
    
    console.log('\n📊 Line items relationships:');
    const li = lineItemCheck.rows[0];
    console.log(`   Documents with line items: ${li.docs_with_items}`);
    console.log(`   Total documents: ${li.total_docs}`);
    console.log(`   Total line items: ${li.total_items}`);
    
    // Check document extras relationships
    const extrasCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT de.document_id) as docs_with_extras,
        COUNT(DISTINCT d._id) as total_docs,
        COUNT(de.id) as total_extras
      FROM documents d
      LEFT JOIN document_extras de ON d._id = de.document_id
    `);
    
    console.log('\n📋 Document extras relationships:');
    const ex = extrasCheck.rows[0];
    console.log(`   Documents with extras: ${ex.docs_with_extras}`);
    console.log(`   Total documents: ${ex.total_docs}`);
    console.log(`   Total extras: ${ex.total_extras}`);
    
    // Sample some documents with their related data
    console.log('\n📄 Sample documents with relationships:');
    const sampleDocs = await client.query(`
      SELECT 
        d._id,
        d.doc_number,
        d.created_at,
        COUNT(li.id) as item_count,
        COUNT(de.id) as extra_count
      FROM documents d
      LEFT JOIN line_items li ON d._id = li.document_id
      LEFT JOIN document_extras de ON d._id = de.document_id
      GROUP BY d._id, d.doc_number, d.created_at
      ORDER BY d.created_at DESC
      LIMIT 10
    `);
    
    sampleDocs.rows.forEach((doc: any, i: number) => {
      console.log(`   ${i + 1}. ${doc.doc_number} (${new Date(doc.created_at).toLocaleDateString()}) - ${doc.item_count} items, ${doc.extra_count} extras`);
    });

    // Check if the issue is with the join condition
    console.log('\n🔗 Testing join conditions:');
    
    // Check if document IDs match between tables
    const idCheck = await client.query(`
      SELECT 
        'documents' as table_name,
        COUNT(*) as total,
        COUNT(CASE WHEN _id IS NOT NULL THEN 1 END) as with_id
      FROM documents
      UNION ALL
      SELECT 
        'line_items' as table_name,
        COUNT(*) as total,
        COUNT(CASE WHEN document_id IS NOT NULL THEN 1 END) as with_id
      FROM line_items
      UNION ALL
      SELECT 
        'document_extras' as table_name,
        COUNT(*) as total,
        COUNT(CASE WHEN document_id IS NOT NULL THEN 1 END) as with_id
      FROM document_extras
    `);
    
    console.log('ID field analysis:');
    idCheck.rows.forEach((row: any) => {
      console.log(`   ${row.table_name}: ${row.total} total, ${row.with_id} with ID`);
    });

    // Sample some actual IDs to see if they match
    console.log('\n🆔 Sample document IDs:');
    const docIds = await client.query('SELECT _id FROM documents WHERE _id IS NOT NULL LIMIT 5');
    const lineItemIds = await client.query('SELECT DISTINCT document_id FROM line_items LIMIT 5');
    const extraIds = await client.query('SELECT DISTINCT document_id FROM document_extras LIMIT 5');
    
    console.log('Document IDs:');
    docIds.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row._id}`);
    });
    
    console.log('Line item document IDs:');
    lineItemIds.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.document_id}`);
    });
    
    console.log('Extra document IDs:');
    extraIds.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.document_id}`);
    });

  } catch (error: any) {
    console.error('❌ Error checking data relationships:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkDataRelationships().catch(console.error);
