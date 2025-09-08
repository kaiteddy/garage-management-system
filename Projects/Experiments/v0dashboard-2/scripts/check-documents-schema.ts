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
    // Check if documents table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Documents table does not exist.');
      return;
    }
    
    // Get documents table schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== Documents Table Schema ===');
    console.table(result.rows);
    
    // Check for required columns
    const hasDocumentNumber = result.rows.some(row => row.column_name === 'document_number');
    console.log('\nDocument Number Column:', hasDocumentNumber ? '✅ Found' : '❌ Missing');
    
  } catch (error) {
    console.error('Error checking documents schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDocumentsSchema().catch(console.error);
