import { Pool } from 'pg';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

// Load environment variables
const env = dotenv.config({ path: '.env.local' });
dotenvExpand.expand(env);

// Create a direct connection to Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateVehiclesSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Updating vehicles table schema to use UUID for ID...');
    
    // Create a new temporary table with UUID ID
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles_new (
        id UUID PRIMARY KEY,
        registration VARCHAR(20) NOT NULL UNIQUE,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        color VARCHAR(50),
        fuel_type VARCHAR(50),
        engine_size VARCHAR(50),
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        mot_expiry_date DATE,
        mot_status VARCHAR(50),
        mot_last_checked TIMESTAMP,
        mot_test_number VARCHAR(50),
        mot_mileage INTEGER,
        mot_test_result VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Copy data from old table to new table (if any exists)
    await client.query(`
      INSERT INTO vehicles_new (
        registration, make, model, year, color, fuel_type, engine_size,
        customer_id, mot_expiry_date, mot_status, mot_last_checked,
        mot_test_number, mot_mileage, mot_test_result, created_at, updated_at
      )
      SELECT 
        registration, make, model, year, color, fuel_type, engine_size,
        customer_id, mot_expiry_date, mot_status, mot_last_checked,
        mot_test_number, mot_mileage, mot_test_result, created_at, updated_at
      FROM vehicles;
    `);
    
    // Drop the old table
    await client.query('DROP TABLE IF EXISTS vehicles CASCADE');
    
    // Rename the new table
    await client.query('ALTER TABLE vehicles_new RENAME TO vehicles');
    
    // Recreate indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date)');
    
    await client.query('COMMIT');
    console.log('✅ Vehicles table schema updated successfully to use UUID for ID!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating vehicles schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateVehiclesSchema()
  .then(() => console.log('✅ Schema update completed!'))
  .catch(error => console.error('❌ Error updating schema:', error));
