const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if vehicles table exists
    const vehiclesQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles';
    `;
    
    const vehiclesRes = await pool.query(vehiclesQuery);
    console.log('\n📋 VEHICLES TABLE COLUMNS:');
    console.table(vehiclesRes.rows);
    
    // Check if customers table exists
    const customersQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'customers';
    `;
    
    const customersRes = await pool.query(customersQuery);
    console.log('\n👥 CUSTOMERS TABLE COLUMNS:');
    console.table(customersRes.rows);
    
    // Count records in vehicles table
    const countRes = await pool.query('SELECT COUNT(*) FROM vehicles');
    console.log(`\n📊 Total vehicles in database: ${countRes.rows[0].count}`);
    
    // Show a sample of vehicle registrations
    const sampleRes = await pool.query('SELECT registration FROM vehicles LIMIT 10');
    console.log('\n🚗 Sample vehicle registrations:');
    sampleRes.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.registration || '[NULL]'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
