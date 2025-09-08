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

async function matchByVehicleRegistration() {
  console.log('🔄 MATCHING JOB SHEETS BY VEHICLE REGISTRATION');
  console.log('='.repeat(60));
  
  const client = await pool.connect();
  try {
    // First, get all job sheets from the database
    const dbResult = await client.query(`
      SELECT id, vehicle_registration, document_number, status
      FROM customer_documents 
      WHERE document_type = 'JS'
      ORDER BY vehicle_registration
    `);
    
    console.log(`📊 Database job sheets: ${dbResult.rows.length}`);
    console.log('Database job sheets:');
    dbResult.rows.forEach((row, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.vehicle_registration} - ${row.document_number || 'NO-REF'} (Status: ${row.status})`);
    });
    
    // Read the CSV file
    const filePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);
    
    // Find all job sheets in CSV
    const jobSheets = records.filter(r => r.docType === 'JS');
    console.log(`\n📊 CSV job sheets: ${jobSheets.length}`);
    console.log('CSV job sheets:');
    jobSheets.forEach((js, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${js.vehRegistration} - JS ${js.docNumber_Jobsheet} (Status: ${js.docStatus})`);
    });
    
    // Try to match by vehicle registration
    console.log(`\n🔍 MATCHING BY VEHICLE REGISTRATION:`);
    let matchedCount = 0;
    let updatedCount = 0;
    
    await client.query('BEGIN');
    
    for (const dbRow of dbResult.rows) {
      const dbVehicle = dbRow.vehicle_registration;
      if (!dbVehicle) continue;
      
      // Find matching CSV record by vehicle registration
      const csvMatch = jobSheets.find(js => 
        js.vehRegistration && 
        js.vehRegistration.toLowerCase() === dbVehicle.toLowerCase()
      );
      
      if (csvMatch) {
        matchedCount++;
        const jsNumber = csvMatch.docNumber_Jobsheet;
        
        console.log(`✅ MATCH: ${dbVehicle} -> JS ${jsNumber}`);
        
        // Update the database record
        const updateResult = await client.query(`
          UPDATE customer_documents 
          SET document_number = $1, updated_at = NOW()
          WHERE id = $2 AND document_type = 'JS'
        `, [jsNumber, dbRow.id]);
        
        if (updateResult.rowCount && updateResult.rowCount > 0) {
          updatedCount++;
        }
        
      } else {
        console.log(`❌ NO MATCH: ${dbVehicle} - not found in CSV`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n📊 Matching Summary:`);
    console.log(`   🎯 Matched: ${matchedCount} job sheets`);
    console.log(`   ✅ Updated: ${updatedCount} job sheets`);
    console.log(`   📋 DB total: ${dbResult.rows.length} job sheets`);
    console.log(`   📋 CSV total: ${jobSheets.length} job sheets`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error matching job sheets:', error);
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
    
    // Show all updated job sheets
    const sampleResult = await client.query(`
      SELECT document_number, vehicle_registration, status
      FROM customer_documents 
      WHERE document_type = 'JS' AND document_number IS NOT NULL
      ORDER BY document_number
    `);
    
    console.log(`\n🎯 Updated Job Sheets with Reference Numbers:`);
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
    console.log('🚀 JOB SHEET MATCHING BY VEHICLE REGISTRATION');
    console.log('='.repeat(60));
    console.log('This will match job sheets by vehicle registration and update reference numbers');
    console.log('');
    
    // Step 1: Match and update by vehicle registration
    await matchByVehicleRegistration();
    
    // Step 2: Verify the updates
    await verifyUpdates();
    
    console.log('\n🎉 JOB SHEET MATCHING COMPLETED!');
    console.log('='.repeat(60));
    console.log('✅ Job sheet reference numbers have been updated');
    console.log('✅ You can now refresh your job sheets page to see the reference numbers');
    
  } catch (error) {
    console.error('❌ Matching process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function
main();
