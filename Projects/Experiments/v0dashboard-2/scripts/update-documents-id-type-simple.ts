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

async function updateDocumentsIdType() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to update documents table ID type to UUID...');
    
    await client.query('BEGIN');
    
    // 1. Create a new temporary column for the UUID
    console.log('Adding temporary UUID column...');
    await client.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS temp_id UUID;
    `);
    
    // 2. Generate UUIDs for existing records
    console.log('Generating UUIDs for existing records...');
    await client.query(`
      UPDATE documents 
      SET temp_id = gen_random_uuid()
      WHERE temp_id IS NULL;
    `);
    
    // 3. Rename columns to make way for the new ones
    console.log('Renaming columns...');
    await client.query(`
      ALTER TABLE documents 
      RENAME COLUMN id TO old_id;
      
      ALTER TABLE documents 
      RENAME COLUMN temp_id TO id;
    `);
    
    // 4. Set the new ID as primary key
    console.log('Setting new ID as primary key...');
    await client.query(`
      ALTER TABLE documents 
      ALTER COLUMN id SET NOT NULL,
      DROP CONSTRAINT IF EXISTS documents_pkey,
      ADD PRIMARY KEY (id);
      
      -- Drop the old ID column
      ALTER TABLE documents 
      DROP COLUMN old_id;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Successfully updated documents table to use UUID for ID');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating documents table ID type:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateDocumentsIdType()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
