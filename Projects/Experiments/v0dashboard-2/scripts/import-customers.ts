import { Pool } from 'pg';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

interface CustomerRecord {
  _ID: string;
  nameForename: string;
  nameSurname: string;
  nameTitle: string;
  nameCompany: string;
  contactEmail: string;
  contactMobile: string;
  contactTelephone: string;
  addressHouseNo: string;
  addressRoad: string;
  addressLocality: string;
  addressTown: string;
  addressCounty: string;
  addressPostCode: string;
  accountNumber: string;
  accountStatus: string;
  Notes: string;
}

async function importCustomers(filePath: string) {
  console.log(`Importing customers from ${filePath}...`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: false,  // Changed from true to false to handle whitespace better
    delimiter: ',',
    quote: '\"',
    escape: '\\\\',
    relax_quotes: true,
    relax_column_count: true,  // Handle inconsistent column counts
    skip_records_with_error: true,  // Skip problematic rows instead of failing
    comment: '#',
    rtrim: true,
    ltrim: true,
    skip_records_with_empty_values: true,
    on_record: (record) => {
      // Clean up any problematic fields
      Object.keys(record).forEach(key => {
        if (typeof record[key] === 'string') {
          // Remove any non-printable characters
          record[key] = record[key].replace(/[^\x20-\x7E\n\r\t]/g, '');
        }
      });
      return record;
    }
  });

  // Parse the database URL to handle SSL
  const dbUrl = new URL(process.env.DATABASE_URL || '');
  
  // Extract database name from path
  const database = dbUrl.pathname.split('/')[1];
  
  // Parse query parameters for additional options
  const params = new URLSearchParams(dbUrl.search);
  
  // Configure SSL based on environment
  const ssl = process.env.NODE_ENV === 'production' 
    ? { 
        rejectUnauthorized: true,
        ca: process.env.DB_CA_CERT,
        cert: process.env.DB_CLIENT_CERT,
        key: process.env.DB_CLIENT_KEY
      }
    : {
        rejectUnauthorized: false // For development only
      };
  
  console.log('Connecting to database...');
  
  const pool = new Pool({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port, 10) || 5432,
    database: database,
    ssl: ssl,
    // Add connection timeout (how long to wait when connecting a new client)
    connectionTimeoutMillis: 10000, // 10 seconds
    // Add query timeout
    query_timeout: 10000, // 10 seconds
    // Add statement timeout (in milliseconds)
    statement_timeout: 10000, // 10 seconds
    // Add keepAlive to prevent connection timeouts
    keepAlive: true,
    // Add max pool size
    max: 20, // Maximum number of clients the pool should contain
    idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let imported = 0;
    let skipped = 0;
    
    for (const record of records) {
      try {
        // Skip if required fields are missing
        if (!record._ID || (!record.nameForename && !record.nameCompany)) {
          console.log('Skipping customer - missing required fields:', record);
          skipped++;
          continue;
        }

        // Prepare customer data
        const customer = {
          id: record._ID,
          first_name: record.nameForename || null,
          last_name: record.nameSurname || null,
          title: record.nameTitle || null,
          company_name: record.nameCompany || null,
          email: record.contactEmail || null,
          mobile: record.contactMobile || null,
          phone: record.contactTelephone || null,
          address_house_no: record.addressHouseNo || null,
          address_road: record.addressRoad || null,
          address_locality: record.addressLocality || null,
          address_town: record.addressTown || null,
          address_county: record.addressCounty || null,
          address_postcode: record.addressPostCode || null,
          account_number: record.accountNumber || null,
          account_status: record.accountStatus || 'active',
          notes: record.Notes || null
        };

        // Check if customer already exists
        const existingCustomer = await client.query(
          'SELECT id FROM customers WHERE id = $1',
          [customer.id]
        );

        if (existingCustomer.rows.length > 0) {
          // Update existing customer
          await client.query(
            `UPDATE customers SET
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              title = COALESCE($3, title),
              company_name = COALESCE($4, company_name),
              email = COALESCE($5, email),
              mobile = COALESCE($6, mobile),
              phone = COALESCE($7, phone),
              address_house_no = COALESCE($8, address_house_no),
              address_road = COALESCE($9, address_road),
              address_locality = COALESCE($10, address_locality),
              address_town = COALESCE($11, address_town),
              address_county = COALESCE($12, address_county),
              address_postcode = COALESCE($13, address_postcode),
              account_number = COALESCE($14, account_number),
              account_status = COALESCE($15, account_status),
              notes = COALESCE($16, notes),
              updated_at = NOW()
            WHERE id = $17`,
            [
              customer.first_name,
              customer.last_name,
              customer.title,
              customer.company_name,
              customer.email,
              customer.mobile,
              customer.phone,
              customer.address_house_no,
              customer.address_road,
              customer.address_locality,
              customer.address_town,
              customer.address_county,
              customer.address_postcode,
              customer.account_number,
              customer.account_status,
              customer.notes,
              customer.id
            ]
          );
        } else {
          // Insert new customer
          await client.query(
            `INSERT INTO customers (
              id, first_name, last_name, title, company_name, email, mobile, phone,
              address_house_no, address_road, address_locality, address_town,
              address_county, address_postcode, account_number, account_status, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )`,
            [
              customer.id,
              customer.first_name,
              customer.last_name,
              customer.title,
              customer.company_name,
              customer.email,
              customer.mobile,
              customer.phone,
              customer.address_house_no,
              customer.address_road,
              customer.address_locality,
              customer.address_town,
              customer.address_county,
              customer.address_postcode,
              customer.account_number,
              customer.account_status,
              customer.notes
            ]
          );
        }

        imported++;
        
        // Log progress
        if (imported % 100 === 0) {
          console.log(`Imported ${imported} customers...`);
        }
        
      } catch (error) {
        console.error(`Error importing customer ${record._ID || 'unknown'}:`, error);
        skipped++;
      }
    }
    
    await client.query('COMMIT');
    console.log('\nCustomer import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    
    return { imported, skipped };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during customer import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Check if this file is being run directly (not imported as a module)
const isMain = import.meta.url === `file://${process.argv[1]}`;

// Run the import if this file is executed directly
if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide the path to the customers CSV file');
    console.error('Usage: npx tsx import-customers.ts <path-to-csv>');
    process.exit(1);
  }
  
  importCustomers(filePath).catch(error => {
    console.error('Error in import:', error);
    process.exit(1);
  });
}

export { importCustomers };
