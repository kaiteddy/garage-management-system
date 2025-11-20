import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function showExampleCustomer() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM customers LIMIT 1');
    console.log(res.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

showExampleCustomer();
