#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function scanDocuments() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 SCANNING ALL DOCUMENTS IN DATABASE');
    console.log('====================================\n');

    // Check what tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%document%'
      ORDER BY table_name
    `);
    
    console.log('📋 Document-related tables:');
    tables.rows.forEach(row => {
      console.log(`   ${row.table_name}`);
    });
    
    // Check documents table structure
    console.log('\n📊 Documents table structure:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Sample documents to see actual data
    console.log('\n📄 Sample documents:');
    const samples = await client.query(`
      SELECT doc_type, doc_status, status, doc_number, customer_name, total_gross, created_at
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    samples.rows.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.doc_number} - Type: '${doc.doc_type}' - Status: '${doc.doc_status}'/'${doc.status}' - ${doc.customer_name} - £${doc.total_gross}`);
    });
    
    // Count by document type
    console.log('\n📊 Document types distribution:');
    const typeStats = await client.query(`
      SELECT doc_type, COUNT(*) as count 
      FROM documents 
      GROUP BY doc_type 
      ORDER BY count DESC
    `);
    
    typeStats.rows.forEach(row => {
      console.log(`   ${row.doc_type}: ${row.count}`);
    });
    
    // Count by status
    console.log('\n📊 Document statuses distribution:');
    const statusStats = await client.query(`
      SELECT doc_status, COUNT(*) as count 
      FROM documents 
      WHERE doc_status IS NOT NULL AND doc_status != ''
      GROUP BY doc_status 
      ORDER BY count DESC
    `);
    
    statusStats.rows.forEach(row => {
      console.log(`   '${row.doc_status}': ${row.count}`);
    });
    
    // Check for potential job sheets
    console.log('\n🔧 Looking for potential job sheets...');
    const potentialJobSheets = await client.query(`
      SELECT doc_type, doc_status, status, COUNT(*) as count
      FROM documents 
      WHERE doc_type ILIKE '%job%' 
         OR doc_type ILIKE '%sheet%' 
         OR doc_type ILIKE '%work%'
         OR doc_type ILIKE '%service%'
         OR doc_type = 'JS'
         OR doc_status ILIKE '%open%'
         OR doc_status ILIKE '%progress%'
         OR doc_status ILIKE '%pending%'
      GROUP BY doc_type, doc_status, status
      ORDER BY count DESC
    `);
    
    if (potentialJobSheets.rows.length > 0) {
      console.log('Found potential job sheets:');
      potentialJobSheets.rows.forEach(row => {
        console.log(`   Type: '${row.doc_type}', Status: '${row.doc_status}'/'${row.status}' - Count: ${row.count}`);
      });
    } else {
      console.log('❌ No obvious job sheets found');
    }
    
    // Check recent documents that might be open
    console.log('\n📅 Recent documents (last 30 days):');
    const recentDocs = await client.query(`
      SELECT doc_type, doc_status, status, COUNT(*) as count
      FROM documents 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY doc_type, doc_status, status
      ORDER BY count DESC
      LIMIT 10
    `);
    
    recentDocs.rows.forEach(row => {
      console.log(`   Type: '${row.doc_type}', Status: '${row.doc_status}'/'${row.status}' - Count: ${row.count}`);
    });

    // Look for estimates that might be open job sheets
    console.log('\n💡 Checking estimates that could be open job sheets:');
    const openEstimates = await client.query(`
      SELECT doc_type, doc_status, status, doc_number, customer_name, total_gross, created_at
      FROM documents 
      WHERE doc_type = 'Estimate'
        AND (doc_status != 'Issued' OR doc_status IS NULL OR doc_status = '')
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (openEstimates.rows.length > 0) {
      console.log('Found potential open estimates:');
      openEstimates.rows.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.doc_number} - Status: '${doc.doc_status}' - ${doc.customer_name} - £${doc.total_gross} (${new Date(doc.created_at).toLocaleDateString()})`);
      });
    } else {
      console.log('❌ No open estimates found');
    }

    // Check all unique status combinations
    console.log('\n🔍 All unique status combinations:');
    const allStatuses = await client.query(`
      SELECT DISTINCT doc_type, doc_status, status, COUNT(*) as count
      FROM documents 
      GROUP BY doc_type, doc_status, status
      ORDER BY doc_type, count DESC
    `);
    
    console.log('Complete status breakdown:');
    allStatuses.rows.forEach(row => {
      console.log(`   ${row.doc_type} | doc_status: '${row.doc_status}' | status: '${row.status}' | count: ${row.count}`);
    });

  } catch (error: any) {
    console.error('❌ Error scanning documents:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the scan
scanDocuments().catch(console.error);
