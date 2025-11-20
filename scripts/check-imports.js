const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkImports() {
  const client = await pool.connect();
  try {
    // Get table counts
    const tables = ['customers', 'vehicles', 'appointments', 'documents', 'service_history'];
    
    console.log('=== Import Summary ===\n');
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table.padEnd(15)}: ${parseInt(result.rows[0].count).toLocaleString()} records`);
      } catch (error) {
        console.log(`${table.padEnd(15)}: Not imported or table doesn't exist`);
      }
    }
    
    // Get some stats about the imported data
    console.log('\n=== Vehicle Import Details ===');
    
    // Vehicles without customers
    const noCustomer = await client.query(
      'SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL'
    );
    console.log(`\nVehicles without customer: ${parseInt(noCustomer.rows[0].count).toLocaleString()}`);
    
    // Top 5 makes
    const topMakes = await client.query(`
      SELECT make, COUNT(*) as count 
      FROM vehicles 
      WHERE make IS NOT NULL 
      GROUP BY make 
      ORDER BY count DESC 
      LIMIT 5`);
      
    console.log('\nTop 5 Vehicle Makes:');
    topMakes.rows.forEach(row => {
      console.log(`- ${row.make.padEnd(15)}: ${parseInt(row.count).toLocaleString()}`);
    });
    
    // Vehicles by year
    const byYear = await client.query(`
      SELECT year, COUNT(*) as count 
      FROM vehicles 
      WHERE year IS NOT NULL 
      GROUP BY year 
      ORDER BY year DESC`);
      
    console.log('\nVehicles by Year:');
    byYear.rows.forEach(row => {
      console.log(`- ${row.year}: ${parseInt(row.count).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('Error checking imports:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkImports().catch(console.error);
