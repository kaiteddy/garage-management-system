import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local if not in production
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(process.cwd(), '.env.local');
  const { existsSync } = await import('fs');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupDatabase() {
  const client = await pool.connect();
  try {
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = "replica";');
    
    // Get all tables
    const tables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    
    // Truncate all tables
    for (const table of tables.rows) {
      if (table.tablename !== 'migrations') { // Don't truncate migrations table
        console.log(`Truncating table: ${table.tablename}`);
        await client.query(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
      }
    }
    
    console.log('✅ Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = "origin";');
    client.release();
    await pool.end();
  }
}

cleanupDatabase().catch(console.error);
