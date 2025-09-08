import pg from 'pg';
import dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';

// Load environment variables from .env.local if it exists
const envPath = `${process.cwd()}/.env.local`;
const env = dotenv.config({ path: envPath });
dotenvExpand.expand(env);

console.log(`✅ Loaded environment variables from ${envPath}`);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Database Tables:');
    console.log('------------------');
    for (const row of tables.rows) {
      console.log(`- ${row.table_name}`);
      
      // Get column info for each table
      const columns = await client.query({
        text: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `,
        values: [row.table_name]
      });
      
      console.log(`  Columns in ${row.table_name}:`);
      for (const col of columns.rows) {
        console.log(`    - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
      }
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
