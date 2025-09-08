import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Updating database schema to match CSV files...');
    
    // 1. First, drop constraints that reference the tables we're modifying
    console.log('Dropping foreign key constraints...');
    await client.query(`
      ALTER TABLE IF EXISTS vehicles 
      DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE IF EXISTS documents 
      DROP CONSTRAINT IF EXISTS documents_customer_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE IF EXISTS documents 
      DROP CONSTRAINT IF EXISTS documents_vehicle_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE IF EXISTS appointments 
      DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
    `);
    
    await client.query(`
      ALTER TABLE IF EXISTS appointments 
      DROP CONSTRAINT IF EXISTS appointments_vehicle_id_fkey;
    `);
    
    // 2. Create a new customers table with the correct schema
    console.log('Updating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers_new (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        postcode TEXT,
        country TEXT,
        date_of_birth DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx ON customers_new (LOWER(email));
    `);
    
    // 3. Migrate data to the new customers table if it exists
    try {
      await client.query(`
        INSERT INTO customers_new (
          id, first_name, last_name, email, phone, 
          address_line1, city, postcode, country, 
          created_at, updated_at, deleted_at
        )
        SELECT 
          id, first_name, last_name, email, phone, 
          address, city, postal_code, country, 
          created_at, updated_at, deleted_at
        FROM customers;
      `);
      console.log('✅ Migrated existing customer data');
    } catch (error) {
      console.log('ℹ️ No existing customer data to migrate');
    }
    
    // 4. Drop the old customers table and rename the new one
    await client.query(`DROP TABLE IF EXISTS customers CASCADE;`);
    await client.query(`ALTER TABLE customers_new RENAME TO customers;`);
    
    // 5. Update vehicles table
    console.log('Updating vehicles table...');
    await client.query(`
      ALTER TABLE vehicles 
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE TEXT USING id::TEXT,
      ALTER COLUMN owner_id TYPE TEXT;
      
      DROP SEQUENCE IF EXISTS vehicles_id_seq CASCADE;
    `);
    
    // 6. Recreate constraints
    console.log('Recreating foreign key constraints...');
    await client.query(`
      ALTER TABLE vehicles 
      ADD CONSTRAINT vehicles_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES customers(id);
      
      ALTER TABLE documents 
      ADD CONSTRAINT documents_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES customers(id);
      
      ALTER TABLE documents 
      ADD CONSTRAINT documents_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
      
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES customers(id);
      
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_vehicle_id_fkey 
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(registration);
    `);
    
    // 7. Add any missing columns to other tables that reference customers/vehicles
    console.log('Updating related tables...');
    await client.query(`
      -- Ensure documents table can handle the new ID types
      ALTER TABLE documents 
      ALTER COLUMN customer_id TYPE TEXT,
      ALTER COLUMN vehicle_id TYPE TEXT;
      
      -- Ensure appointments table can handle the new ID types
      ALTER TABLE appointments 
      ALTER COLUMN customer_id TYPE TEXT,
      ALTER COLUMN vehicle_id TYPE TEXT;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database schema updated successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the schema update
updateSchema()
  .then(() => console.log('\n✨ Schema update completed!'))
  .catch(console.error)
  .finally(() => process.exit(0));
