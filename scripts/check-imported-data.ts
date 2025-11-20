import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkImportedData() {
  console.log('Checking imported data...\n');
  
  // Check customers
  console.log('=== CUSTOMERS ===');
  const customersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
  console.log(`Total customers: ${customersResult.rows[0].count}`);
  
  const sampleCustomers = await pool.query('SELECT id, first_name, last_name, email FROM customers LIMIT 5');
  console.log('\nSample customers:');
  sampleCustomers.rows.forEach(c => {
    console.log(`- ${c.first_name} ${c.last_name} (${c.email})`);
  });
  
  // Check vehicles
  console.log('\n=== VEHICLES ===');
  const vehiclesResult = await pool.query('SELECT COUNT(*) as count FROM vehicles');
  console.log(`Total vehicles: ${vehiclesResult.rows[0].count}`);
  
  const vehiclesWithMot = await pool.query(`
    SELECT 
      registration, 
      make, 
      model, 
      mot_expiry_date,
      mot_status
    FROM vehicles 
    WHERE mot_expiry_date IS NOT NULL
    ORDER BY mot_expiry_date ASC
    LIMIT 5
  `);
  
  console.log('\nVehicles with MOT information:');
  vehiclesWithMot.rows.forEach(v => {
    console.log(`- ${v.make} ${v.model} (${v.registration}): MOT ${v.mot_status} until ${v.mot_expiry_date}`);
  });
  
  // Check MOTs expiring soon
  const motExpiringSoon = await pool.query(`
    SELECT 
      registration, 
      make, 
      model, 
      mot_expiry_date
    FROM vehicles 
    WHERE mot_expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '60 days')
    ORDER BY mot_expiry_date ASC
  `);
  
  console.log('\n=== MOTs EXPIRING SOON (next 60 days) ===');
  console.log(`Found ${motExpiringSoon.rows.length} vehicles with MOTs expiring soon.`);
  
  motExpiringSoon.rows.forEach(v => {
    const daysLeft = Math.ceil((new Date(v.mot_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    console.log(`- ${v.make} ${v.model} (${v.registration}): Expires in ${daysLeft} days (${v.mot_expiry_date})`);
  });
  
  await pool.end();
}

// Run the check
checkImportedData().catch(console.error);
