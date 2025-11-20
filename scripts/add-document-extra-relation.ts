// Script to add document_id foreign key to document_extras table
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function addDocumentRelation() {
  try {
    // Get database URL from environment variables
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('Error: DATABASE_URL is not set in environment variables');
      process.exit(1);
    }

    console.log('Connecting to Neon database...');
    const sql = neon(databaseUrl);

    // Add document_id column if it doesn't exist
    console.log('Adding document_id column to document_extras table...');
    await sql`
      ALTER TABLE document_extras 
      ADD COLUMN IF NOT EXISTS document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE;
    `;

    // Add index for better query performance
    console.log('Creating index on document_id...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_document_extras_document_id 
      ON document_extras(document_id);
    `;

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
addDocumentRelation();
