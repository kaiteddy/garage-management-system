const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    console.log('Connection successful!', result.rows[0]);
    await client.release();
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
