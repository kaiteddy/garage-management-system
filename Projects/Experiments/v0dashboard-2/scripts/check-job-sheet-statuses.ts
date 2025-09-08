#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const GDRIVE_PATH = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports";

async function checkJobSheetStatuses() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  
  try {
    console.log('🔍 CHECKING JOB SHEET STATUSES');
    console.log('===============================\n');

    // Check all document types and statuses
    const docTypes = await client.query(`
      SELECT doc_type, COUNT(*) as count 
      FROM documents 
      GROUP BY doc_type 
      ORDER BY count DESC
    `);
    
    console.log('📄 All document types in database:');
    docTypes.rows.forEach(row => {
      console.log(`   ${row.doc_type}: ${row.count}`);
    });
    
    // Check if there's a status field
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Documents table columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample recent documents to see their structure
    const samples = await client.query(`
      SELECT doc_number, doc_type, customer_name, total_gross, created_at
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📝 Sample recent documents:');
    samples.rows.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.doc_number} - ${doc.doc_type} - ${doc.customer_name} - £${doc.total_gross} (${doc.created_at.toISOString().split('T')[0]})`);
    });

    // Now check the CSV to see what document types should exist
    console.log('\n📁 Checking Google Drive Documents.csv for document types...');
    
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
      
      // Check first few records to see the structure
      console.log('\n📋 CSV Structure (first record):');
      if (records.length > 0) {
        const firstRecord = records[0];
        Object.keys(firstRecord).forEach(key => {
          console.log(`   ${key}: ${firstRecord[key]}`);
        });
      }
      
      // Analyze document types in CSV
      const csvDocTypes: { [key: string]: number } = {};
      records.forEach(record => {
        const docType = record.doc_type || record.type || record.Type || record.DocType || 'Unknown';
        csvDocTypes[docType] = (csvDocTypes[docType] || 0) + 1;
      });
      
      console.log('\n📄 Document types in CSV:');
      Object.entries(csvDocTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      
      // Look for job sheet specific indicators
      const jobSheetTypes = records.filter(record => {
        const docType = (record.doc_type || record.type || record.Type || record.DocType || '').toLowerCase();
        return docType.includes('job') || docType.includes('sheet') || docType.includes('service');
      });
      
      console.log(`\n🔧 Job sheet type documents in CSV: ${jobSheetTypes.length}`);
      
      // Look for different statuses
      const statusFields = ['status', 'Status', 'doc_status', 'DocStatus', 'state', 'State'];
      let statusField = null;
      
      for (const field of statusFields) {
        if (records.length > 0 && records[0].hasOwnProperty(field)) {
          statusField = field;
          break;
        }
      }
      
      if (statusField) {
        console.log(`\n📊 Found status field: ${statusField}`);
        const statuses: { [key: string]: number } = {};
        records.forEach(record => {
          const status = record[statusField] || 'Unknown';
          statuses[status] = (statuses[status] || 0) + 1;
        });
        
        console.log('📊 Document statuses in CSV:');
        Object.entries(statuses)
          .sort(([,a], [,b]) => b - a)
          .forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
          });
      } else {
        console.log('\n❌ No status field found in CSV');
      }
      
    } else {
      console.log('❌ Documents.csv not found in Google Drive');
    }

  } catch (error: any) {
    console.error('❌ Error checking job sheet statuses:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkJobSheetStatuses().catch(console.error);
