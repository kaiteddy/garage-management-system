#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkAllDocuments() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING ALL AVAILABLE DOCUMENTS');
    console.log('===================================\n');

    // Check total documents by age
    const ageDistribution = await client.query(`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 1 END) as last_90_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 year' THEN 1 END) as last_year,
        MIN(created_at) as oldest_doc,
        MAX(created_at) as newest_doc
      FROM documents
    `);
    
    console.log('📅 Document age distribution:');
    const age = ageDistribution.rows[0];
    console.log(`   Total documents: ${age.total_docs}`);
    console.log(`   Last 7 days: ${age.last_7_days}`);
    console.log(`   Last 30 days: ${age.last_30_days}`);
    console.log(`   Last 90 days: ${age.last_90_days}`);
    console.log(`   Last year: ${age.last_year}`);
    console.log(`   Date range: ${new Date(age.oldest_doc).toLocaleDateString()} to ${new Date(age.newest_doc).toLocaleDateString()}`);
    
    // Check documents with line items across all time
    const docsWithItems = await client.query(`
      SELECT 
        COUNT(DISTINCT d.doc_number) as docs_with_items,
        COUNT(DISTINCT li.document_id) as unique_line_item_docs,
        COUNT(li.id) as total_line_items,
        SUM(li.total_amount) as total_value
      FROM documents d
      INNER JOIN line_items li ON d.doc_number = li.document_id
    `);
    
    console.log('\n📊 Documents with line items (ALL TIME):');
    const items = docsWithItems.rows[0];
    console.log(`   Documents with line items: ${items.docs_with_items}`);
    console.log(`   Unique line item documents: ${items.unique_line_item_docs}`);
    console.log(`   Total line items: ${items.total_line_items}`);
    console.log(`   Total value: £${parseFloat(items.total_value || '0').toFixed(2)}`);
    
    // Check documents with extras across all time
    const docsWithExtras = await client.query(`
      SELECT 
        COUNT(DISTINCT d.doc_number) as docs_with_extras,
        COUNT(DISTINCT de.document_id) as unique_extra_docs,
        COUNT(de.id) as total_extras
      FROM documents d
      INNER JOIN document_extras de ON d.doc_number = de.document_id
    `);
    
    console.log('\n📋 Documents with extras (ALL TIME):');
    const extras = docsWithExtras.rows[0];
    console.log(`   Documents with extras: ${extras.docs_with_extras}`);
    console.log(`   Unique extra documents: ${extras.unique_extra_docs}`);
    console.log(`   Total extras: ${extras.total_extras}`);
    
    // Sample older documents to see the data range
    console.log('\n📄 Sample documents across time periods:');
    const sampleDocs = await client.query(`
      SELECT 
        d.doc_number,
        d.created_at,
        COUNT(li.id) as item_count,
        COUNT(de.id) as extra_count,
        COALESCE(SUM(li.total_amount), 0) as total_amount
      FROM documents d
      LEFT JOIN line_items li ON d.doc_number = li.document_id
      LEFT JOIN document_extras de ON d.doc_number = de.document_id
      GROUP BY d.doc_number, d.created_at
      HAVING COUNT(li.id) > 0 OR COUNT(de.id) > 0
      ORDER BY d.created_at ASC
      LIMIT 10
    `);
    
    console.log('Oldest documents with data:');
    sampleDocs.rows.forEach((doc: any, i: number) => {
      console.log(`   ${i + 1}. ${doc.doc_number} (${new Date(doc.created_at).toLocaleDateString()}) - ${doc.item_count} items, ${doc.extra_count} extras, £${parseFloat(doc.total_amount).toFixed(2)}`);
    });

    // Check what percentage of documents have data
    console.log('\n📈 Data completeness analysis:');
    const completeness = await client.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN li.document_id IS NOT NULL OR de.document_id IS NOT NULL THEN 1 END) as docs_with_data,
        ROUND(
          (COUNT(CASE WHEN li.document_id IS NOT NULL OR de.document_id IS NOT NULL THEN 1 END)::float / COUNT(*)::float) * 100, 
          2
        ) as percentage_with_data
      FROM documents d
      LEFT JOIN line_items li ON d.doc_number = li.document_id
      LEFT JOIN document_extras de ON d.doc_number = de.document_id
    `);
    
    const comp = completeness.rows[0];
    console.log(`   Total documents: ${comp.total_documents}`);
    console.log(`   Documents with data: ${comp.docs_with_data}`);
    console.log(`   Percentage with data: ${comp.percentage_with_data}%`);

  } catch (error: any) {
    console.error('❌ Error checking all documents:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkAllDocuments().catch(console.error);
