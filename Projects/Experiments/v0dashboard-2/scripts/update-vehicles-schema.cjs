// Script to update vehicles table schema
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function updateSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add mot_raw_data column if it doesn't exist
    console.log('🔧 Adding mot_raw_data column if needed...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS mot_raw_data JSONB
    `);
    
    // Clean up registration numbers (remove quotes and trim whitespace)
    console.log('🧹 Cleaning up registration numbers...');
    await client.query(`
      UPDATE vehicles 
      SET registration = TRIM(BOTH '"' FROM registration),
          registration = TRIM(registration)
      WHERE registration ~ '^\".*"$' OR registration ~ '^\\s+.*\\s+$';
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database schema updated successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating schema:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
