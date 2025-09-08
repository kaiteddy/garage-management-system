const { Pool } = require('pg');
require('dotenv').config();

async function checkDatabaseTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Checking database tables...');
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No tables found in the database.');
      return;
    }
    
    console.log('\nFound tables:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check for required tables
    const requiredTables = ['vehicles', 'customers', 'documents', 'line_items', 'receipts', 'reminders', 'stock'];
    const existingTables = result.rows.map(row => row.table_name.toLowerCase());
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\nMissing required tables:');
      missingTables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log('\nAll required tables exist.');
    }
    
  } catch (error) {
    console.error('Error checking database tables:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseTables();
