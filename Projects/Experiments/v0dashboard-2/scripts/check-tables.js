import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkTable(client, tableName) {
  try {
    // Get table structure
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    if (structure.rows.length === 0) {
      console.log(`\nThe ${tableName} table does not exist.`);
      return;
    }

    console.log(`\n${tableName.toUpperCase()} table structure:`);
    console.table(structure.rows);

    // Get row count
    const count = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`Total ${tableName}: ${parseInt(count.rows[0].count).toLocaleString()}`);

    // Get sample data
    if (parseInt(count.rows[0].count) > 0) {
      const sample = await client.query(`SELECT * FROM ${tableName} LIMIT 1`);
      console.log('\nSample record:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }
    
    return parseInt(count.rows[0].count);
  } catch (error) {
    console.error(`Error checking ${tableName}:`, error.message);
    return 0;
  }
}

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('=== Checking Database Tables ===');
    
    // Check customers and vehicles (already imported)
    await checkTable(client, 'customers');
    await checkTable(client, 'vehicles');
    
    // Check document-related tables
    await checkTable(client, 'documents');
    await checkTable(client, 'document_extras');
    await checkTable(client, 'line_items');
    
    // Check if we need to import these tables
    const docCount = await checkTable(client, 'documents');
    if (docCount === 0) {
      console.log('\n=== Next Steps ===');
      console.log('Documents table is empty. You may want to import data from Documents.csv');
      console.log('Document Extras and Line Items may also need to be imported.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables().catch(console.error);
