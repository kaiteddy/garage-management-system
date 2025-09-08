-- Complete database schema for the MOT service application
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(50) UNIQUE,
    title VARCHAR(10),
    forename VARCHAR(100),
    surname VARCHAR(100),
    company_name VARCHAR(200),
    house_no VARCHAR(20),
    road VARCHAR(100),
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

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    registration VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    colour VARCHAR(50),
    fuel_type VARCHAR(50),
    vin VARCHAR(50),
    engine_code VARCHAR(50),
    date_of_reg DATE,
    mot_expiry_date DATE,
    mot_status VARCHAR(20) DEFAULT 'unknown',
    mot_last_checked TIMESTAMP,
    last_invoice_date DATE,
    reminder_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    description TEXT,
    resource VARCHAR(100),
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (invoices, quotes, etc.)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doc_date DATE,
    doc_number VARCHAR(50),
    doc_type VARCHAR(50),
    total_net DECIMAL(10,2) DEFAULT 0,
    total_vat DECIMAL(10,2) DEFAULT 0,
    total_gross DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    labour_description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Line items for documents
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    item_type VARCHAR(20), -- 'PART' or 'LABOUR'
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 1,
    price_net DECIMAL(10,2) DEFAULT 0,
    total_net DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Parts/Stock table with comprehensive automotive data
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    oem_part_number VARCHAR(100),
    description TEXT NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),

    -- Pricing information
    cost_net DECIMAL(10,2) DEFAULT 0,
    price_retail_net DECIMAL(10,2) DEFAULT 0,
    price_trade_net DECIMAL(10,2) DEFAULT 0,
    margin_percentage DECIMAL(5,2),

    -- Stock information
    quantity_in_stock INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 0,
    location VARCHAR(100),
    bin_location VARCHAR(50),

    -- Supplier information
    supplier_id UUID,
    supplier_name VARCHAR(200),
    supplier_part_number VARCHAR(100),
    manufacturer VARCHAR(200),
    brand VARCHAR(100),

    -- Vehicle compatibility
    vehicle_makes TEXT[], -- Array of compatible makes
    vehicle_models TEXT[], -- Array of compatible models
    year_from INTEGER,
    year_to INTEGER,
    engine_codes TEXT[], -- Array of compatible engine codes

    -- Part specifications
    weight_kg DECIMAL(8,3),
    dimensions_length_mm INTEGER,
    dimensions_width_mm INTEGER,
    dimensions_height_mm INTEGER,
    warranty_months INTEGER,

    -- PartSouq integration
    partsouq_id VARCHAR(100),
    partsouq_url TEXT,
    partsouq_last_updated TIMESTAMP,
    partsouq_price DECIMAL(10,2),
    partsouq_availability VARCHAR(50),

    -- Additional metadata
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_hazardous BOOLEAN DEFAULT false,
    requires_core_exchange BOOLEAN DEFAULT false,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Parts suppliers table
CREATE TABLE IF NOT EXISTS parts_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    address TEXT,
    payment_terms VARCHAR(100),
    delivery_days INTEGER,
    minimum_order_value DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parts pricing history table
CREATE TABLE IF NOT EXISTS parts_pricing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES parts_suppliers(id) ON DELETE SET NULL,
    price_type VARCHAR(20), -- 'cost', 'retail', 'trade'
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    change_reason VARCHAR(100),
    effective_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- Parts vehicle compatibility table (for detailed compatibility)
CREATE TABLE IF NOT EXISTS parts_vehicle_compatibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    variant VARCHAR(100),
    year_from INTEGER,
    year_to INTEGER,
    engine_code VARCHAR(50),
    engine_size VARCHAR(20),
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    body_style VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parts usage/sales history
CREATE TABLE IF NOT EXISTS parts_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    quantity_used INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    usage_date DATE,
    usage_type VARCHAR(50), -- 'sale', 'warranty', 'internal'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keep the old stock table for backward compatibility (create view)
CREATE OR REPLACE VIEW stock AS
SELECT
    id,
    part_number,
    description,
    category,
    cost_net,
    price_retail_net,
    quantity_in_stock,
    location,
    supplier_name as supplier,
    manufacturer,
    created_at,
    updated_at
FROM parts;

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50), -- 'MOT', 'Service', 'Insurance'
    due_date DATE NOT NULL,
    email_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    print_enabled BOOLEAN DEFAULT false,
    email_sent_date TIMESTAMP,
    sms_sent_date TIMESTAMP,
    print_sent_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    receipt_date DATE,
    amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MOT history cache table
CREATE TABLE IF NOT EXISTS mot_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    registration VARCHAR(20) NOT NULL,
    test_date DATE,
    test_result VARCHAR(20),
    expiry_date DATE,
    odometer_value INTEGER,
    odometer_unit VARCHAR(10),
    mot_test_number VARCHAR(50),
    defects JSONB,
    advisories JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_date);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_mot_history_registration ON mot_history(registration);
CREATE INDEX IF NOT EXISTS idx_mot_history_vehicle_id ON mot_history(vehicle_id);

-- Parts table indexes
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_oem_part_number ON parts(oem_part_number);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_supplier_id ON parts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON parts(manufacturer);
CREATE INDEX IF NOT EXISTS idx_parts_brand ON parts(brand);
CREATE INDEX IF NOT EXISTS idx_parts_is_active ON parts(is_active);
CREATE INDEX IF NOT EXISTS idx_parts_partsouq_id ON parts(partsouq_id);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_makes ON parts USING GIN(vehicle_makes);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_models ON parts USING GIN(vehicle_models);
CREATE INDEX IF NOT EXISTS idx_parts_engine_codes ON parts USING GIN(engine_codes);
CREATE INDEX IF NOT EXISTS idx_parts_tags ON parts USING GIN(tags);

-- Parts suppliers indexes
CREATE INDEX IF NOT EXISTS idx_parts_suppliers_name ON parts_suppliers(name);
CREATE INDEX IF NOT EXISTS idx_parts_suppliers_is_active ON parts_suppliers(is_active);

-- Parts pricing history indexes
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_part_id ON parts_pricing_history(part_id);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_effective_date ON parts_pricing_history(effective_date);

-- Parts vehicle compatibility indexes
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_compatibility_part_id ON parts_vehicle_compatibility(part_id);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_compatibility_make_model ON parts_vehicle_compatibility(make, model);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_compatibility_engine_code ON parts_vehicle_compatibility(engine_code);

-- Parts usage history indexes
CREATE INDEX IF NOT EXISTS idx_parts_usage_history_part_id ON parts_usage_history(part_id);
CREATE INDEX IF NOT EXISTS idx_parts_usage_history_vehicle_id ON parts_usage_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parts_usage_history_usage_date ON parts_usage_history(usage_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_suppliers_updated_at BEFORE UPDATE ON parts_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
