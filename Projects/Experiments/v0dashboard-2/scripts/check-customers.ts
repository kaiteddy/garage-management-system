import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables from .env file
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkCustomers() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, email FROM customers');
    console.log('Customers in database:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error checking customers:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCustomers().catch(console.error);
