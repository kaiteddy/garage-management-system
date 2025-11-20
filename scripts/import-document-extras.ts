import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
// Simple CSV parser function
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const result: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const obj: Record<string, string> = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] || '';
    }
    
    result.push(obj);
  }
  
  return result;
}
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createDocumentExtrasTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create document_extras table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_extras (
        id VARCHAR(50) PRIMARY KEY,
        document_id VARCHAR(50) REFERENCES documents(id) ON DELETE CASCADE,
        key VARCHAR(100) NOT NULL,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(document_id, key)
      );
    `);

    await client.query('COMMIT');
    console.log('Created table: document_extras');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating document_extras table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importDocumentExtras() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Document_Extras.csv'
    );
    
    console.log(`Reading document extras from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} document extras to import`);
    
    await client.query('BEGIN');
    
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        values.push(
          row._ID,
          row._ID_Document,
          row.key || 'extra_field',
          row.value || ''
        );
        
        placeholders.push(
          `(${Array.from({ length: 4 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO document_extras (
          id, document_id, key, value, created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          key = EXCLUDED.key,
          value = EXCLUDED.value,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} document extras...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} document extras`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing document extras:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting document extras import process...');
    
    // Create document_extras table
    await createDocumentExtrasTable();
    
    // Import document extras
    await importDocumentExtras();
    
    console.log('Document extras import process completed successfully!');
  } catch (error) {
    console.error('Error in document extras import process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
