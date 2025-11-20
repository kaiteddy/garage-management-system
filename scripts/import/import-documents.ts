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

// Define the Document type with actual CSV headers
interface Document {
  _ID: string;
  _ID_Customer?: string;
  _ID_Vehicle?: string;
  _ID_Appointment?: string;
  docType?: string;
  docNumber?: string;
  docIssueDate?: string;
  docDueDate?: string;
  docStatus?: string;
  docSubTotal?: string;
  docTax?: string;
  docTotal?: string;
  docPaid?: string;
  docBalance?: string;
  docNotes?: string;
  // fallback legacy fields
  document_type?: string;
  document_number?: string;
  issue_date?: string;
  due_date?: string;
  status?: string;
  subtotal?: string;
  tax_amount?: string;
  total_amount?: string;
  paid_amount?: string;
  balance_due?: string;
  notes?: string;
}

async function importDocuments(filePath: string) {
  console.log(`Starting document import from ${filePath}...`);
  
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
    
    console.log('\nDocument import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during document import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Document[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping document - missing ID');
        skipped++;
        continue;
      }
      
      // Parse dates and numbers from correct CSV headers, fallback to legacy fields
      const issueDate = record.docIssueDate ? new Date(record.docIssueDate) : (record.issue_date ? new Date(record.issue_date) : null);
      const dueDate = record.docDueDate ? new Date(record.docDueDate) : (record.due_date ? new Date(record.due_date) : null);
      const subtotal = record.docSubTotal ? parseFloat(record.docSubTotal) : (record.subtotal ? parseFloat(record.subtotal) : 0);
      const taxAmount = record.docTax ? parseFloat(record.docTax) : (record.tax_amount ? parseFloat(record.tax_amount) : 0);
      const totalAmount = record.docTotal ? parseFloat(record.docTotal) : (record.total_amount ? parseFloat(record.total_amount) : 0);
      const paidAmount = record.docPaid ? parseFloat(record.docPaid) : (record.paid_amount ? parseFloat(record.paid_amount) : 0);
      const balanceDue = record.docBalance ? parseFloat(record.docBalance) : (record.balance_due ? parseFloat(record.balance_due) : 0);
      
      // Check if customer and vehicle exist
      let customer_id = record._ID_Customer || null;
      let vehicle_id = record._ID_Vehicle || null;
      let appointment_id = record._ID_Appointment || null;
      if (customer_id) {
        const res = await client.query('SELECT 1 FROM customers WHERE id = $1', [customer_id]);
        if (res.rowCount === 0) customer_id = null;
      }
      if (vehicle_id) {
        const res = await client.query('SELECT 1 FROM vehicles WHERE id = $1', [vehicle_id]);
        if (res.rowCount === 0) vehicle_id = null;
      }
      if (appointment_id) {
        const res = await client.query('SELECT 1 FROM appointments WHERE id = $1', [appointment_id]);
        if (res.rowCount === 0) appointment_id = null;
      }
      // Prepare document data using correct CSV headers, fallback to legacy fields
      const document = {
        id: record._ID,
        customer_id,
        vehicle_id,
        appointment_id,
        document_type: (record.docType || record.document_type || '').substring(0, 30) || 'invoice',
        document_number: (record.docNumber || record.document_number || '').substring(0, 50) || null,
        issue_date: issueDate,
        due_date: dueDate,
        status: (record.docStatus || record.status || 'draft').substring(0, 20) || 'draft',
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        notes: (record.docNotes || record.notes || '').substring(0, 1000) || null
      };
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO documents (
          id, customer_id, vehicle_id, appointment_id, document_type,
          document_number, issue_date, due_date, status, subtotal,
          tax_amount, total_amount, paid_amount, balance_due, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          vehicle_id = EXCLUDED.vehicle_id,
          appointment_id = EXCLUDED.appointment_id,
          document_type = EXCLUDED.document_type,
          document_number = EXCLUDED.document_number,
          issue_date = EXCLUDED.issue_date,
          due_date = EXCLUDED.due_date,
          status = EXCLUDED.status,
          subtotal = EXCLUDED.subtotal,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          paid_amount = EXCLUDED.paid_amount,
          balance_due = EXCLUDED.balance_due,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          document.id,
          document.customer_id,
          document.vehicle_id,
          document.appointment_id,
          document.document_type,
          document.document_number,
          document.issue_date,
          document.due_date,
          document.status,
          document.subtotal,
          document.tax_amount,
          document.total_amount,
          document.paid_amount,
          document.balance_due,
          document.notes
        ]
      );
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} documents...`);
      }
      
    } catch (error: any) {
      console.error(`Error importing document ${record._ID || 'unknown'}:`, error.message);
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
    console.error('Please provide the path to the Documents.csv file');
    process.exit(1);
  }
  
  importDocuments(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importDocuments };
