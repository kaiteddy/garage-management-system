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

async function addDueDateToDocuments() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding due_date column to documents table...');
    
    // Add the due_date column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'documents' 
          AND column_name = 'due_date'
        ) THEN
          ALTER TABLE documents 
          ADD COLUMN due_date DATE;
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('✅ due_date column added to documents table successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding due_date column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDueDateToDocuments()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
