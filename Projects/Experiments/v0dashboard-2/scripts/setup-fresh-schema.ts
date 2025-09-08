import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Read CSV files
function readCSV(filePath: string): any[] {
  const fullPath = path.join(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return parse(fileContent, { columns: true, skip_empty_lines: true });
}

async function setupFreshSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Setting up fresh database schema...');
    
    // Drop existing tables (be careful with this in production!)
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS mot_checks CASCADE;
      DROP TABLE IF EXISTS mot_reminders CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS import_logs CASCADE;
      DROP TABLE IF EXISTS import_issues CASCADE;
    `);
    
    // Create customers table without constraints first
    console.log('Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
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
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Create vehicles table without foreign key constraints first
    console.log('Creating vehicles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
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
        owner_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Import data from CSV files
    console.log('\n📥 Importing data from CSV files...');
    
    // Import customers
    const customers = readCSV('data/customers.csv');
    console.log(`Found ${customers.length} customers to import`);
    
    for (const customer of customers) {
      await client.query(
        `INSERT INTO customers (
          id, first_name, last_name, email, phone, 
          address_line1, address_line2, city, postcode, country, date_of_birth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address_line1 = EXCLUDED.address_line1,
          address_line2 = EXCLUDED.address_line2,
          city = EXCLUDED.city,
          postcode = EXCLUDED.postcode,
          country = EXCLUDED.country,
          date_of_birth = EXCLUDED.date_of_birth,
          updated_at = NOW()
        `,
        [
          customer.id,
          customer.first_name,
          customer.last_name,
          customer.email,
          customer.phone,
          customer.address_line1,
          customer.address_line2 || null,
          customer.city,
          customer.postcode,
          customer.country,
          customer.date_of_birth || null
        ]
      );
    }
    
    // Import vehicles
    const vehicles = readCSV('data/vehicles.csv');
    console.log(`Found ${vehicles.length} vehicles to import`);
    
    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO vehicles (
          registration, make, model, year, color, fuel_type,
          engine_size, vin, mot_status, mot_expiry_date,
          tax_status, tax_due_date, owner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (registration) DO UPDATE SET
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          color = EXCLUDED.color,
          fuel_type = EXCLUDED.fuel_type,
          engine_size = EXCLUDED.engine_size,
          vin = EXCLUDED.vin,
          mot_status = EXCLUDED.mot_status,
          mot_expiry_date = EXCLUDED.mot_expiry_date,
          tax_status = EXCLUDED.tax_status,
          tax_due_date = EXCLUDED.tax_due_date,
          owner_id = EXCLUDED.owner_id,
          updated_at = NOW()
        `,
        [
          vehicle.registration,
          vehicle.make,
          vehicle.model,
          vehicle.year ? parseInt(vehicle.year) : null,
          vehicle.color,
          vehicle.fuel_type,
          vehicle.engine_size ? parseFloat(vehicle.engine_size) : null,
          vehicle.vin,
          vehicle.mot_status,
          vehicle.mot_expiry_date || null,
          vehicle.tax_status,
          vehicle.tax_due_date || null,
          vehicle.owner_id || null
        ]
      );
    }
    
    // Now add indexes and constraints after data is loaded
    console.log('Adding indexes and constraints...');
    await client.query(`
      -- Add indexes
      CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx ON customers (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date);
      CREATE INDEX IF NOT EXISTS idx_vehicles_tax_due_date ON vehicles(tax_due_date);
    `);
    
    // Check if all vehicle owner_ids exist in customers
    const invalidOwners = await client.query(`
      SELECT DISTINCT v.owner_id 
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.owner_id IS NOT NULL
      AND c.id IS NULL;
    `);
    
    if (invalidOwners.rows.length > 0) {
      console.warn('⚠️  Found vehicles with owner_ids not in customers:');
      console.warn(invalidOwners.rows);
      console.warn('Skipping foreign key constraint for vehicles.owner_id');
    } else {
      console.log('Adding foreign key constraint for vehicles.owner_id...');
      await client.query(`
        ALTER TABLE vehicles 
        ADD CONSTRAINT vehicles_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES customers(id)
        ON DELETE SET NULL;
      `);
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Database setup completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupFreshSchema()
  .then(() => console.log('\n✨ All done!'))
  .catch(console.error)
  .finally(() => process.exit(0));
