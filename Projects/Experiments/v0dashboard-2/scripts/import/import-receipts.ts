import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createPool } from '../utils/db-utils';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Define the Receipt type
interface Receipt {
  _ID: string;
  _ID_Document?: string;
  _ID_AccountPayment?: string;
  payment_date?: string;
  payment_method?: string;
  amount?: string;
  reference?: string;
  notes?: string;
}

async function importReceipts(filePath: string) {
  console.log(`Starting receipts import from ${filePath}...`);
  
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
    let batch: Receipt[] = [];
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
    
    console.log('\nReceipts import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during receipts import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Receipt[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID || !record._ID_Document) {
        console.log('Skipping receipt - missing ID or document ID');
        skipped++;
        continue;
      }
      
      // Parse date and amount
      const paymentDate = record.payment_date ? new Date(record.payment_date) : new Date();
      const amount = record.amount ? parseFloat(record.amount) : 0;
      
      // Prepare receipt data
      const receipt = {
        id: record._ID,
        document_id: record._ID_Document,
        account_payment_id: record._ID_AccountPayment || null,
        payment_date: paymentDate,
        payment_method: (record.payment_method || '').substring(0, 50) || 'Cash',
        amount: amount,
        reference: (record.reference || '').substring(0, 100) || null,
        notes: (record.notes || '').substring(0, 1000) || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO receipts (
          id, document_id, account_payment_id, payment_date, 
          payment_method, amount, reference, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (id) DO UPDATE SET
          document_id = EXCLUDED.document_id,
          account_payment_id = EXCLUDED.account_payment_id,
          payment_date = EXCLUDED.payment_date,
          payment_method = EXCLUDED.payment_method,
          amount = EXCLUDED.amount,
          reference = EXCLUDED.reference,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          receipt.id,
          receipt.document_id,
          receipt.account_payment_id,
          receipt.payment_date,
          receipt.payment_method,
          receipt.amount,
          receipt.reference,
          receipt.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} receipts...`);
      }
      
    } catch (error) {
      console.error(`Error importing receipt ${record._ID || 'unknown'}:`, error.message);
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
    console.error('Please provide the path to the Receipts.csv file');
    process.exit(1);
  }
  
  importReceipts(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importReceipts };
