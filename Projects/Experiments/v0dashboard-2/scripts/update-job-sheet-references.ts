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

async function updateJobSheetReferences() {
  console.log('🔄 UPDATING JOB SHEET REFERENCE NUMBERS');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Read the CSV file
    const filePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);
    
    // Find all job sheets in CSV
    const jobSheets = records.filter(r => r.docType === 'JS');
    console.log(`📊 Found ${jobSheets.length} job sheets in CSV`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    await client.query('BEGIN');
    
    for (const js of jobSheets) {
      try {
        const csvId = stringToUuid(js._ID);
        const jsNumber = js.docNumber_Jobsheet;
        const vehicle = js.vehRegistration;
        
        if (!jsNumber) {
          console.log(`⚠️  Skipping ${csvId} - no job sheet number`);
          continue;
        }
        
        // Update customer_documents table
        const updateResult = await client.query(`
          UPDATE customer_documents 
          SET document_number = $1, updated_at = NOW()
          WHERE id = $2 AND document_type = 'JS'
        `, [jsNumber, csvId]);
        
        if (updateResult.rowCount && updateResult.rowCount > 0) {
          updatedCount++;
          console.log(`✅ Updated JS ${jsNumber} (${vehicle}) - ID: ${csvId}`);
        } else {
          notFoundCount++;
          console.log(`❌ Not found in DB: JS ${jsNumber} (${vehicle}) - ID: ${csvId}`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating job sheet ${js._ID}:`, error);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} job sheets`);
    console.log(`   ❌ Not found: ${notFoundCount} job sheets`);
    console.log(`   📋 Total processed: ${jobSheets.length} job sheets`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating job sheet references:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyUpdates() {
  console.log('\n🔍 VERIFYING UPDATES');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // Check how many job sheets now have reference numbers
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(document_number) as with_reference,
        COUNT(*) - COUNT(document_number) as without_reference
      FROM customer_documents 
      WHERE document_type = 'JS'
    `);
    
    const stats = result.rows[0];
    console.log(`📊 Job Sheet Reference Status:`);
    console.log(`   Total job sheets: ${stats.total}`);
    console.log(`   With reference numbers: ${stats.with_reference}`);
    console.log(`   Without reference numbers: ${stats.without_reference}`);
    
    // Show sample updated job sheets
    const sampleResult = await client.query(`
      SELECT document_number, vehicle_registration, status
      FROM customer_documents 
      WHERE document_type = 'JS' AND document_number IS NOT NULL
      ORDER BY document_number
      LIMIT 10
    `);
    
    console.log(`\n🎯 Sample Updated Job Sheets:`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.document_number} - ${row.vehicle_registration} (Status: ${row.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error verifying updates:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 JOB SHEET REFERENCE NUMBER UPDATE');
    console.log('='.repeat(60));
    console.log('This will update existing job sheet records with their correct reference numbers');
    console.log('from the CSV file without doing a full re-import.');
    console.log('');
    
    // Step 1: Update job sheet references
    await updateJobSheetReferences();
    
    // Step 2: Verify the updates
    await verifyUpdates();
    
    console.log('\n🎉 JOB SHEET REFERENCE UPDATE COMPLETED!');
    console.log('='.repeat(60));
    console.log('✅ Job sheet reference numbers have been updated');
    console.log('✅ You can now refresh your job sheets page to see the reference numbers');
    
  } catch (error) {
    console.error('❌ Update process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();
