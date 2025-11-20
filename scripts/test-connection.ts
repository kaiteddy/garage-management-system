// Load environment variables
import 'dotenv/config';

async function main() {
  try {
    // Log environment variables (mask sensitive data)
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('Error: DATABASE_URL is not set in environment variables');
      process.exit(1);
    }

    // Mask password in the URL for logging
    const maskedUrl = dbUrl.replace(/:([^:]*?)@/, ':***@');
    console.log(`Connecting to database: ${maskedUrl}`);

    // Try to connect using the Neon client
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);

    // Test connection
    console.log('Testing database connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('Connection test result:', result);

    // Check if documents table exists
    console.log('\nChecking for documents table...');
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
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
