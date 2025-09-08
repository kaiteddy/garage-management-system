export const createSchemaSQL = `
-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50),
  title VARCHAR(10),
  forename VARCHAR(100),
  surname VARCHAR(100),
  company_name VARCHAR(200),
  house_no VARCHAR(20),
  road VARCHAR(200),
  locality VARCHAR(100),
  town VARCHAR(100),
  county VARCHAR(100),
  post_code VARCHAR(20),
  telephone VARCHAR(20),
  mobile VARCHAR(20),
  email VARCHAR(255),
  last_invoice_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  registration VARCHAR(20) NOT NULL UNIQUE,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  colour VARCHAR(50),
  fuel_type VARCHAR(50),
  vin VARCHAR(50),
  engine_code VARCHAR(50),
  date_of_reg DATE,
  mot_expiry_date DATE,
  mot_status VARCHAR(50),
  mot_last_checked TIMESTAMP,
  last_invoice_date DATE,
  reminder_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mot_history table
CREATE TABLE IF NOT EXISTS mot_history (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  registration VARCHAR(20) NOT NULL,
  test_date DATE,
  test_result VARCHAR(50),
  expiry_date DATE,
  odometer_value INTEGER,
  odometer_unit VARCHAR(10),
  mot_test_number VARCHAR(50),
  defects JSONB,
  advisories JSONB,
  test_class VARCHAR(10),
  test_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  description TEXT,
  resource VARCHAR(100),
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50),
  reminder_date DATE,
  sent_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  document_type VARCHAR(50),
  document_number VARCHAR(100),
  document_date DATE,
  due_date DATE,
  total_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document_items table
CREATE TABLE IF NOT EXISTS document_items (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
  id SERIAL PRIMARY KEY,
  part_number VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  supplier VARCHAR(200),
  cost_price DECIMAL(10,2),
  sell_price DECIMAL(10,2),
  stock_level INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_postcode ON customers(post_code);
CREATE INDEX IF NOT EXISTS idx_mot_history_registration ON mot_history(registration);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_date);
`
