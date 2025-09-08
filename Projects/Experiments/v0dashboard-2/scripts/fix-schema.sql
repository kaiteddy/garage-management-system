-- Drop existing tables if they exist
DROP TABLE IF EXISTS line_items CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Recreate tables with correct ID types
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  registration TEXT UNIQUE,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  fuel_type TEXT,
  engine_size TEXT,
  mot_status TEXT,
  mot_expiry DATE,
  tax_status TEXT,
  tax_due_date DATE,
  mot_test_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id TEXT,
  document_type TEXT,
  document_number TEXT,
  issue_date DATE,
  due_date DATE,
  status TEXT,
  total_amount DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2),
  net_amount DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE line_items (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  stock_id TEXT,
  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(12, 2),
  tax_rate DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  item_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_registration ON vehicles(registration);
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX idx_line_items_document_id ON line_items(document_id);

-- Reset sequences if needed
-- Note: Not needed for TEXT primary keys, but kept for reference
-- SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id)::INT, 1) FROM customers));
