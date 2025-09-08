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

async function updateDocumentsSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Updating documents table schema to include issue_date...');
    
    // Add the issue_date column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'documents' 
          AND column_name = 'issue_date'
        ) THEN
          ALTER TABLE documents 
          ADD COLUMN issue_date DATE;
        END IF;
      END $$;
    `);
    
    // Also ensure document_number exists (in case it was missed earlier)
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
    console.log('✅ Documents table schema updated successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating documents schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateDocumentsSchema()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
