import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as csv from 'fast-csv';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function getDatabaseSamples() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment variables');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Get sample customers
    const customers = await pool.query('SELECT * FROM customers LIMIT 3');
    console.log('\n=== Sample Customers ===');
    console.table(customers.rows);

    // Get sample vehicles
    const vehicles = await pool.query('SELECT * FROM vehicles LIMIT 3');
    console.log('\n=== Sample Vehicles ===');
    console.table(vehicles.rows);

    // Get counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM vehicles) as vehicle_count
    `);
    
    console.log('\n=== Record Counts ===');
    console.table([counts.rows[0]]);

  } catch (error) {
    console.error('Error fetching samples:', error);
  } finally {
    await pool.end();
  }
}

function getSourceSamples() {
  const dataDir = path.join(process.env.HOME!, 'Google Drive/My Drive/Data Exports');
  
  console.log('\n=== Source File Samples ===');
  
  // Show sample from Customers.csv
  try {
    const customersPath = path.join(dataDir, 'Customers.csv');
    if (fs.existsSync(customersPath)) {
      const rows: any[] = [];
      fs.createReadStream(customersPath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          if (rows.length < 2) rows.push(row);
        })
        .on('end', () => {
          console.log('\nSample from Customers.csv:');
          console.table(rows);
          
          // Now check the database
          getDatabaseSamples().catch(console.error);
        });
    } else {
      console.warn('Customers.csv not found, checking database...');
      getDatabaseSamples().catch(console.error);
    }
  } catch (error) {
    console.error('Error reading source files:', error);
  }
}

// Start by showing source samples
getSourceSamples();
