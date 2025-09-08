#!/usr/bin/env ts-node

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const GDRIVE_PATH = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports";

async function fixDocumentTypes() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 FIXING DOCUMENT TYPES AND STATUSES');
    console.log('=====================================\n');
    
    // Read and parse CSV
    const csvPath = `${GDRIVE_PATH}/Documents.csv`;
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const cleanedContent = csvContent
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/"""/g, '"')  // Fix triple quotes
      .replace(/\r\n/g, '\n') // Normalize line endings
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

    console.log(`📊 Found ${records.length} records in CSV`);

    // Analyze document types in CSV
    const docTypes: { [key: string]: number } = {};
    const statuses: { [key: string]: number } = {};
    
    records.forEach(record => {
      const docType = record.docType || 'Unknown';
      const status = record.docUserStatus || record.docStatus || 'Unknown';
      
      docTypes[docType] = (docTypes[docType] || 0) + 1;
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    console.log('📄 Document types in CSV:');
    Object.entries(docTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    
    console.log('\n📊 Document statuses in CSV:');
    Object.entries(statuses)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Show top 10
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

    // Update documents with correct types and statuses
    console.log('\n🔄 Updating document types and statuses...');
    
    let updated = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        if (!record._ID) continue;
        
        const docType = record.docType || 'Unknown';
        const docStatus = record.docStatus || '';
        const docUserStatus = record.docUserStatus || '';
        
        // Map document types to readable names
        let readableType = docType;
        switch (docType) {
          case 'JS': readableType = 'Job Sheet'; break;
          case 'SI': readableType = 'Sales Invoice'; break;
          case 'ES': readableType = 'Estimate'; break;
          case 'CR': readableType = 'Credit Note'; break;
          case 'XS': readableType = 'Excess'; break;
          case 'VOID': readableType = 'Void'; break;
          default: readableType = docType;
        }
        
        // Update the document
        const result = await client.query(`
          UPDATE documents 
          SET 
            doc_type = $1,
            doc_status = $2,
            status = $3,
            updated_at = NOW()
          WHERE _id = $4
        `, [readableType, docStatus, docUserStatus, record._ID]);
        
        if (result.rowCount && result.rowCount > 0) {
          updated++;
        }
        
        if (updated % 1000 === 0) {
          console.log(`📝 Updated: ${updated}/${records.length}`);
        }
        
      } catch (error: any) {
        errors++;
        if (errors < 10) {
          console.error(`Error updating ${record._ID}:`, error.message);
        }
        if (errors > 100) break;
      }
    }
    
    console.log(`\n✅ Update completed!`);
    console.log(`📊 Updated: ${updated} documents`);
    console.log(`❌ Errors: ${errors}`);
    
    // Show final statistics
    console.log('\n📊 Final document type distribution:');
    const finalTypes = await client.query(`
      SELECT doc_type, COUNT(*) as count 
      FROM documents 
      GROUP BY doc_type 
      ORDER BY count DESC
    `);
    
    finalTypes.rows.forEach(row => {
      console.log(`   ${row.doc_type}: ${row.count}`);
    });
    
    // Show job sheet specific stats
    const jobSheets = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status IN ('Open', 'In Progress', 'Pending', '') THEN 1 END) as open_count
      FROM documents 
      WHERE doc_type = 'Job Sheet'
    `);
    
    if (jobSheets.rows.length > 0) {
      console.log(`\n🔧 Job Sheet Statistics:`);
      console.log(`   Total Job Sheets: ${jobSheets.rows[0].total}`);
      console.log(`   Open Job Sheets: ${jobSheets.rows[0].open_count}`);
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixDocumentTypes();
    console.log('\n🎉 Document types and statuses fixed!');
    console.log('💡 Job sheets page should now show only open job sheets');
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
main().catch(console.error);
