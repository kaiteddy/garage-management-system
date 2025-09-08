import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function inspectSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Get list of all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n=== Database Tables ===');
    for (const row of tablesResult.rows) {
      console.log(`\nTable: ${row.table_name}`);
      
      // Get columns for each table
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);
      
      console.log('Columns:');
      console.table(columnsResult.rows);
      
      // Get indexes for each table
      const indexesResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [row.table_name]);
      
      if (indexesResult.rows.length > 0) {
        console.log('\nIndexes:');
        console.table(indexesResult.rows);
      }
    }
    
  } catch (error) {
    console.error('Error inspecting schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the inspection
inspectSchema().catch(console.error);
