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

async function checkVehicles() {
  const client = await pool.connect();
  try {
    // Check vehicles with customer information
    const result = await client.query(`
      SELECT v.id, v.registration, v.make, v.model, v.year, 
             v.color, v.fuel_type, v.engine_size, 
             v.customer_id, c.name as customer_name, c.email as customer_email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      ORDER BY v.registration
    `);
    
    console.log('Vehicles in database:');
    console.table(result.rows);
    
    // Count vehicles
    const countResult = await client.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`\nTotal vehicles: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking vehicles:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkVehicles().catch(console.error);
