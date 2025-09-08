import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

// Database connection pool
function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Define the DocumentExtra type with actual CSV headers
interface DocumentExtra {
  _ID: string;
  'Labour Description'?: string;
  docNotes?: string;
  // fallback legacy fields
  labour_description?: string;
  notes?: string;
}

async function importDocumentExtras(filePath: string) {
  console.log(`Starting document extras import from ${filePath}...`);
  
  const pool = createPool();
  const client = await pool.connect();
  
  try {
    // Read and parse the CSV file
    const fileContent = readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: (header: string[]) => header.map(col => col.trim()),
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      relax_column_count: true
    });
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 100;
    
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await processBatch(client, batch);
      imported += result.imported;
      skipped += result.skipped;
      errors += result.errors;
      
      // Log progress
      if (i % 1000 === 0 || i + batchSize >= records.length) {
        console.log(`Processed ${Math.min(i + batchSize, records.length)} of ${records.length} records...`);
      }
    }
    
    console.log('\nDocument extras import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during document extras import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: DocumentExtra[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping document extra - missing ID');
        skipped++;
        continue;
      }
      
      // Check if referenced document exists
      const docRes = await client.query('SELECT 1 FROM documents WHERE id = $1', [record._ID]);
      if (docRes.rowCount === 0) {
        console.log(`Skipping document extra ${record._ID} - missing referenced document`);
        skipped++;
        continue;
      }
      
      // Prepare document extra data using correct CSV headers, fallback to legacy fields
      const documentExtra = {
        id: record._ID,
        labour_description: (record['Labour Description'] || record.labour_description || '').substring(0, 5000) || null,
        notes: (record.docNotes || record.notes || '').substring(0, 1000) || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO document_extras (
          id, labour_description, notes
        ) VALUES (
          $1, $2, $3
        )
        ON CONFLICT (id) DO UPDATE SET
          labour_description = EXCLUDED.labour_description,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          documentExtra.id,
          documentExtra.labour_description,
          documentExtra.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} document extras...`);
      }
      
    } catch (error: any) {
      console.error(`Error importing document extra ${record._ID || 'unknown'}:`, error.message);
      errors++;
      skipped++;
    }
  }
  
  return { imported, skipped, errors };
}

// Run the import if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide the path to the Document_Extras.csv file');
    process.exit(1);
  }
  
  importDocumentExtras(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importDocumentExtras };
