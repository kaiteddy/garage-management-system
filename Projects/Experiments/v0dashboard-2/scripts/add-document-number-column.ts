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

async function addDocumentNumberColumn() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding document_number column to documents table...');
    
    // Add the document_number column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'documents' 
          AND column_name = 'document_number'
        ) THEN
          ALTER TABLE documents 
          ADD COLUMN document_number VARCHAR(100);
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('✅ document_number column added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding document_number column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDocumentNumberColumn()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
