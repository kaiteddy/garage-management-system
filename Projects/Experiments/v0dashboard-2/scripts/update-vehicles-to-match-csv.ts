import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function updateVehiclesSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Updating vehicles table to match CSV structure...');
    
    // 1. First, drop any foreign key constraints that reference the vehicles table
    console.log('Dropping foreign key constraints...');
    await client.query(`
      -- Drop foreign key from documents table
      ALTER TABLE IF EXISTS documents 
      DROP CONSTRAINT IF EXISTS documents_vehicle_id_fkey;
      
      -- Drop foreign key from appointments table
      ALTER TABLE IF EXISTS appointments 
      DROP CONSTRAINT IF EXISTS appointments_vehicle_id_fkey;
      
      -- Drop foreign key from mot_checks table if it exists
      ALTER TABLE IF EXISTS mot_checks 
      DROP CONSTRAINT IF EXISTS mot_checks_vehicle_id_fkey;
      
      -- Drop foreign key from mot_reminders table if it exists
      ALTER TABLE IF EXISTS mot_reminders 
      DROP CONSTRAINT IF EXISTS mot_reminders_vehicle_id_fkey;
    `);
    
    // 2. Create a new vehicles table with the correct schema
    console.log('Creating new vehicles table...');
    await client.query(`
      -- Create a new table with the correct schema
      CREATE TABLE IF NOT EXISTS vehicles_new (
        registration VARCHAR(20) PRIMARY KEY,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        color VARCHAR(50),
        fuel_type VARCHAR(50),
        engine_size NUMERIC,
        vin VARCHAR(50),
        mot_status VARCHAR(50),
        mot_expiry_date DATE,
        tax_status VARCHAR(50),
        tax_due_date DATE,
        owner_id VARCHAR(255) REFERENCES customers(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 3. Copy data from the old table to the new one
    console.log('Migrating data to new table...');
    await client.query(`
      INSERT INTO vehicles_new (
        registration, make, model, year, color, fuel_type, 
        engine_size, vin, mot_status, mot_expiry_date, 
        tax_status, tax_due_date, owner_id, created_at, updated_at
      )
      SELECT 
        registration, make, model, year, color, fuel_type, 
        engine_size, vin, mot_status, mot_expiry_date, 
        tax_status, tax_due_date, owner_id, created_at, updated_at
      FROM vehicles;
    `);
    
    // 4. Drop the old table and rename the new one
    console.log('Replacing old table...');
    await client.query(`
      DROP TABLE IF EXISTS vehicles CASCADE;
      ALTER TABLE vehicles_new RENAME TO vehicles;
    `);
    
    // 5. Recreate indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date);
      CREATE INDEX IF NOT EXISTS idx_vehicles_tax_due_date ON vehicles(tax_due_date);
    `);
    
    // 6. Recreate foreign key constraints
    console.log('Recreating foreign key constraints...');
    await client.query(`
      -- Documents table
      ALTER TABLE documents 
      ADD CONSTRAINT documents_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
      
      -- Appointments table
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
      
      -- MOT Checks table
      ALTER TABLE mot_checks 
      ADD CONSTRAINT mot_checks_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
      
      -- MOT Reminders table
      ALTER TABLE mot_reminders 
      ADD CONSTRAINT mot_reminders_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Vehicles table updated successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating vehicles table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the schema update
updateVehiclesSchema()
  .then(() => console.log('\n✨ Schema update completed!'))
  .catch(console.error)
  .finally(() => process.exit(0));
