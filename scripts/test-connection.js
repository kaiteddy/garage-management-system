const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    
    // Test a simple query
    const result = await client.query('SELECT $1::text as message', ['Database connection successful!']);
    console.log('Query result:', result.rows[0].message);
    
    await client.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
