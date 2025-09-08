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

async function createRemindersTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create reminders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(50) PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL,
        template_id VARCHAR(50),
        due_date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE,
        sent_via VARCHAR(50)
      );
    `);

    await client.query('COMMIT');
    console.log('Created table: reminders');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating reminders table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importReminders() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Reminders.csv'
    );
    
    console.log(`Reading reminders from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} reminders to import`);
    
    await client.query('BEGIN');
    
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        // Determine status based on actioned fields
        let status = 'PENDING';
        let sentAt = null;
        let sentVia = null;
        
        if (row.actioned_Email === 'TRUE') {
          status = 'SENT';
          sentVia = 'EMAIL';
          sentAt = row.actionedDate_Email ? new Date(row.actionedDate_Email) : null;
        } else if (row.actioned_SMS === 'TRUE') {
          status = 'SENT';
          sentVia = 'SMS';
          sentAt = row.actionedDate_SMS ? new Date(row.actionedDate_SMS) : null;
        } else if (row.actioned_Print === 'TRUE') {
          status = 'SENT';
          sentVia = 'PRINT';
          sentAt = row.actionedDate_Print ? new Date(row.actionedDate_Print) : null;
        }
        
        values.push(
          row._ID,
          row._ID_Vehicle,
          row._ID_Template || null,
          row.DueDate ? new Date(row.DueDate) : null,
          'MOT', // Default type
          status,
          '', // Notes
          sentAt,
          sentVia
        );
        
        placeholders.push(
          `(${Array.from({ length: 9 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO reminders (
          id, vehicle_id, template_id, due_date, type,
          status, notes, sent_at, sent_via,
          created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          vehicle_id = EXCLUDED.vehicle_id,
          template_id = EXCLUDED.template_id,
          due_date = EXCLUDED.due_date,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          sent_at = EXCLUDED.sent_at,
          sent_via = EXCLUDED.sent_via,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} reminders...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} reminders`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing reminders:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting reminders import process...');
    
    // Create reminders table
    await createRemindersTable();
    
    // Import reminders
    await importReminders();
    
    console.log('Reminders import process completed successfully!');
  } catch (error) {
    console.error('Error in reminders import process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
