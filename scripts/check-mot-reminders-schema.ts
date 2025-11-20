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

async function checkMotRemindersSchema() {
  const client = await pool.connect();
  
  try {
    // Check if table exists
    const tableExists = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mot_reminders')"
    );
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ mot_reminders table does not exist');
      return;
    }
    
    console.log('✅ mot_reminders table exists');
    
    // Get table columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'mot_reminders'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table columns:');
    console.table(columns.rows);
    
    // Check constraints
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'mot_reminders'::regclass
    `);
    
    if (constraints.rows.length > 0) {
      console.log('\n🔒 Table constraints:');
      constraints.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.conname}: ${row.pg_get_constraintdef}`);
      });
    } else {
      console.log('\nℹ️  No constraints found on mot_reminders table');
    }
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'mot_reminders'
    `);
    
    if (indexes.rows.length > 0) {
      console.log('\n🔍 Table indexes:');
      indexes.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.indexname}: ${row.indexdef}`);
      });
    } else {
      console.log('\nℹ️  No indexes found on mot_reminders table');
    }
    
  } catch (error) {
    console.error('Error checking mot_reminders schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkMotRemindersSchema().catch(console.error);
