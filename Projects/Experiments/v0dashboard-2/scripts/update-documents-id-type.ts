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
    
    // 3. Drop foreign key constraints that reference the documents table
    console.log('Dropping foreign key constraints...');
    await client.query(`
      ALTER TABLE document_items 
      DROP CONSTRAINT IF EXISTS document_items_document_id_fkey;
    `);
    
    // 4. Rename columns to make way for the new ones
    console.log('Renaming columns...');
    await client.query(`
      ALTER TABLE documents 
      RENAME COLUMN id TO old_id;
      
      ALTER TABLE documents 
      RENAME COLUMN temp_id TO id;
      
      ALTER TABLE document_items 
      RENAME COLUMN document_id TO old_document_id;
    `);
    
    // 5. Add new UUID columns
    console.log('Adding new UUID columns...');
    await client.query(`
      ALTER TABLE documents 
      ALTER COLUMN id SET NOT NULL;
      
      ALTER TABLE document_items 
      ADD COLUMN document_id UUID;
    `);
    
    // 6. Update document_items to use the new UUIDs
    console.log('Updating document_items with new UUIDs...');
    await client.query(`
      UPDATE document_items di
      SET document_id = d.id
      FROM documents d
      WHERE di.old_document_id = d.old_id;
    `);
    
    // 7. Drop old columns and add constraints
    console.log('Cleaning up old columns and adding constraints...');
    await client.query(`
      ALTER TABLE documents 
      DROP COLUMN old_id,
      ADD PRIMARY KEY (id);
      
      ALTER TABLE document_items 
      DROP COLUMN old_document_id,
      ALTER COLUMN document_id SET NOT NULL,
      ADD CONSTRAINT document_items_document_id_fkey 
        FOREIGN KEY (document_id) 
        REFERENCES documents(id) 
        ON DELETE CASCADE;
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
