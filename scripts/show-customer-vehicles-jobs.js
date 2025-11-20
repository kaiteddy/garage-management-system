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

async function showCustomerVehiclesAndJobs(customerId) {
  const client = await pool.connect();
  try {
    // Vehicles owned by the customer
    const vehiclesRes = await client.query(
      'SELECT * FROM vehicles WHERE customer_id = $1',
      [customerId]
    );
    console.log(`Vehicles for customer ${customerId}:`);
    console.log(vehiclesRes.rows);

    // Documents (jobs) for the customer
    const jobsRes = await client.query(
      'SELECT * FROM documents WHERE customer_id = $1',
      [customerId]
    );
    console.log(`\nJobs (documents) for customer ${customerId}:`);
    console.log(jobsRes.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

// Example customer id from previous output
showCustomerVehiclesAndJobs('OOTOSBT1OQQERJUZ6NA5');
