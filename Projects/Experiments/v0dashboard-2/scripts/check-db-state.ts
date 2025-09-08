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

async function checkDatabaseState() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database state...');
    
    // Get all tables and their row counts
    const tables = await client.query(`
      SELECT 
        table_name,
        (xpath('/row/cnt/text()', 
          query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', table_schema, table_name), 
          false, true, '')))[1]::text::int as row_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📊 Current Database State:');
    console.log('-----------------------');
    
    let totalRows = 0;
    let hasData = false;
    
    for (const row of tables.rows) {
      console.log(`${row.table_name}: ${row.row_count} rows`);
      totalRows += row.row_count;
      if (row.row_count > 0) hasData = true;
    }
    
    console.log('-----------------------');
    console.log(`Total rows across all tables: ${totalRows}`);
    
    if (!hasData) {
      console.log('\n✅ Database is empty and ready for data import.');
    } else {
      console.log('\n⚠️  Database contains data. Please ensure this is expected.');
    }
    
    return hasData;
    
  } catch (error) {
    console.error('Error checking database state:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabaseState()
  .then(hasData => {
    if (!hasData) {
      console.log('\nNext steps:');
      console.log('1. Run database migrations (if any)');
      console.log('2. Import your data');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to check database state:', error);
    process.exit(1);
  });
