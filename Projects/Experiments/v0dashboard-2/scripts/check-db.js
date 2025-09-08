// Simple script to check database connection and documents table
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../.env.local` });

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('Error: DATABASE_URL is not set in environment variables');
      process.exit(1);
    }

    console.log('Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);

    // Test connection
    console.log('Testing connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('Connection successful!', result);

    // Check if documents table exists
    console.log('\nChecking documents table...');
    try {
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'documents'
        ) as exists;
      `;
      
      console.log('Documents table exists:', tableExists[0].exists);
      
      if (tableExists[0].exists) {
        // Get row count
        const count = await sql`SELECT COUNT(*) as count FROM documents`;
        console.log('\nTotal documents in database:', count[0].count);
        
        // Get table structure
        const structure = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'documents'
          ORDER BY ordinal_position;
        `;
        
        console.log('\nTable structure:');
        console.table(structure);
        
        // Get sample data if any exists
        if (count[0].count > 0) {
          const sample = await sql`SELECT * FROM documents LIMIT 5`;
          console.log('\nSample documents:');
          console.table(sample);
        }
      }
    } catch (error) {
      console.error('Error querying database:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
