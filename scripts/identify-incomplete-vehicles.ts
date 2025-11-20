import { Pool } from 'pg';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import fs from 'fs/promises';

// Load environment variables
const env = dotenv.config();
expand(env);

async function findIncompleteVehicles() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Find vehicles with missing make or model but have registration
    const result = await client.query(
      `SELECT id, registration 
       FROM vehicles 
       WHERE (make IS NULL OR model IS NULL OR make = '' OR model = '')
       AND registration IS NOT NULL
       AND registration != ''`
    );

    console.log(`Found ${result.rows.length} vehicles with missing make/model`);
    
    // Save to file for processing
    await fs.writeFile(
      './incomplete-vehicles.json',
      JSON.stringify(result.rows, null, 2)
    );
    
    console.log('Incomplete vehicles saved to incomplete-vehicles.json');
    
    return result.rows;
  } catch (error) {
    console.error('Error finding incomplete vehicles:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

findIncompleteVehicles().catch(console.error);
