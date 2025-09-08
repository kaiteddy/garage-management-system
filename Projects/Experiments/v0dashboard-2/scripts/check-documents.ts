import { sql } from "@/lib/database/neon-client"

async function checkDocuments() {
  try {
    // Check if documents table exists and get its structure
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      ) as exists;
    `
    
    console.log('Documents table exists:', tableExists[0].exists)
    
    if (tableExists[0].exists) {
      // Get table structure
      const structure = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'documents'
        ORDER BY ordinal_position;
      `
      console.log('\nDocuments table structure:')
      console.table(structure)
      
      // Get row count
      const count = await sql`SELECT COUNT(*) as count FROM documents`
      console.log('\nTotal documents:', count[0].count)
      
      // Get sample data if any exists
      if (count[0].count > 0) {
        const sample = await sql`SELECT * FROM documents LIMIT 5`
        console.log('\nSample documents:')
        console.table(sample)
      }
    }
    
    // Check for any recent uploads in the upload store
    const uploads = await sql`
      SELECT * FROM upload_logs 
      WHERE table_name = 'documents' 
      ORDER BY uploaded_at DESC 
      LIMIT 5;
    `.catch(() => [])
    
    console.log('\nRecent uploads to documents table:')
    console.table(uploads)
    
  } catch (error) {
    console.error('Error checking documents:', error)
  } finally {
    process.exit(0)
  }
}

checkDocuments()
