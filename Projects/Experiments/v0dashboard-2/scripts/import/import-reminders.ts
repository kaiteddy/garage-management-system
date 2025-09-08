import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createPool } from '../utils/db-utils';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Define the Reminder type
interface Reminder {
  _ID: string;
  _ID_Template?: string;
  _ID_Vehicle?: string;
  due_date?: string;
  status?: string;
  sent_date?: string;
  notes?: string;
}

async function importReminders(filePath: string) {
  console.log(`Starting reminder import from ${filePath}...`);
  
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
    let batch: Reminder[] = [];
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
    
    console.log('\nReminder import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during reminder import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Reminder[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping reminder - missing ID');
        skipped++;
        continue;
      }
      
      // Parse dates
      const dueDate = record.due_date ? new Date(record.due_date) : null;
      const sentDate = record.sent_date ? new Date(record.sent_date) : null;
      
      // Prepare reminder data
      const reminder = {
        id: record._ID,
        template_id: record._ID_Template || null,
        vehicle_id: record._ID_Vehicle || null,
        due_date: dueDate,
        status: (record.status || 'pending').substring(0, 20) || 'pending',
        sent_date: sentDate,
        notes: (record.notes || '').substring(0, 1000) || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO reminders (
          id, template_id, vehicle_id, due_date, status, sent_date, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (id) DO UPDATE SET
          template_id = EXCLUDED.template_id,
          vehicle_id = EXCLUDED.vehicle_id,
          due_date = EXCLUDED.due_date,
          status = EXCLUDED.status,
          sent_date = EXCLUDED.sent_date,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          reminder.id,
          reminder.template_id,
          reminder.vehicle_id,
          reminder.due_date,
          reminder.status,
          reminder.sent_date,
          reminder.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} reminders...`);
      }
      
    } catch (error) {
      console.error(`Error importing reminder ${record._ID || 'unknown'}:`, error.message);
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
    console.error('Please provide the path to the Reminders.csv file');
    process.exit(1);
  }
  
  importReminders(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importReminders };
