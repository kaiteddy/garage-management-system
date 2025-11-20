import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS documents CASCADE');
    await client.query('DROP TABLE IF EXISTS vehicles CASCADE');
    await client.query('DROP TABLE IF EXISTS customers CASCADE');
    
    // Create customers table
    await client.query(`
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        company_name TEXT,
        first_name TEXT,
        last_name TEXT,
        title TEXT,
        email TEXT,
        mobile TEXT,
        phone TEXT,
        address_house_no TEXT,
        address_road TEXT,
        address_locality TEXT,
        address_town TEXT,
        address_county TEXT,
        address_postcode TEXT,
        account_number TEXT,
        account_status TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create vehicles table
    await client.query(`
      CREATE TABLE vehicles (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
        registration TEXT NOT NULL,
        make TEXT,
        model TEXT,
        year INTEGER,
        color TEXT,
        fuel_type TEXT,
        engine_size TEXT,
        engine_code TEXT,
        vin TEXT,
        mot_status TEXT,
        mot_expiry_date DATE,
        tax_status TEXT,
        tax_due_date DATE,
        registration_date DATE,
        body_style TEXT,
        doors INTEGER,
        transmission TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create documents table
    await client.query(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        document_type TEXT NOT NULL,
        document_number TEXT,
        issue_date DATE,
        expiry_date DATE,
        amount NUMERIC(10, 2),
        status TEXT,
        notes TEXT,
        file_path TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create appointments table
    await client.query(`
      CREATE TABLE appointments (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
        vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        appointment_date TIMESTAMP WITH TIME ZONE,
        status TEXT,
        service_type TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await client.query('CREATE INDEX idx_vehicles_registration ON vehicles(registration)');
    await client.query('CREATE INDEX idx_vehicles_vin ON vehicles(vin)');
    await client.query('CREATE INDEX idx_customers_email ON customers(email)');
    await client.query('CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id)');
    await client.query('CREATE INDEX idx_documents_customer_id ON documents(customer_id)');
    await client.query('CREATE INDEX idx_appointments_vehicle_id ON appointments(vehicle_id)');
    await client.query('CREATE INDEX idx_appointments_customer_id ON appointments(customer_id)');
    
    await client.query('COMMIT');
    console.log('Database schema created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
initializeDatabase().catch(console.error);
