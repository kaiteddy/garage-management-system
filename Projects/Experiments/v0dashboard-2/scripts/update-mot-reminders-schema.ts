import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function updateMotRemindersSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Updating mot_reminders table schema...');
    
    // Add a unique constraint on vehicle_id and reminder_date
    await client.query(`
      ALTER TABLE mot_reminders 
      ADD CONSTRAINT unique_vehicle_reminder_date 
      UNIQUE (vehicle_id, reminder_date);
    `);
    
    // Add a check constraint to ensure status is valid
    await client.query(`
      ALTER TABLE mot_reminders
      ADD CONSTRAINT valid_status 
      CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
    `);
    
    // Add an index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mot_reminders_status 
      ON mot_reminders(status);
    `);
    
    await client.query('COMMIT');
    console.log('✅ mot_reminders table schema updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating mot_reminders table schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateMotRemindersSchema().catch(console.error);
