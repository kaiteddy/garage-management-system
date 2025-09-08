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

async function findJobSheets() {
  console.log('🔍 SEARCHING FOR JOB SHEETS IN DOCUMENTS.CSV');
  console.log('='.repeat(60));

  const filePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv';

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const records = parseCSV(fileContent);

  console.log(`📊 Total documents in CSV: ${records.length}`);

  // Find all job sheets
  const jobSheets = records.filter(r => r.docType === 'JS');
  console.log(`🎯 Job Sheets found: ${jobSheets.length}`);

  if (jobSheets.length > 0) {
    console.log('\n📋 Sample Job Sheets with reference numbers:');
    jobSheets.slice(0, 10).forEach((js, index) => {
      const jsNumber = js.docNumber_Jobsheet || js.docNumber_Orig_JS || 'NO-REF';
      const vehicle = js.vehRegistration || 'NO-REG';
      const status = js.docStatus || 'NO-STATUS';
      const department = js.docDepartment || 'NO-DEPT';
      const orderRef = js.docOrderRef || 'NO-ORDER-REF';

      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. JS: ${jsNumber} | Vehicle: ${vehicle} | Status: ${status} | Dept: ${department} | OrderRef: ${orderRef}`);
    });

    // Check how many have reference numbers
    const withJobsheetNumber = jobSheets.filter(js => js.docNumber_Jobsheet && js.docNumber_Jobsheet.trim() !== '').length;
    const withOrigJSNumber = jobSheets.filter(js => js.docNumber_Orig_JS && js.docNumber_Orig_JS.trim() !== '').length;
    const withOrderRef = jobSheets.filter(js => js.docOrderRef && js.docOrderRef.trim() !== '').length;
    const withDepartment = jobSheets.filter(js => js.docDepartment && js.docDepartment.trim() !== '').length;

    console.log(`\n📊 Reference Number Statistics:`);
    console.log(`   docNumber_Jobsheet: ${withJobsheetNumber}/${jobSheets.length} have values`);
    console.log(`   docNumber_Orig_JS: ${withOrigJSNumber}/${jobSheets.length} have values`);
    console.log(`   docOrderRef: ${withOrderRef}/${jobSheets.length} have values`);
    console.log(`   docDepartment: ${withDepartment}/${jobSheets.length} have values`);

    return jobSheets;
  } else {
    console.log('❌ No Job Sheets found in the CSV');
    return [];
  }
}

async function clearAndReimportDocuments() {
  console.log('\n🗑️  CLEARING EXISTING DOCUMENTS AND RE-IMPORTING WITH CORRECT MAPPING');
  console.log('='.repeat(60));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data
    console.log('Clearing existing document data...');
    await client.query('DELETE FROM document_receipts');
    await client.query('DELETE FROM document_extras');
    await client.query('DELETE FROM document_line_items');
    await client.query('DELETE FROM line_items');
    await client.query('DELETE FROM customer_documents');
    await client.query('DELETE FROM documents');

    console.log('✅ Existing data cleared');

    // Re-import with correct field mapping
    const filePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`📥 Re-importing ${records.length} documents with correct field mapping...`);

    let importedCount = 0;
    let jsCount = 0;
    let jsWithRefCount = 0;

    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const docId = stringToUuid(row._ID);
          const customerId = row._ID_Customer ? stringToUuid(row._ID_Customer) : null;
          const vehicleId = row._ID_Vehicle ? stringToUuid(row._ID_Vehicle) : null;
          const docType = row.docType || 'UNKNOWN';

          // Get the correct document number based on document type
          let docNumber = null;
          if (docType === 'JS') {
            // For Job Sheets, try multiple fields in order of preference
            docNumber = row.docNumber_Jobsheet ||
                       row.docNumber_Orig_JS ||
                       row.docOrderRef ||
                       null;
          } else if (docType === 'SI') {
            docNumber = row.docNumber_Invoice || null;
          } else if (docType === 'ES') {
            docNumber = row.docNumber_Estimate || row.docNumber_Orig_ES || null;
          } else if (docType === 'CR') {
            docNumber = row.docNumber_Credit || null;
          }

          // Import into documents table (complete table)
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
            i + 1, // Auto-increment ID for documents table
            row._ID,
            row._ID_Customer || null,
            row._ID_Vehicle || null,
            docType,
            docNumber, // This is the critical field with correct mapping!
            row.docDate_Created ? new Date(row.docDate_Created) : null,
            row.docDate_Issued ? new Date(row.docDate_Issued) : null,
            row.docDate_Paid ? new Date(row.docDate_Paid) : null,
            row.docStatus || null,
            row.custName_Forename && row.custName_Surname ? `${row.custName_Forename} ${row.custName_Surname}` : row.custName_Company || null,
            row.custName_Company || null,
            [row.custAddress_HouseNo, row.custAddress_Road, row.custAddress_Town, row.custAddress_PostCode].filter(Boolean).join(', ') || null,
            row.custCont_Telephone || null,
            row.custCont_Mobile || null,
            row.vehMake || null,
            row.vehModel || null,
            row.vehRegistration || null,
            row.vehMileage ? parseInt(row.vehMileage) : null,
            parseFloat(row.us_TotalGROSS || '0'),
            parseFloat(row.us_TotalNET || '0'),
            parseFloat(row.us_TotalTAX || '0'),
            row.docUserStatus || row.docStatus || null
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
            docNumber, // Critical field now properly mapped!
            row.docDate_Issued ? new Date(row.docDate_Issued) : null,
            row.docDate_DueBy ? new Date(row.docDate_DueBy) : null,
            parseFloat(row.us_TotalGROSS || '0'),
            parseFloat(row.us_TotalNET || '0'),
            parseFloat(row.us_TotalTAX || '0'),
            row.docStatus || null,
            row.docDepartment || null,
            parseFloat(row.us_Balance || '0')
          ]);

          importedCount++;

          if (docType === 'JS') {
            jsCount++;
            if (docNumber) {
              jsWithRefCount++;
            }
          }

        } catch (error) {
          console.error(`❌ Error importing document ${row._ID}:`, error);
        }
      }

      if (i % 1000 === 0) {
        console.log(`   Imported ${importedCount}/${records.length} documents...`);
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Successfully imported ${importedCount} documents`);
    console.log(`🎯 Job Sheets: ${jsCount} total, ${jsWithRefCount} with reference numbers`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during re-import:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyResults() {
  console.log('\n🔍 VERIFYING RE-IMPORT RESULTS');
  console.log('='.repeat(60));

  const client = await pool.connect();
  try {
    // Check documents table
    const docsResult = await client.query(`
      SELECT
        doc_type,
        COUNT(*) as total,
        COUNT(doc_number) as with_doc_number
      FROM documents
      GROUP BY doc_type
      ORDER BY doc_type
    `);

    console.log('\n📊 Documents table summary:');
    docsResult.rows.forEach(row => {
      console.log(`   ${row.doc_type}: ${row.total} total, ${row.with_doc_number} with doc_number`);
    });

    // Check customer_documents table
    const customerDocsResult = await client.query(`
      SELECT
        document_type,
        COUNT(*) as total,
        COUNT(document_number) as with_doc_number
      FROM customer_documents
      GROUP BY document_type
      ORDER BY document_type
    `);

    console.log('\n📊 Customer_documents table summary:');
    customerDocsResult.rows.forEach(row => {
      console.log(`   ${row.document_type}: ${row.total} total, ${row.with_doc_number} with document_number`);
    });

    // Show sample job sheets with reference numbers
    const jsResult = await client.query(`
      SELECT doc_number, vehicle_registration, doc_status, doc_date_issued
      FROM documents
      WHERE doc_type = 'JS' AND doc_number IS NOT NULL
      ORDER BY doc_number
      LIMIT 15
    `);

    console.log('\n🎯 Job Sheets with reference numbers:');
    if (jsResult.rows.length > 0) {
      jsResult.rows.forEach((row, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.doc_number} - ${row.vehicle_registration} (Status: ${row.doc_status})`);
      });
    } else {
      console.log('   ❌ No job sheets with reference numbers found');
    }

    // Check customer_documents job sheets too
    const customerJsResult = await client.query(`
      SELECT document_number, vehicle_registration, status
      FROM customer_documents
      WHERE document_type = 'JS' AND document_number IS NOT NULL
      ORDER BY document_number
      LIMIT 10
    `);

    console.log('\n🎯 Customer_documents Job Sheets with reference numbers:');
    if (customerJsResult.rows.length > 0) {
      customerJsResult.rows.forEach((row, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.document_number} - ${row.vehicle_registration} (Status: ${row.status})`);
      });
    } else {
      console.log('   ❌ No job sheets with reference numbers found in customer_documents');
    }

  } catch (error) {
    console.error('❌ Error verifying results:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 COMPREHENSIVE JOB SHEET RE-IMPORT WITH CORRECT FIELD MAPPING');
    console.log('='.repeat(70));
    console.log('This will find job sheets and re-import with proper reference numbers!');
    console.log('');

    // Step 1: Find job sheets in the CSV
    const jobSheets = await findJobSheets();

    if (jobSheets.length === 0) {
      console.log('❌ No job sheets found. Exiting.');
      return;
    }

    // Step 2: Clear and re-import with correct mapping
    await clearAndReimportDocuments();

    // Step 3: Verify results
    await verifyResults();

    console.log('\n🎉 JOB SHEET RE-IMPORT COMPLETED!');
    console.log('='.repeat(70));
    console.log('✅ Documents re-imported with correct field mapping');
    console.log('✅ Job sheet reference numbers should now be available');
    console.log('✅ Both documents and customer_documents tables updated');
    console.log('');
    console.log('🔄 You can now refresh your job sheets page to see the reference numbers!');

  } catch (error) {
    console.error('❌ Re-import process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();
