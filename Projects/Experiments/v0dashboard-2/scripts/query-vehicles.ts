import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local if not in production
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(process.cwd(), '.env.local');
  const { existsSync } = await import('fs');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function queryVehicles() {
  try {
    // Get the first 3 records
    const result = await pool.query('SELECT * FROM vehicles LIMIT 3');
    console.log('First 3 vehicle records:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Get count of vehicles
    const countResult = await pool.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`\nTotal vehicles in database: ${countResult.rows[0].count}`);
    
    // Check for duplicate registrations
    const dupes = await pool.query(`
      SELECT registration, COUNT(*) as count 
      FROM vehicles 
      GROUP BY registration 
      HAVING COUNT(*) > 1
    `);
    
    if (dupes.rows.length > 0) {
      console.log('\n⚠️  Found duplicate registration numbers:');
      console.log(dupes.rows);
    } else {
      console.log('\n✅ No duplicate registration numbers found');
    }
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await pool.end();
  }
}

queryVehicles();
