import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkVehiclesSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Check vehicles table structure
    console.log('\n=== vehicles table structure ===');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    console.table(columns.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkVehiclesSchema()
  .catch(error => {
    console.error('❌ Error checking vehicles schema:', error);
    process.exit(1);
  });
