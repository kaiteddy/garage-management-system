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

// Define the LineItem type with actual CSV headers
interface LineItem {
  _ID: string;
  _ID_Document?: string;
  _ID_Stock?: string;
  itemDescription?: string;
  itemQuantity?: string;
  itemUnitPrice?: string;
  itemSub_Gross?: string;
  itemTaxRate?: string;
  itemTaxAmount?: string;
  itemNotes?: string;
  itemType?: string;
  // fallback legacy fields
  line_type?: string;
  description?: string;
  quantity?: string;
  unit_price?: string;
  tax_rate?: string;
  tax_amount?: string;
  total_amount?: string;
  notes?: string;
}

async function importLineItems(filePath: string) {
  console.log(`Starting line items import from ${filePath}...`);
  
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
    
    console.log('\nLine items import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during line items import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: LineItem[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID || !record._ID_Document) {
        console.log('Skipping line item - missing ID or document ID');
        skipped++;
        continue;
      }
      
      // Parse numbers from correct CSV headers, fallback to legacy fields
      const quantity = record.itemQuantity ? parseFloat(record.itemQuantity) : (record.quantity ? parseFloat(record.quantity) : 1);
      const unitPrice = record.itemUnitPrice ? parseFloat(record.itemUnitPrice) : (record.unit_price ? parseFloat(record.unit_price) : 0);
      const taxRate = record.itemTaxRate ? parseFloat(record.itemTaxRate) : (record.tax_rate ? parseFloat(record.tax_rate) : 0);
      const taxAmount = record.itemTaxAmount ? parseFloat(record.itemTaxAmount) : (record.tax_amount ? parseFloat(record.tax_amount) : 0);
      const totalAmount = record.itemSub_Gross ? parseFloat(record.itemSub_Gross) : (record.total_amount ? parseFloat(record.total_amount) : 0);
      
      // Check if referenced document exists
      const docRes = await client.query('SELECT 1 FROM documents WHERE id = $1', [record._ID_Document]);
      if (docRes.rowCount === 0) {
        console.log(`Skipping line item ${record._ID} - missing referenced document`);
        skipped++;
        continue;
      }
      
      // Prepare line item data using correct CSV headers, fallback to legacy fields
      const lineItem = {
        id: record._ID,
        document_id: record._ID_Document,
        stock_id: record._ID_Stock || null,
        line_type: record.itemType || record.line_type || null, // use itemType from CSV
        description: record.itemDescription || record.description || null,
        quantity: record.itemQuantity ? parseFloat(record.itemQuantity) : (record.quantity ? parseFloat(record.quantity) : null),
        unit_price: record.itemUnitPrice ? parseFloat(record.itemUnitPrice) : (record.unit_price ? parseFloat(record.unit_price) : null),
        tax_rate: record.itemTaxRate ? parseFloat(record.itemTaxRate) : (record.tax_rate ? parseFloat(record.tax_rate) : null),
        tax_amount: record.itemTaxAmount ? parseFloat(record.itemTaxAmount) : (record.tax_amount ? parseFloat(record.tax_amount) : null),
        total_amount: record.itemSub_Gross ? parseFloat(record.itemSub_Gross) : (record.total_amount ? parseFloat(record.total_amount) : null),
        notes: record.itemNotes || record.notes || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO line_items (
          id, document_id, stock_id, line_type, description, quantity, unit_price, tax_rate, tax_amount, total_amount, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          stock_id = EXCLUDED.stock_id,
          line_type = EXCLUDED.line_type,
          description = EXCLUDED.description,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          tax_rate = EXCLUDED.tax_rate,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          lineItem.id,
          lineItem.document_id,
          lineItem.stock_id,
          lineItem.line_type,
          lineItem.description,
          lineItem.quantity,
          lineItem.unit_price,
          lineItem.tax_rate,
          lineItem.tax_amount,
          lineItem.total_amount,
          lineItem.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} line items...`);
      }
      
    } catch (error: any) {
      console.error(`Error importing line item ${record._ID || 'unknown'}:`, error.message);
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
    console.error('Please provide the path to the LineItems.csv file');
    process.exit(1);
  }
  
  importLineItems(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importLineItems };
