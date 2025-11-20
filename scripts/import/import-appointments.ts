import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createPool } from '../utils/db-utils';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Define the Appointment type
interface Appointment {
  _ID: string;
  _ID_Customer?: string;
  _ID_Vehicle?: string;
  _ID_Document?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  service_type?: string;
  notes?: string;
}

async function importAppointments(filePath: string) {
  console.log(`Starting appointment import from ${filePath}...`);
  
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
        escape: '\\',
        relax_column_count: true
      }));
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let batch: Appointment[] = [];
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
    
    console.log('\nAppointment import complete!');
    console.log(`Successfully imported/updated: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Error during appointment import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function processBatch(client: any, batch: Appointment[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const record of batch) {
    try {
      // Skip if required fields are missing
      if (!record._ID) {
        console.log('Skipping appointment - missing ID');
        skipped++;
        continue;
      }
      
      // Parse dates
      const startTime = record.start_time ? new Date(record.start_time) : null;
      const endTime = record.end_time ? new Date(record.end_time) : null;
      
      // Prepare appointment data
      const appointment = {
        id: record._ID,
        customer_id: record._ID_Customer || null,
        vehicle_id: record._ID_Vehicle || null,
        document_id: record._ID_Document || null,
        start_time: startTime,
        end_time: endTime,
        status: (record.status || 'scheduled').substring(0, 20) || 'scheduled',
        service_type: (record.service_type || '').substring(0, 50) || null,
        notes: (record.notes || '').substring(0, 1000) || null
      };
      
      // Use a single query with ON CONFLICT for upsert
      await client.query(
        `INSERT INTO appointments (
          id, customer_id, vehicle_id, document_id, start_time,
          end_time, status, service_type, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          vehicle_id = EXCLUDED.vehicle_id,
          document_id = EXCLUDED.document_id,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          status = EXCLUDED.status,
          service_type = EXCLUDED.service_type,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          appointment.id,
          appointment.customer_id,
          appointment.vehicle_id,
          appointment.document_id,
          appointment.start_time,
          appointment.end_time,
          appointment.status,
          appointment.service_type,
          appointment.notes
        ]
      );
      
      imported++;
      
      // Log progress
      if (imported % 100 === 0) {
        console.log(`Processed ${imported} appointments...`);
      }
      
    } catch (error) {
      console.error(`Error importing appointment ${record._ID || 'unknown'}:`, error.message);
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
    console.error('Please provide the path to the Appointments.csv file');
    process.exit(1);
  }
  
  importAppointments(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importAppointments };
