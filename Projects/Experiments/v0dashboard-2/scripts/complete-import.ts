#!/usr/bin/env ts-node

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const GDRIVE_PATH = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports";

interface ImportStats {
  processed: number;
  newRecords: number;
  updatedRecords: number;
  errors: number;
  skipped: number;
}

async function parseCSV(filePath: string): Promise<any[]> {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️ File not found: ${filePath}`);
    return [];
  }

  const csvContent = fs.readFileSync(filePath, 'utf8');
  const cleanedContent = csvContent
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/"""/g, '"')  // Fix triple quotes
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n');

  return parse(cleanedContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ',',
    quote: '"',
    escape: '\\',
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true
  }) as any[];
}

async function importAppointments(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };
  
  try {
    console.log('📅 [APPOINTMENTS] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/Appointments.csv`);
    console.log(`📊 Found ${records.length} appointment records`);

    for (const record of records) {
      try {
        if (!record._ID) {
          stats.skipped++;
          continue;
        }

        // Check if appointment exists
        const existing = await client.query('SELECT id FROM appointments WHERE id = $1', [record._ID]);

        if (existing.rows.length === 0) {
          // Find customer and vehicle IDs
          let customerId = null;
          let vehicleId = null;

          if (record._ID_Customer) {
            const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [record._ID_Customer]);
            if (customerCheck.rows.length > 0) customerId = record._ID_Customer;
          }

          if (record._ID_Vehicle) {
            const vehicleCheck = await client.query('SELECT registration FROM vehicles WHERE registration = $1', [record._ID_Vehicle]);
            if (vehicleCheck.rows.length > 0) vehicleId = record._ID_Vehicle;
          }

          await client.query(`
            INSERT INTO appointments (
              id, customer_id, vehicle_id, start_date, start_time, 
              description, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
            record._ID,
            customerId,
            vehicleId,
            record.start_date || null,
            record.start_time || null,
            record.description || record.notes || '',
            record.status || 'scheduled'
          ]);
          stats.newRecords++;
        }

        stats.processed++;
        if (stats.processed % 50 === 0) {
          console.log(`📝 Processed: ${stats.processed}/${records.length} (${stats.newRecords} new)`);
        }

      } catch (error: any) {
        console.error(`Error processing appointment ${record._ID}:`, error.message);
        stats.errors++;
        if (stats.errors > 20) break;
      }
    }

    console.log(`✅ Appointments: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Appointments import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function importLineItems(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };
  
  try {
    console.log('📊 [LINE-ITEMS] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/LineItems.csv`);
    console.log(`📊 Found ${records.length} line item records`);

    // Create line_items table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS line_items (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        description TEXT,
        quantity DECIMAL(10,2) DEFAULT 0,
        unit_price DECIMAL(10,2) DEFAULT 0,
        total_price DECIMAL(10,2) DEFAULT 0,
        item_type TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      try {
        if (!record._ID) {
          stats.skipped++;
          continue;
        }

        // Check if line item exists
        const existing = await client.query('SELECT id FROM line_items WHERE id = $1', [record._ID]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO line_items (
              id, document_id, description, quantity, unit_price, total_price, item_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            record._ID,
            record._ID_Document || record.document_id || null,
            record.description || record.item_description || '',
            parseFloat(record.quantity || '0') || 0,
            parseFloat(record.unit_price || record.price || '0') || 0,
            parseFloat(record.total_price || record.total || '0') || 0,
            record.item_type || record.type || 'service'
          ]);
          stats.newRecords++;
        }

        stats.processed++;
        if (stats.processed % 1000 === 0) {
          console.log(`📝 Processed: ${stats.processed}/${records.length} (${stats.newRecords} new)`);
        }

      } catch (error: any) {
        stats.errors++;
        if (stats.errors > 50) break;
      }
    }

    console.log(`✅ Line Items: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Line Items import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function importReceipts(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };
  
  try {
    console.log('💰 [RECEIPTS] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/Receipts.csv`);
    console.log(`📊 Found ${records.length} receipt records`);

    // Create receipts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        receipt_date DATE,
        amount DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      try {
        if (!record._ID) {
          stats.skipped++;
          continue;
        }

        // Check if receipt exists
        const existing = await client.query('SELECT id FROM receipts WHERE id = $1', [record._ID]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO receipts (
              id, document_id, receipt_date, amount, payment_method, description
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            record._ID,
            record._ID_Document || record.document_id || null,
            record.receipt_date || record.date || null,
            parseFloat(record.amount || record.total || '0') || 0,
            record.payment_method || record.method || 'cash',
            record.description || record.notes || ''
          ]);
          stats.newRecords++;
        }

        stats.processed++;
        if (stats.processed % 500 === 0) {
          console.log(`📝 Processed: ${stats.processed}/${records.length} (${stats.newRecords} new)`);
        }

      } catch (error: any) {
        stats.errors++;
        if (stats.errors > 50) break;
      }
    }

    console.log(`✅ Receipts: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Receipts import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function importReminders(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };

  try {
    console.log('🔔 [REMINDERS] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/Reminders.csv`);
    console.log(`📊 Found ${records.length} reminder records`);

    // Create reminders table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT,
        customer_id TEXT,
        reminder_type TEXT,
        reminder_date DATE,
        due_date DATE,
        status TEXT DEFAULT 'pending',
        email_sent BOOLEAN DEFAULT FALSE,
        sms_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      try {
        if (!record._ID) {
          stats.skipped++;
          continue;
        }

        const existing = await client.query('SELECT id FROM reminders WHERE id = $1', [record._ID]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO reminders (
              id, vehicle_id, customer_id, reminder_type, reminder_date, due_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            record._ID,
            record._ID_Vehicle || record.vehicle_id || null,
            record._ID_Customer || record.customer_id || null,
            record.reminder_type || record.type || 'MOT',
            record.reminder_date || record.date || null,
            record.due_date || null,
            record.status || 'pending'
          ]);
          stats.newRecords++;
        }

        stats.processed++;
        if (stats.processed % 200 === 0) {
          console.log(`📝 Processed: ${stats.processed}/${records.length} (${stats.newRecords} new)`);
        }

      } catch (error: any) {
        stats.errors++;
        if (stats.errors > 50) break;
      }
    }

    console.log(`✅ Reminders: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Reminders import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function importStock(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };

  try {
    console.log('📦 [STOCK] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/Stock.csv`);
    console.log(`📊 Found ${records.length} stock records`);

    // Create stock table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        part_number TEXT,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(10,2) DEFAULT 0,
        supplier TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      try {
        if (!record._ID && !record.part_number) {
          stats.skipped++;
          continue;
        }

        const id = record._ID || record.part_number || `stock_${Date.now()}_${Math.random()}`;
        const existing = await client.query('SELECT id FROM stock WHERE id = $1', [id]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO stock (
              id, part_number, description, quantity, unit_price, supplier, location
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            id,
            record.part_number || record.PartNumber || '',
            record.description || record.Description || '',
            parseInt(record.quantity || record.Quantity || '0') || 0,
            parseFloat(record.unit_price || record.Price || '0') || 0,
            record.supplier || record.Supplier || '',
            record.location || record.Location || ''
          ]);
          stats.newRecords++;
        }

        stats.processed++;

      } catch (error: any) {
        stats.errors++;
        if (stats.errors > 20) break;
      }
    }

    console.log(`✅ Stock: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Stock import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function importDocumentExtras(): Promise<ImportStats> {
  const client = await pool.connect();
  const stats: ImportStats = { processed: 0, newRecords: 0, updatedRecords: 0, errors: 0, skipped: 0 };

  try {
    console.log('📋 [DOCUMENT-EXTRAS] Starting import...');
    const records = await parseCSV(`${GDRIVE_PATH}/Document_Extras.csv`);
    console.log(`📊 Found ${records.length} document extra records`);

    // Create document_extras table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        extra_value TEXT,
        extra_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const record of records) {
      try {
        if (!record._ID) {
          stats.skipped++;
          continue;
        }

        const existing = await client.query('SELECT id FROM document_extras WHERE id = $1', [record._ID]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO document_extras (
              id, document_id, extra_type, extra_value, extra_data
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            record._ID,
            record._ID_Document || record.document_id || null,
            record.extra_type || record.type || 'misc',
            record.extra_value || record.value || '',
            JSON.stringify(record) // Store full record as JSON
          ]);
          stats.newRecords++;
        }

        stats.processed++;
        if (stats.processed % 500 === 0) {
          console.log(`📝 Processed: ${stats.processed}/${records.length} (${stats.newRecords} new)`);
        }

      } catch (error: any) {
        stats.errors++;
        if (stats.errors > 50) break;
      }
    }

    console.log(`✅ Document Extras: ${stats.newRecords} new, ${stats.errors} errors`);
    return stats;

  } catch (error: any) {
    console.error('❌ Document Extras import failed:', error.message);
    return stats;
  } finally {
    client.release();
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 COMPLETE DATA IMPORT - PROCESSING ALL REMAINING FILES');
  console.log('=========================================================\n');

  try {
    // Import all remaining files in parallel for speed
    console.log('⚡ Running imports in parallel for maximum speed...\n');

    const [
      appointmentStats,
      lineItemStats,
      receiptStats,
      reminderStats,
      stockStats,
      documentExtraStats
    ] = await Promise.all([
      importAppointments(),
      importLineItems(),
      importReceipts(),
      importReminders(),
      importStock(),
      importDocumentExtras()
    ]);

    // Calculate totals
    const allStats = [appointmentStats, lineItemStats, receiptStats, reminderStats, stockStats, documentExtraStats];
    const totalProcessed = allStats.reduce((sum, stat) => sum + stat.processed, 0);
    const totalNew = allStats.reduce((sum, stat) => sum + stat.newRecords, 0);
    const totalErrors = allStats.reduce((sum, stat) => sum + stat.errors, 0);

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n🎉 COMPLETE IMPORT FINISHED!');
    console.log('============================');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📊 Total processed: ${totalProcessed.toLocaleString()}`);
    console.log(`✨ Total new records: ${totalNew.toLocaleString()}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`🚀 Speed: ${Math.round(totalProcessed / duration).toLocaleString()} records/second`);
    console.log('\n💡 All data is now up to date and ready for API enhancement!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
main().catch(console.error);
