// Script to check documents table structure in Neon database
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function checkDocumentsTable() {
  try {
    // Get database URL from environment variables
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('Error: DATABASE_URL is not set in environment variables');
      process.exit(1);
    }

    console.log('Connecting to Neon database...');
    const sql = neon(databaseUrl);

    // 1. Check table structure
    console.log('\n=== Table Structure ===');
    const structure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position;
    `;
    
    console.table(structure);

    // 2. Get row count
    const countResult = await sql`SELECT COUNT(*) as count FROM documents`;
    const rowCount = countResult[0].count;
    console.log(`\n=== Row Count: ${rowCount} ===`);

    // 3. Get sample data (first 5 rows)
    if (rowCount > 0) {
      console.log('\n=== Sample Data (first 5 rows) ===');
      const sampleData = await sql`SELECT * FROM documents LIMIT 5`;
      console.table(sampleData);
    }

    // 4. Check indexes
    console.log('\n=== Indexes ===');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'documents';
    `;
    console.table(indexes);

  } catch (error) {
    console.error('Error checking documents table:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkDocumentsTable();
