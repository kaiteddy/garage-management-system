import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables from .env file
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkSpecificVehicles() {
  const client = await pool.connect();
  try {
    // Check the specific vehicles we imported
    const result = await client.query(`
      SELECT v.registration, v.make, v.model, v.year, v.color, 
             v.fuel_type, v.engine_size, v.customer_id,
             c.name as customer_name, c.email as customer_email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.registration IN ('AB12CDE', 'BC23FGH', 'DE45IJK')
      ORDER BY v.registration
    `);
    
    console.log('Imported vehicles:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error checking vehicles:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSpecificVehicles().catch(console.error);
