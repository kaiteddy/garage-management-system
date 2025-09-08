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

async function checkDocumentsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Checking documents table schema...');
    
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents';
    `);
    
    console.log('Documents table schema:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error checking documents schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDocumentsSchema()
  .then(() => console.log('✅ Schema check completed!'))
  .catch(error => console.error('❌ Error checking schema:', error));
