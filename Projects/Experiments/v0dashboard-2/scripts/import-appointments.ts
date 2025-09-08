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

async function createAppointmentsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(50) PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        vehicle_id VARCHAR(50),
        document_id VARCHAR(50) REFERENCES documents(id) ON DELETE SET NULL,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        description TEXT,
        status VARCHAR(50),
        type VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Created table: appointments');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating appointments table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function importAppointments() {
  const client = await pool.connect();
  try {
    const filePath = path.join(
      process.env.HOME || '',
      'Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Appointments.csv'
    );
    
    console.log(`Reading appointments from ${filePath}...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} appointments to import`);
    
    await client.query('BEGIN');
    
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        // Parse date and time
        const startDate = row.ApptDateStart ? new Date(row.ApptDateStart) : null;
        const endDate = row.ApptDateEnd ? new Date(row.ApptDateEnd) : startDate;
        
        values.push(
          row._ID,
          row._ID_Customer || null,
          row._ID_Vehicle || null,
          row._ID_Document || null,
          startDate,
          endDate,
          row.ApptDescEntry || '',
          'COMPLETED', // Default status
          row.ApptType || 'GENERAL',
          '' // Notes
        );
        
        placeholders.push(
          `(${Array.from({ length: 10 }, () => `$${paramIndex++}`).join(', ')}, NOW(), NOW())`
        );
      }
      
      const query = `
        INSERT INTO appointments (
          id, customer_id, vehicle_id, document_id, start_time,
          end_time, description, status, type, notes,
          created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          vehicle_id = EXCLUDED.vehicle_id,
          document_id = EXCLUDED.document_id,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          type = EXCLUDED.type,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id;
      `;
      
      const result = await client.query(query, values);
      importedCount += result.rowCount || 0;
      console.log(`Imported ${importedCount} of ${records.length} appointments...`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully imported ${importedCount} appointments`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing appointments:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('Starting appointments import process...');
    
    // Create appointments table
    await createAppointmentsTable();
    
    // Import appointments
    await importAppointments();
    
    console.log('Appointments import process completed successfully!');
  } catch (error) {
    console.error('Error in appointments import process:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
