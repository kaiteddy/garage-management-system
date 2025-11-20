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

async function addStatusToDocuments() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding status column to documents table...');
    
    // Add the status column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'documents' 
          AND column_name = 'status'
        ) THEN
          ALTER TABLE documents 
          ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('✅ status column added to documents table successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding status column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addStatusToDocuments()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
