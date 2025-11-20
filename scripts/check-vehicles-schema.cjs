const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
  try {
    console.log('🔍 Checking vehicles table schema...');
    
    // Get column information for the vehicles table
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Vehicles Table Schema:');
    console.table(result.rows);
    
    // Get primary key information
    const pkResult = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'vehicles'::regclass
      AND i.indisprimary;
    `);
    
    console.log('\n🔑 Primary Key Column(s):', 
      pkResult.rows.length > 0 
        ? pkResult.rows.map(r => r.attname).join(', ')
        : 'No primary key found');
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSchema();
