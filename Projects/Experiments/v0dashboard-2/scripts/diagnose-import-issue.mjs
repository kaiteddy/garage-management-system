#!/usr/bin/env node

/**
 * 🔍 DIAGNOSE IMPORT ISSUE
 * 
 * Find out why the import is stalling
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.NEON_DATABASE_URL);

async function diagnoseImportIssue() {
  console.log('🔍 DIAGNOSING IMPORT ISSUE');
  console.log('==========================\n');
  
  try {
    // Test basic connection
    console.log('1️⃣ Testing database connection...');
    const start = Date.now();
    await sql`SELECT 1`;
    const connectionTime = Date.now() - start;
    console.log(`✅ Connection successful (${connectionTime}ms)\n`);
    
    // Check current documents count
    console.log('2️⃣ Checking current documents...');
    const countStart = Date.now();
    const count = await sql`SELECT COUNT(*) FROM documents`;
    const countTime = Date.now() - countStart;
    console.log(`📊 Current documents: ${parseInt(count[0].count).toLocaleString()} (${countTime}ms)\n`);
    
    // Test a simple insert
    console.log('3️⃣ Testing simple insert...');
    const insertStart = Date.now();
    try {
      const testId = `test_${Date.now()}`;
      const result = await sql`
        INSERT INTO documents (
          _id, doc_type, total_gross, created_at, updated_at
        ) VALUES (
          ${testId}, 'TEST', 0, NOW(), NOW()
        )
        ON CONFLICT (_id) DO NOTHING
        RETURNING _id
      `;
      const insertTime = Date.now() - insertStart;
      
      if (result.length > 0) {
        console.log(`✅ Insert successful (${insertTime}ms)`);
        // Clean up test record
        await sql`DELETE FROM documents WHERE _id = ${testId}`;
        console.log(`🧹 Test record cleaned up`);
      } else {
        console.log(`⚠️  Insert returned no rows (${insertTime}ms) - might be conflict`);
      }
    } catch (error) {
      console.error(`❌ Insert failed: ${error.message}`);
    }
    
    console.log('');
    
    // Check CSV file
    console.log('4️⃣ Checking CSV file...');
    const csvPath = './data/Documents.csv';
    if (!fs.existsSync(csvPath)) {
      console.log('❌ Documents.csv not found');
      return;
    }
    
    const stats = fs.statSync(csvPath);
    console.log(`📁 File size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // Read first few lines to check format
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\\n').filter(l => l.trim());
    console.log(`📊 Total lines: ${lines.length.toLocaleString()}`);
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log(`📋 Headers (${headers.length}): ${headers.slice(0, 5).join(', ')}...`);
    
    // Check a sample record
    if (lines.length > 1) {
      const sampleFields = lines[1].split(',').map(f => f.replace(/"/g, '').trim());
      const sampleRecord = {};
      headers.forEach((h, idx) => sampleRecord[h] = sampleFields[idx] || '');
      
      console.log('\\n📄 Sample record:');
      console.log(`   _ID: ${sampleRecord._ID}`);
      console.log(`   docType: ${sampleRecord.docType}`);
      console.log(`   docTotal_GROSS: ${sampleRecord.docTotal_GROSS}`);
      console.log(`   customerName: ${sampleRecord.customerName}`);
    }
    
    // Test if this record already exists
    if (lines.length > 1) {
      const sampleFields = lines[1].split(',').map(f => f.replace(/"/g, '').trim());
      const sampleRecord = {};
      headers.forEach((h, idx) => sampleRecord[h] = sampleFields[idx] || '');
      
      console.log('\\n5️⃣ Testing if sample record exists...');
      const existsStart = Date.now();
      const exists = await sql`SELECT _id FROM documents WHERE _id = ${sampleRecord._ID}`;
      const existsTime = Date.now() - existsStart;
      
      if (exists.length > 0) {
        console.log(`✅ Sample record EXISTS in database (${existsTime}ms)`);
        console.log(`   This explains why imports are slow - checking existing records`);
      } else {
        console.log(`❌ Sample record NOT in database (${existsTime}ms)`);
        console.log(`   This record should be imported`);
      }
    }
    
    // Performance test - batch of 10 records
    console.log('\\n6️⃣ Performance test - processing 10 records...');
    const perfStart = Date.now();
    let processed = 0;
    let skipped = 0;
    
    for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
      try {
        const fields = lines[i].split(',').map(f => f.replace(/"/g, '').trim());
        const record = {};
        headers.forEach((h, idx) => record[h] = fields[idx] || '');
        
        const docId = record._ID || `test_${Date.now()}_${i}`;
        
        // Check if exists first
        const exists = await sql`SELECT _id FROM documents WHERE _id = ${docId}`;
        if (exists.length > 0) {
          skipped++;
        } else {
          processed++;
        }
        
      } catch (error) {
        console.error(`   Error processing record ${i}: ${error.message}`);
      }
    }
    
    const perfTime = Date.now() - perfStart;
    console.log(`📊 Performance test results:`);
    console.log(`   Time: ${perfTime}ms for 10 records (${(perfTime/10).toFixed(1)}ms per record)`);
    console.log(`   Processed: ${processed}, Skipped: ${skipped}`);
    console.log(`   Estimated time for remaining ${32889 - parseInt(count[0].count)} records: ${((perfTime/10) * (32889 - parseInt(count[0].count)) / 1000 / 60).toFixed(1)} minutes`);
    
    console.log('\\n🎯 DIAGNOSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run diagnosis
diagnoseImportIssue();
