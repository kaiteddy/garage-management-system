import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function checkSchema() {
  console.log('\n🔍 Checking database schema...\n');
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    
    // List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Found tables:');
    console.log('----------------');
    
    if (tablesRes.rows.length === 0) {
      console.log('No tables found in the database!');
      return;
    }
    
    // Check each table's structure
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      console.log(`\n📊 Table: ${tableName}`);
      console.log('----------------');
      
      // Get column info
      const columnsRes = await client.query({
        text: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `,
        values: [tableName]
      });
      
      if (columnsRes.rows.length === 0) {
        console.log('  No columns found!');
        continue;
      }
      
      // Display column info
      console.log('  Columns:');
      for (const col of columnsRes.rows) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = col.column_default ? `DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable} ${defaultValue}`);
      }
      
      // Get row count
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`\n  Rows: ${parseInt(countRes.rows[0].count).toLocaleString()}`);
      } catch (error) {
        console.log('  Could not get row count:', error.message);
      }
    }
    
    client.release();
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema().catch(console.error);
