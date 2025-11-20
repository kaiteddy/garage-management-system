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

async function createReceiptsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create receipts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id VARCHAR(50) PRIMARY KEY,
        document_id VARCHAR(50) REFERENCES documents(id) ON DELETE CASCADE,
        payment_method VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        receipt_date DATE NOT NULL,
        description TEXT,
        reconciled BOOLEAN DEFAULT FALSE,
        reconciled_date DATE,
        reconciled_reference VARCHAR(100),
        surcharge_amount DECIMAL(12, 2) DEFAULT 0,
        surcharge_tax DECIMAL(12, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Created table: receipts');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating receipts table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importReceipts() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Receipts.csv'
    );
    
    console.log(`Reading receipts from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} receipts to import`);
    
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
          row._ID_Document || null,
          row.Method || 'UNKNOWN',
          parseFloat(row.Amount || '0'),
          row.Date ? new Date(row.Date) : new Date(),
          row.Description || '',
          row.Reconciled === 'TRUE',
          row.Reconciled_Date ? new Date(row.Reconciled_Date) : null,
          row.Reconciled_Ref || null,
          parseFloat(row.SurchargeGROSS || '0'),
          parseFloat(row.SurchargeTAX || '0')
        );
        
        placeholders.push(
          `(${Array.from({ length: 11 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO receipts (
          id, document_id, payment_method, amount, receipt_date,
          description, reconciled, reconciled_date, reconciled_reference,
          surcharge_amount, surcharge_tax,
          created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          payment_method = EXCLUDED.payment_method,
          amount = EXCLUDED.amount,
          receipt_date = EXCLUDED.receipt_date,
          description = EXCLUDED.description,
          reconciled = EXCLUDED.reconciled,
          reconciled_date = EXCLUDED.reconciled_date,
          reconciled_reference = EXCLUDED.reconciled_reference,
          surcharge_amount = EXCLUDED.surcharge_amount,
          surcharge_tax = EXCLUDED.surcharge_tax,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} receipts...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} receipts`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing receipts:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting receipts import process...');
    
    // Create receipts table
    await createReceiptsTable();
    
    // Import receipts
    await importReceipts();
    
    console.log('Receipts import process completed successfully!');
  } catch (error) {
    console.error('Error in receipts import process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
