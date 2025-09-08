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

async function showCustomerJobDetails(customerId) {
  const client = await pool.connect();
  try {
    // Get all jobs for the customer
    const jobsRes = await client.query(
      'SELECT * FROM documents WHERE customer_id = $1',
      [customerId]
    );
    for (const job of jobsRes.rows) {
      console.log('\n=== Job (Document) ===');
      console.log(job);
      // Get line items for this job
      const lineItemsRes = await client.query(
        'SELECT * FROM line_items WHERE document_id = $1',
        [job.id]
      );
      console.log('Line Items:', lineItemsRes.rows);
      // Get document extras for this job
      const extrasRes = await client.query(
        'SELECT * FROM document_extras WHERE id = $1',
        [job.id]
      );
      console.log('Document Extras:', extrasRes.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Example customer id from previous output
showCustomerJobDetails('OOTOSBT1OQQERJUZ6NA5');
