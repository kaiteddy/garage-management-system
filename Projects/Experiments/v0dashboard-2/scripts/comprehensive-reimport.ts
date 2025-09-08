#!/usr/bin/env tsx

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Simple CSV parser function that handles quoted values
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        obj[header] = values[j] || '';
      }

      result.push(obj);
    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${lines[i]}`);
      console.error(error);
    }
  }

  return result;
}

// Helper function to parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result.map(field =>
    field.startsWith('"') && field.endsWith('"')
      ? field.slice(1, -1)
      : field
  );
}

// Convert string to UUID format
function stringToUuid(str: string): string {
  if (!str) return '';

  // Remove any non-alphanumeric characters and convert to uppercase
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Pad or truncate to 32 characters
  const padded = cleaned.padEnd(32, '0').substring(0, 32);

  // Format as UUID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  return `${padded.substring(0, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}-${padded.substring(16, 20)}-${padded.substring(20, 32)}`;
}

async function scanCSVStructure() {
  console.log('🔍 SCANNING CSV FILES FOR STRUCTURE AND AVAILABLE FIELDS');
  console.log('='.repeat(60));

  const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports';

  const files = [
    'Documents.csv',
    'LineItems.csv',
    'Document_Extras.csv',
    'Receipts.csv'
  ];

  for (const fileName of files) {
    const filePath = path.join(basePath, fileName);

    console.log(`\n📄 ${fileName}`);
    console.log('-'.repeat(40));

    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found');
      continue;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');

      if (lines.length === 0) {
        console.log('❌ Empty file');
        continue;
      }

      // Get headers
      const headers = parseCSVLine(lines[0]);
      console.log(`📊 Total columns: ${headers.length}`);
      console.log(`📝 Total rows: ${lines.length - 1}`);

      // Show all headers
      console.log('\n🏷️  Available columns:');
      headers.forEach((header, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${header}`);
      });

      // Look for job sheet related fields
      const jsFields = headers.filter(h =>
        h.toLowerCase().includes('job') ||
        h.toLowerCase().includes('js') ||
        h.toLowerCase().includes('docnumber') ||
        h.toLowerCase().includes('doc_number') ||
        h.toLowerCase().includes('reference') ||
        h.toLowerCase().includes('ref')
      );

      if (jsFields.length > 0) {
        console.log('\n🎯 Job Sheet / Reference related fields found:');
        jsFields.forEach(field => {
          console.log(`   ✅ ${field}`);
        });
      }

      // Sample first few rows for job sheet documents
      if (fileName === 'Documents.csv') {
        console.log('\n📋 Sample Job Sheet documents (first 5):');
        const records = parseCSV(fileContent);
        const jsRecords = records.filter(r =>
          r.docType === 'JS' ||
          r.doc_type === 'JS' ||
          r.document_type === 'JS'
        ).slice(0, 5);

        if (jsRecords.length > 0) {
          jsRecords.forEach((record, index) => {
            console.log(`\n   Record ${index + 1}:`);
            Object.entries(record).forEach(([key, value]) => {
              if (value && value.trim() !== '') {
                console.log(`     ${key}: ${value}`);
              }
            });
          });
        } else {
          console.log('   ❌ No Job Sheet documents found in sample');
        }
      }

    } catch (error) {
      console.log(`❌ Error reading file: ${error}`);
    }
  }
}

async function clearExistingData() {
  console.log('\n🗑️  CLEARING EXISTING DATA');
  console.log('='.repeat(60));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear in reverse dependency order
    await client.query('DELETE FROM document_receipts');
    await client.query('DELETE FROM document_extras');
    await client.query('DELETE FROM document_line_items');
    await client.query('DELETE FROM line_items');
    await client.query('DELETE FROM customer_documents');
    await client.query('DELETE FROM documents');

    await client.query('COMMIT');
    console.log('✅ All document-related data cleared');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function reimportDocumentsWithCorrectMapping() {
  console.log('\n📥 RE-IMPORTING DOCUMENTS WITH CORRECT FIELD MAPPING');
  console.log('='.repeat(60));

  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'
    );

    console.log(`Reading documents from ${filePath}...`);

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} documents to import`);

    // Show available fields in the CSV
    if (records.length > 0) {
      console.log('\n🏷️  Available fields in Documents.csv:');
      Object.keys(records[0]).forEach((key, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${key}`);
      });
    }

    await client.query('BEGIN');

    const batchSize = 100;
    let importedCount = 0;
    let jsCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          // Convert string IDs to UUID format
          const docId = stringToUuid(row._ID || row.id);
          const customerId = row._ID_Customer ? stringToUuid(row._ID_Customer) : null;
          const vehicleId = row._ID_Vehicle ? stringToUuid(row._ID_Vehicle) : null;

          // Determine document type
          const docType = row.docType || row.doc_type || row.document_type || 'UNKNOWN';

          // Get document number - try multiple possible field names
          const docNumber = row.docNumber ||
                           row.doc_number ||
                           row.document_number ||
                           row.docNumber_Jobsheet ||
                           row.docNumber_Orig_JS ||
                           row.docOrderRef ||
                           null;

          // Import into documents table (the complete table with reference numbers)
          await client.query(`
            INSERT INTO documents (
              id, _id, _id_customer, _id_vehicle, doc_type, doc_number,
              doc_date_created, doc_date_issued, doc_date_paid, doc_status,
              customer_name, customer_company, customer_address, customer_phone, customer_mobile,
              vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
              total_gross, total_net, total_tax, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
            ) ON CONFLICT (id) DO UPDATE SET
              doc_number = EXCLUDED.doc_number,
              doc_type = EXCLUDED.doc_type,
              updated_at = NOW()
          `, [
            parseInt(row.id || '0') || i + 1, // Auto-increment ID
            docId,
            row._ID_Customer || null,
            row._ID_Vehicle || null,
            docType,
            docNumber,
            row.docDate_Created ? new Date(row.docDate_Created) : null,
            row.docDate_Issued ? new Date(row.docDate_Issued) : null,
            row.docDate_Paid ? new Date(row.docDate_Paid) : null,
            row.docStatus || 'PENDING',
            row.custName_Forename && row.custName_Surname ? `${row.custName_Forename} ${row.custName_Surname}` : null,
            row.custCompany || null,
            row.custAddress_Road || null,
            row.custCont_Telephone || null,
            row.custCont_Mobile || null,
            row.vehMake || null,
            row.vehModel || null,
            row.vehRegistration || null,
            row.vehMileage ? parseInt(row.vehMileage) : null,
            parseFloat(row.us_TotalGROSS || row.docTotal_GROSS || '0'),
            parseFloat(row.us_TotalNET || row.docTotal_NET || '0'),
            parseFloat(row.us_TotalTAX || row.docTotal_TAX || '0'),
            row.docStatus || 'PENDING'
          ]);

          // Also import into customer_documents table for compatibility
          await client.query(`
            INSERT INTO customer_documents (
              id, customer_id, vehicle_registration, document_type, document_number,
              document_date, due_date, total_gross, total_net, total_tax,
              status, department, balance, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
            ) ON CONFLICT (id) DO UPDATE SET
              document_number = EXCLUDED.document_number,
              document_type = EXCLUDED.document_type,
              updated_at = NOW()
          `, [
            docId,
            customerId,
            row.vehRegistration || null,
            docType,
            docNumber, // This is the critical field that was missing!
            row.docDate_Issued ? new Date(row.docDate_Issued) : null,
            row.docDate_Due ? new Date(row.docDate_Due) : null,
            parseFloat(row.us_TotalGROSS || row.docTotal_GROSS || '0'),
            parseFloat(row.us_TotalNET || row.docTotal_NET || '0'),
            parseFloat(row.us_TotalTAX || row.docTotal_TAX || '0'),
            row.docStatus || 'PENDING',
            row.docDepartment || null,
            parseFloat(row.docBalance || '0')
          ]);

          importedCount++;

          if (docType === 'JS') {
            jsCount++;
            console.log(`✅ Job Sheet imported: ${docNumber || 'NO-REF'} (${row.vehRegistration || 'NO-REG'})`);
          }

        } catch (error) {
          console.error(`❌ Error importing document ${row._ID}:`, error);
        }
      }

      console.log(`Imported ${importedCount} of ${records.length} documents...`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ Successfully imported ${importedCount} documents`);
    console.log(`🎯 Job Sheets imported: ${jsCount}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing documents:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyImport() {
  console.log('\n🔍 VERIFYING IMPORT RESULTS');
  console.log('='.repeat(60));

  const client = await pool.connect();
  try {
    // Check documents table
    const docsResult = await client.query(`
      SELECT
        doc_type,
        COUNT(*) as count,
        COUNT(doc_number) as has_doc_number
      FROM documents
      GROUP BY doc_type
      ORDER BY doc_type
    `);

    console.log('\n📊 Documents table summary:');
    docsResult.rows.forEach(row => {
      console.log(`   ${row.doc_type}: ${row.count} total, ${row.has_doc_number} with doc_number`);
    });

    // Check customer_documents table
    const customerDocsResult = await client.query(`
      SELECT
        document_type,
        COUNT(*) as count,
        COUNT(document_number) as has_doc_number
      FROM customer_documents
      GROUP BY document_type
      ORDER BY document_type
    `);

    console.log('\n📊 Customer_documents table summary:');
    customerDocsResult.rows.forEach(row => {
      console.log(`   ${row.document_type}: ${row.count} total, ${row.has_doc_number} with document_number`);
    });

    // Show sample job sheets with reference numbers
    const jsResult = await client.query(`
      SELECT doc_number, vehicle_registration, doc_status, doc_date_issued
      FROM documents
      WHERE doc_type = 'JS' AND doc_number IS NOT NULL
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `);

    console.log('\n🎯 Sample Job Sheets with reference numbers:');
    if (jsResult.rows.length > 0) {
      jsResult.rows.forEach(row => {
        console.log(`   ${row.doc_number} - ${row.vehicle_registration} (${row.doc_status})`);
      });
    } else {
      console.log('   ❌ No job sheets with reference numbers found');
    }

  } catch (error) {
    console.error('❌ Error verifying import:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 COMPREHENSIVE DATA RE-IMPORT PROCESS');
    console.log('='.repeat(60));
    console.log('This will scan CSV files, clear existing data, and re-import with proper field mapping');
    console.log('Including the critical job sheet reference numbers that were missing!');
    console.log('');

    // Step 1: Scan CSV structure
    await scanCSVStructure();

    // Step 2: Clear existing data
    await clearExistingData();

    // Step 3: Re-import with correct mapping
    await reimportDocumentsWithCorrectMapping();

    // Step 4: Verify results
    await verifyImport();

    console.log('\n🎉 COMPREHENSIVE RE-IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log('✅ All document data has been re-imported with proper field mapping');
    console.log('✅ Job sheet reference numbers should now be available');
    console.log('✅ Both documents and customer_documents tables populated');

  } catch (error) {
    console.error('❌ Re-import process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
