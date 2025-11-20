import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { stringToUuid } from './convert-to-uuid.js';
// Simple CSV parser function that handles quoted values
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        obj[header] = values[j] || '';
      }
      
      result.push(obj);
    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${lines[i]}`);
      console.error(error);
    }
  }
  
  return result;
}

// Helper function to parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle inQuotes when we hit a quote
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Only split on comma if not in quotes
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  // Remove surrounding quotes from each field
  return result.map(field => 
    field.startsWith('"') && field.endsWith('"') 
      ? field.slice(1, -1) 
      : field
  );
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

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(50) PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id VARCHAR(50),
        document_type VARCHAR(50),
        document_number VARCHAR(100),
        issue_date DATE,
        due_date DATE,
        status VARCHAR(50),
        total_amount DECIMAL(12, 2),
        tax_amount DECIMAL(12, 2),
        net_amount DECIMAL(12, 2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create line_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS line_items (
        id VARCHAR(50) PRIMARY KEY,
        document_id VARCHAR(50) REFERENCES documents(id) ON DELETE CASCADE,
        stock_id VARCHAR(50),
        description TEXT,
        quantity DECIMAL(10, 2),
        unit_price DECIMAL(12, 2),
        tax_rate DECIMAL(5, 2),
        tax_amount DECIMAL(12, 2),
        total_amount DECIMAL(12, 2),
        item_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Created tables: documents, line_items');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importDocuments() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'
    );
    
    console.log(`Reading documents from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} documents to import`);
    
    await client.query('BEGIN');
    
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        // Convert string IDs to UUID format
        const docId = stringToUuid(row._ID);
        const customerId = row._ID_Customer ? stringToUuid(row._ID_Customer) : null;
        const vehicleId = row._ID_Vehicle ? stringToUuid(row._ID_Vehicle) : null;
        
        values.push(
          docId,
          customerId,
          vehicleId,
          row.docType || 'INVOICE',
          row.docNumber || null,
          row.docDate_Issued ? new Date(row.docDate_Issued) : null,
          row.docDate_Due ? new Date(row.docDate_Due) : null,
          row.docStatus || 'PENDING',
          parseFloat(row.docTotal_GROSS || '0'),
          parseFloat(row.docTotal_TAX || '0'),
          parseFloat(row.docTotal_NET || '0'),
          row.docNotes || null
        );
        
        placeholders.push(
          `(${Array.from({ length: 12 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO documents (
          id, customer_id, vehicle_id, document_type, document_number,
          issue_date, due_date, status, total_amount, tax_amount,
          net_amount, notes, created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          vehicle_id = EXCLUDED.vehicle_id,
          document_type = EXCLUDED.document_type,
          document_number = EXCLUDED.document_number,
          issue_date = EXCLUDED.issue_date,
          due_date = EXCLUDED.due_date,
          status = EXCLUDED.status,
          total_amount = EXCLUDED.total_amount,
          tax_amount = EXCLUDED.tax_amount,
          net_amount = EXCLUDED.net_amount,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} documents...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} documents`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing documents:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importLineItems() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv'
    );
    
    console.log(`Reading line items from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} line items to import`);
    
    await client.query('BEGIN');
    
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        // Convert string IDs to UUID format
        const lineItemId = stringToUuid(row._ID);
        const documentId = stringToUuid(row._ID_Document);
        const stockId = row._ID_Stock ? stringToUuid(row._ID_Stock) : null;
        
        values.push(
          lineItemId,
          documentId,
          stockId,
          row.itemDescription || '',
          parseFloat(row.itemQuantity || '1'),
          parseFloat(row.itemUnitPrice || '0'),
          parseFloat(row.itemTaxRate || '0'),
          parseFloat(row.itemSub_Tax || '0'),
          parseFloat(row.itemSub_Gross || '0'),
          row.itemType || 'SERVICE'
        );
        
        placeholders.push(
          `(${Array.from({ length: 10 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO line_items (
          id, document_id, stock_id, description, quantity,
          unit_price, tax_rate, tax_amount, total_amount, item_type,
          created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          stock_id = EXCLUDED.stock_id,
          description = EXCLUDED.description,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          tax_rate = EXCLUDED.tax_rate,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          item_type = EXCLUDED.item_type,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} line items...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} line items`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing line items:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting document import process...');
    
    // Create tables
    await createTables();
    
    // Import documents
    await importDocuments();
    
    // Import line items
    await importLineItems();
    
    console.log('Document import process completed successfully!');
  } catch (error) {
    console.error('Error in document import process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
