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

async function addTotalAmountToDocuments() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding total_amount column to documents table...');
    
    // Add the total_amount column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'documents' 
          AND column_name = 'total_amount'
        ) THEN
          ALTER TABLE documents 
          ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0;
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('✅ total_amount column added to documents table successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding total_amount column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTotalAmountToDocuments()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
