import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkDatabaseStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  
  try {
    // Check vehicle count
    const vehiclesResult = await client.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`Total vehicles in database: ${vehiclesResult.rows[0].count}`);
    
    // Check MOT history count
    const motHistoryResult = await client.query('SELECT COUNT(*) as count FROM mot_history');
    console.log(`Total MOT history records: ${motHistoryResult.rows[0].count}`);
    
    // Check when the last MOT check was performed
    const lastMotCheck = await client.query(
      `SELECT registration, mot_expiry_date, updated_at 
       FROM vehicles 
       WHERE updated_at IS NOT NULL 
       ORDER BY updated_at DESC 
       LIMIT 5`
    );
    
    console.log('\nMost recently updated vehicles:');
    for (const row of lastMotCheck.rows) {
      console.log(`${row.registration}: MOT expires ${row.mot_expiry_date || 'N/A'} (last updated: ${row.updated_at})`);
    }
    
  } catch (error) {
    console.error('Error checking database status:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabaseStatus().catch(console.error);
