import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Define the Customer type based on CSV structure
interface Customer {
  _ID: string;
  nameTitle?: string;
  nameForename?: string;
  nameSurname?: string;
  nameCompany?: string;
  contactEmail?: string;
  contactMobile?: string;
  contactTelephone?: string;
  addressHouseNo?: string;
  addressRoad?: string;
  addressLocality?: string;
  addressTown?: string;
  addressCounty?: string;
  addressPostCode?: string;
  accountNumber?: string;
  accountStatus?: string;
  Notes?: string;
  [key: string]: any; // Allow any other fields
}

async function importCustomers(filePath: string) {
  console.log(`Importing customers from ${filePath}...`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Clean up the file content
    const cleanedContent = fileContent
      .replace(/^\uFEFF/, '') // Remove BOM if present
      .replace(/"""/g, '"')  // Fix triple quotes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n');
    
    console.log('Parsing CSV content...');
    const records: Customer[] = parse(cleanedContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '\\',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true
    });
    
    console.log(`Found ${records.length} records to process...`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 100;
    
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await processBatch(client, batch);
      
      imported += result.imported;
      skipped += result.skipped;
      errors += result.errors;
      
      console.log(`Processed ${Math.min(i + batchSize, records.length)}/${records.length} records...`);
    }
    
    await client.query('COMMIT');
    
    console.log(`\nImport completed!`);
    console.log(`- Imported: ${imported}`);
    console.log(`- Skipped: ${skipped}`);
    if (errors > 0) {
      console.log(`- Errors: ${errors}`);
    }
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during import:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function processBatch(client: any, batch: Customer[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Check for required fields
      if (!record._ID) {
        console.log(`Skipping customer - missing ID: ${JSON.stringify(record)}`);
        skipped++;
        continue;
      }
      
      // Log the first record to verify data
      if (imported === 0 && skipped === 0) {
        console.log('First record sample:', JSON.stringify(record, null, 2));
      }
      
      // Prepare the customer data with field length limits
      const customer = {
        id: record._ID,
        first_name: record.nameForename ? String(record.nameForename).substring(0, 100) : null,
        last_name: record.nameSurname ? String(record.nameSurname).substring(0, 100) : null,
        title: record.nameTitle ? String(record.nameTitle).substring(0, 20) : null,
        company_name: record.nameCompany ? String(record.nameCompany).substring(0, 200) : null,
        email: record.contactEmail ? String(record.contactEmail).substring(0, 255) : null,
        mobile: record.contactMobile ? String(record.contactMobile).substring(0, 50) : null,
        phone: record.contactTelephone ? String(record.contactTelephone).substring(0, 50) : null,
        address_house_no: record.addressHouseNo ? String(record.addressHouseNo).substring(0, 50) : null,
        address_road: record.addressRoad ? String(record.addressRoad).substring(0, 200) : null,
        address_locality: record.addressLocality ? String(record.addressLocality).substring(0, 200) : null,
        address_town: record.addressTown ? String(record.addressTown).substring(0, 100) : null,
        address_county: record.addressCounty ? String(record.addressCounty).substring(0, 100) : null,
        address_postcode: record.addressPostCode ? String(record.addressPostCode).substring(0, 20) : null,
        account_number: record.accountNumber ? String(record.accountNumber).substring(0, 50) : null,
        account_status: record.accountStatus ? String(record.accountStatus).substring(0, 20) : 'active',
        notes: record.Notes ? String(record.Notes).substring(0, 1000) : null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Filter out undefined values and convert dates to ISO strings
      // Also exclude updated_at from the initial insert
      const filteredCustomer = Object.fromEntries(
        Object.entries(customer)
          .filter(([k, v]) => v !== undefined && v !== null && k !== 'updated_at')
          .map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
      );
      
      // Build the query
      const fields = Object.keys(filteredCustomer);
      const values = fields.map(field => filteredCustomer[field]);
      const placeholders = fields.map((_, i) => `$${i + 1}`);
      
      // For updates, we'll handle updated_at separately
      const updates = [
        ...fields
          .filter(f => f !== 'id' && f !== 'created_at')
          .map(f => `"${f}" = EXCLUDED."${f}"`),
        '"updated_at" = NOW()'
      ];
      
      const query = `
        INSERT INTO customers (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT (id) DO UPDATE SET
          ${updates.join(', ')}
        RETURNING id
      `;
      
      console.log('Executing query with values:', JSON.stringify(filteredCustomer, null, 2));
      const result = await client.query(query, values);
      
      if (result.rows.length > 0) {
        imported++;
        if (imported % 100 === 0) {
          console.log(`Processed ${imported} records...`);
        }
      } else {
        console.log(`No rows returned for customer ${record._ID}`);
        skipped++;
      }
      
    } catch (error: any) {
      console.error(`Error processing customer ${record._ID || 'unknown'}:`, error);
      errors++;
      skipped++;
      
      // If we hit a transaction error, rethrow to stop processing this batch
      if (error.code === '25P02') {
        throw error;
      }
    }
  }
  
  return { imported, skipped, errors };
}

// Run the import if this file is executed directly
const run = async () => {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide the path to the Customers.csv file');
    process.exit(1);
  }
  
  try {
    await importCustomers(filePath);
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
};

run();

export { importCustomers };
