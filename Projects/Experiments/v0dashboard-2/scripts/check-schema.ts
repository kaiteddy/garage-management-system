import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Check if customers table exists
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n=== Tables in database ===');
    console.log(tables.rows.map(r => r.table_name).join('\n'));

    // Check customers table structure if it exists
    if (tables.rows.some(r => r.table_name === 'customers')) {
      console.log('\n=== customers table structure ===');
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'customers'
        ORDER BY ordinal_position
      `);
      console.table(columns.rows);
    } else {
      console.log('\n❌ customers table does not exist');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema()
  .catch(error => {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  });
