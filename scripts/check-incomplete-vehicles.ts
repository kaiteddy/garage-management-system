import { Pool } from 'pg';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

// Load environment variables
const env = dotenv.config();
expand(env);

async function checkIncompleteVehicles() {
  // Use the unpooled connection string with sslmode=require
  if (!process.env.DATABASE_URL_UNPOOLED) {
    throw new Error('DATABASE_URL_UNPOOLED environment variable is not set');
  }
  
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  const pool = new Pool({
    connectionString: `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=require`,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Count vehicles with missing make or model
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM vehicles 
       WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')
       AND registration IS NOT NULL
       AND registration != ''`
    );

    const count = parseInt(result.rows[0].count, 10);
    console.log(`Found ${count} vehicles with missing make or model`);
    
    // Get a sample of these vehicles
    if (count > 0) {
      const sample = await client.query(
        `SELECT id, registration, make, model, year 
         FROM vehicles 
         WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')
         AND registration IS NOT NULL
         AND registration != ''
         LIMIT 5`
      );
      
      console.log('\nSample of vehicles with missing data:');
      console.table(sample.rows);
    }
    
    return count;
  } catch (error) {
    console.error('Error checking incomplete vehicles:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkIncompleteVehicles().catch(console.error);
