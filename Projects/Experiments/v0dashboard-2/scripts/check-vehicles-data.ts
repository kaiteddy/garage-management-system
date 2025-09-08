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

async function checkVehiclesData() {
  const client = await pool.connect();
  
  try {
    // Get table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Vehicles table columns:');
    console.table(columns.rows);
    
    // Get vehicle data with types
    const vehicles = await client.query('SELECT id, registration, owner_id, mot_expiry_date FROM vehicles');
    
    console.log('\n🚗 Vehicle data with types:');
    for (const vehicle of vehicles.rows) {
      console.log('---');
      console.log(`Registration: ${vehicle.registration}`);
      console.log(`ID: ${vehicle.id} (type: ${typeof vehicle.id})`);
      console.log(`Owner ID: ${vehicle.owner_id} (type: ${vehicle.owner_id ? typeof vehicle.owner_id : 'null'})`);
      console.log(`MOT Expiry: ${vehicle.mot_expiry_date} (type: ${vehicle.mot_expiry_date ? 'Date' : 'null'})`);
    }
    
  } catch (error) {
    console.error('Error checking vehicles data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkVehiclesData().catch(console.error);
