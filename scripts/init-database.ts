import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

// SQL to drop existing tables (in correct order to respect foreign key constraints)
const DROP_TABLES_SQL = `
  DROP TABLE IF EXISTS reminders CASCADE;
  DROP TABLE IF EXISTS reminder_templates CASCADE;
  DROP TABLE IF EXISTS document_extras CASCADE;
  DROP TABLE IF EXISTS receipts CASCADE;
  DROP TABLE IF EXISTS line_items CASCADE;
  DROP TABLE IF EXISTS stock CASCADE;
  DROP TABLE IF EXISTS documents CASCADE;
  DROP TABLE IF EXISTS appointments CASCADE;
  DROP TABLE IF EXISTS vehicles CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
`;

// SQL to create tables (in correct order to respect foreign key constraints)
const CREATE_TABLES_SQL = `
  -- Customers table
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    title TEXT,
    company_name TEXT,
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
  );

  -- Vehicles table
  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    registration TEXT,
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
  );

  -- Reminder Templates table
  CREATE TABLE IF NOT EXISTS reminder_templates (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Documents table
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    appointment_id TEXT,
    document_type TEXT NOT NULL,
    document_number TEXT,
    issue_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT,
    subtotal NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    paid_amount NUMERIC(12, 2),
    balance_due NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Appointments table
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    service_type TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
  );

  -- Add the document -> appointment relationship
  ALTER TABLE documents 
  ADD CONSTRAINT fk_appointment 
  FOREIGN KEY (appointment_id) 
  REFERENCES appointments(id) 
  ON DELETE SET NULL;

  -- Stock table
  CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    part_number TEXT,
    description TEXT,
    quantity_in_stock NUMERIC(12, 2),
    unit_price NUMERIC(12, 2),
    tax_rate NUMERIC(5, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Line Items table
  CREATE TABLE IF NOT EXISTS line_items (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    stock_id TEXT REFERENCES stock(id) ON DELETE SET NULL,
    line_type TEXT NOT NULL, -- 'part', 'labour', 'misc', etc.
    description TEXT NOT NULL,
    quantity NUMERIC(12, 2) DEFAULT 1,
    unit_price NUMERIC(12, 2) DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Receipts table
  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    account_payment_id TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    amount NUMERIC(12, 2),
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Document Extras table
  CREATE TABLE IF NOT EXISTS document_extras (
    id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    labour_description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Reminders table
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES reminder_templates(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
    due_date DATE,
    status TEXT,
    sent_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

// Create indexes for better query performance
const CREATE_INDEXES_SQL = `
  -- Customers indexes
  CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
  CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);
  
  -- Vehicles indexes
  CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
  CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
  CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
  CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
  
  -- Documents indexes
  CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
  CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id);
  CREATE INDEX IF NOT EXISTS idx_documents_appointment ON documents(appointment_id);
  CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(document_type, status);
  CREATE INDEX IF NOT EXISTS idx_documents_issue_date ON documents(issue_date);
  
  -- Appointments indexes
  CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments(vehicle_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_document ON appointments(document_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
  
  -- Line Items indexes
  CREATE INDEX IF NOT EXISTS idx_line_items_document ON line_items(document_id);
  CREATE INDEX IF NOT EXISTS idx_line_items_stock ON line_items(stock_id);
  
  -- Receipts indexes
  CREATE INDEX IF NOT EXISTS idx_receipts_document ON receipts(document_id);
  CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON receipts(payment_date);
  
  -- Reminders indexes
  CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_template ON reminders(template_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
`;

async function initializeDatabase() {
  // Parse the database URL
  const dbUrl = new URL(process.env.DATABASE_URL || '');
  
  // Configure SSL based on environment
  const ssl = process.env.NODE_ENV === 'production' 
    ? { 
        rejectUnauthorized: true,
        ca: process.env.DB_CA_CERT,
        cert: process.env.DB_CLIENT_CERT,
        key: process.env.DB_CLIENT_KEY
      }
    : {
        rejectUnauthorized: false // For development only
      };

  // Create a new pool with the connection settings
  const pool = new Pool({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port, 10) || 5432,
    database: dbUrl.pathname.split('/')[1],
    ssl: ssl,
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    max: 20 // Maximum number of clients in the pool
  });

  const client = await pool.connect();
  
  try {
    console.log('Dropping existing tables...');
    await client.query(DROP_TABLES_SQL);
    
    console.log('Creating tables...');
    await client.query(CREATE_TABLES_SQL);
    
    console.log('Creating indexes...');
    await client.query(CREATE_INDEXES_SQL);
    
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('init-database.ts')) {
  initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
}

export { initializeDatabase };
