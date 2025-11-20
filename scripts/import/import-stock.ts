import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createPool } from '../utils/db-utils';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Define the Stock type
interface Stock {
  _ID: string;
  part_number?: string;
  description?: string;
  quantity_in_stock?: string;
  unit_price?: string;
  tax_rate?: string;
  notes?: string;
}

async function importStock(filePath: string) {
  console.log(`Starting stock import from ${filePath}...`);
  
  const pool = createPool();
  const client = await pool.connect();
  
  try {
    const parser = createReadStream(filePath)
      .pipe(parse({
        columns: (header) => header.map((col: string) => col.trim()),
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '\\\\',
        relax_column_count: true
      }));
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let batch: Stock[] = [];
    const batchSize = 100;
    
    // Process records in batches
    for await (const record of parser) {
      batch.push(record);
      
      if (batch.length >= batchSize) {
        const result = await processBatch(client, batch);
        imported += result.imported;
        skipped += result.skipped;
        errors += result.errors;
        batch = [];
      }
    }
    
    // Process any remaining records
    if (batch.length > 0) {
      const result = await processBatch(client, batch);
      imported += result.imported;
      skipped += result.skipped;
      errors += result.errors;
    }
    
    console.log('\nStock import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during stock import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Stock[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping stock item - missing ID');
        skipped++;
        continue;
      }
      
      // Parse numbers
      const quantityInStock = record.quantity_in_stock ? parseFloat(record.quantity_in_stock) : 0;
      const unitPrice = record.unit_price ? parseFloat(record.unit_price) : 0;
      const taxRate = record.tax_rate ? parseFloat(record.tax_rate) : 0;
      
      // Prepare stock data
      const stockItem = {
        id: record._ID,
        part_number: (record.part_number || '').substring(0, 50) || null,
        description: (record.description || '').substring(0, 500) || 'No description',
        quantity_in_stock: quantityInStock,
        unit_price: unitPrice,
        tax_rate: taxRate,
        notes: (record.notes || '').substring(0, 1000) || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO stock (
          id, part_number, description, quantity_in_stock, unit_price, tax_rate, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (id) DO UPDATE SET
          part_number = EXCLUDED.part_number,
          description = EXCLUDED.description,
          quantity_in_stock = EXCLUDED.quantity_in_stock,
          unit_price = EXCLUDED.unit_price,
          tax_rate = EXCLUDED.tax_rate,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          stockItem.id,
          stockItem.part_number,
          stockItem.description,
          stockItem.quantity_in_stock,
          stockItem.unit_price,
          stockItem.tax_rate,
          stockItem.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} stock items...`);
      }
      
    } catch (error) {
      console.error(`Error importing stock item ${record._ID || 'unknown'}:`, error.message);
      errors++;
      skipped++;
    }
  }
  
  return { imported, skipped, errors };
}

// Run the import if this file is executed directly
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide the path to the Stock.csv file');
    process.exit(1);
  }
  
  importStock(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importStock };
