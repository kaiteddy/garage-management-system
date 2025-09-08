#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Run the import script
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false 
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping and recreating database schema...');
    const sql = fs.readFileSync('scripts/fix-schema.sql', 'utf8');
    await client.query(sql);
    console.log('Schema updated successfully');
    
    console.log('\nRunning import script...');
    await require('./scripts/import-real-data');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
"
