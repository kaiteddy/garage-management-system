import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Create a direct connection to Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function dropAllTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all tables
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%' 
      AND tablename NOT LIKE 'sql_%';
    `);
    
    const tables = result.rows.map(row => row.tablename);
    
    if (tables.length === 0) {
      console.log('No tables to drop.');
      return;
    }
    
    console.log('Dropping tables in this order to respect foreign key constraints:');
    // Drop tables in an order that respects foreign key constraints
    const tablesInOrder = [
      'document_items',
      'documents',
      'appointments',
      'reminders',
      'mot_history',
      'vehicles',
      'customers',
      'stock_items'
    ].filter(table => tables.includes(table));
    
    for (const table of tablesInOrder) {
      console.log(`- Dropping table: ${table}`);
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    
    await client.query('COMMIT');
    console.log('✅ All tables dropped successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropAllTables()
  .then(() => console.log('✅ Database cleanup complete!'))
  .catch(error => console.error('❌ Error cleaning up database:', error));
