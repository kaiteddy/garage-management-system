#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const GDRIVE_PATH = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports";

async function checkJobSheets() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING JOB SHEETS STATUS');
    console.log('=============================\n');

    // Check if job_sheets table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'job_sheets'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ job_sheets table does not exist');
      
      // Check documents table for job sheet data
      const docTypes = await client.query(`
        SELECT doc_type, COUNT(*) as count 
        FROM documents 
        GROUP BY doc_type 
        ORDER BY count DESC
      `);
      
      console.log('📄 Document types in database:');
      docTypes.rows.forEach(row => {
        console.log(`   ${row.doc_type}: ${row.count}`);
      });
      
    } else {
      console.log('✅ job_sheets table exists');
      
      const count = await client.query('SELECT COUNT(*) FROM job_sheets');
      console.log(`📊 Total job sheets: ${count.rows[0].count}`);
      
      const recent = await client.query(`
        SELECT COUNT(*) FROM job_sheets 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      console.log(`🆕 Recent job sheets (24h): ${recent.rows[0].count}`);
    }
    
    // Check what's in Documents.csv from Google Drive
    console.log('\n📁 Checking Google Drive Documents.csv...');
    
    const documentsPath = `${GDRIVE_PATH}/Documents.csv`;
    if (fs.existsSync(documentsPath)) {
      const csvContent = fs.readFileSync(documentsPath, 'utf8');
      const cleanedContent = csvContent
        .replace(/^\uFEFF/, '')
        .replace(/"""/g, '"')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

      const records = parse(cleanedContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '\\',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      }) as any[];

      console.log(`📊 Total documents in CSV: ${records.length}`);
      
      // Analyze document types in CSV
      const csvDocTypes: { [key: string]: number } = {};
      records.forEach(record => {
        const docType = record.doc_type || record.type || 'Unknown';
        csvDocTypes[docType] = (csvDocTypes[docType] || 0) + 1;
      });
      
      console.log('\n📄 Document types in CSV:');
      Object.entries(csvDocTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      
      // Check for job sheet indicators
      const jobSheetKeywords = ['job', 'sheet', 'work', 'service', 'repair'];
      const potentialJobSheets = records.filter(record => {
        const docType = (record.doc_type || record.type || '').toLowerCase();
        const description = (record.description || '').toLowerCase();
        return jobSheetKeywords.some(keyword => 
          docType.includes(keyword) || description.includes(keyword)
        );
      });
      
      console.log(`\n🔧 Potential job sheets in CSV: ${potentialJobSheets.length}`);
      
      // Sample some potential job sheets
      if (potentialJobSheets.length > 0) {
        console.log('\n📝 Sample potential job sheets:');
        potentialJobSheets.slice(0, 5).forEach((record, i) => {
          console.log(`   ${i + 1}. ${record.doc_type || 'N/A'} - ${record.description || 'No description'}`);
        });
      }
      
    } else {
      console.log('❌ Documents.csv not found in Google Drive');
    }
    
    // Check current documents table
    console.log('\n💾 Current documents in database:');
    const dbDocs = await client.query('SELECT COUNT(*) FROM documents');
    console.log(`📊 Total documents: ${dbDocs.rows[0].count}`);
    
    const recentDocs = await client.query(`
      SELECT COUNT(*) FROM documents 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    console.log(`🆕 Recent documents (24h): ${recentDocs.rows[0].count}`);
    
    // Sample recent documents
    const sampleDocs = await client.query(`
      SELECT doc_number, doc_type, customer_name, total_gross 
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📝 Sample recent documents:');
    sampleDocs.rows.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - ${doc.customer_name} (£${doc.total_gross})`);
    });

  } catch (error: any) {
    console.error('❌ Error checking job sheets:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkJobSheets().catch(console.error);
