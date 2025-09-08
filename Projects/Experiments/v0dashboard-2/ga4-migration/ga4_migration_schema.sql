-- GA4 Garage Management System - Target Database Schema
-- Designed for PostgreSQL (can be adapted for other databases)

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE ENTITY TABLES
-- =====================================================

-- Customers table - Central customer information
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL, -- Original GA4 _ID
    account_number VARCHAR(20) UNIQUE,
    
    -- Name information
    title VARCHAR(10),
    forename VARCHAR(100),
    surname VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    
    -- Contact information
    email VARCHAR(255),
    telephone VARCHAR(50),
    mobile VARCHAR(50),
    no_email BOOLEAN DEFAULT FALSE,
    
    -- Address
    house_no VARCHAR(20),
    road VARCHAR(200),
    locality VARCHAR(100),
    town VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    
    -- Business information
    classification VARCHAR(50), -- Retail/Trade customer
    how_found_us VARCHAR(100),
    regular_customer BOOLEAN DEFAULT FALSE,
    
    -- Account settings
    account_held BOOLEAN DEFAULT FALSE,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    credit_terms INTEGER DEFAULT 30,
    
    -- Rates and discounts
    force_tax_free BOOLEAN DEFAULT FALSE,
    labour_rate DECIMAL(8,2),
    labour_discount_percent DECIMAL(5,2) DEFAULT 0,
    parts_discount_percent DECIMAL(5,2) DEFAULT 0,
    trade_parts BOOLEAN DEFAULT FALSE,
    
    -- System fields
    reminders_allowed BOOLEAN DEFAULT TRUE,
    last_invoice_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional contacts (normalized in separate table)
    notes TEXT
);

-- Additional customer contacts (normalized)
CREATE TABLE customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_name VARCHAR(200),
    contact_number VARCHAR(50),
    contact_type VARCHAR(20) DEFAULT 'additional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Registration information
    registration VARCHAR(20) NOT NULL,
    registration_id VARCHAR(50), -- Legacy field
    vin VARCHAR(50),
    
    -- Basic vehicle info
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    colour VARCHAR(50),
    date_of_registration DATE,
    date_of_manufacture DATE,
    vehicle_type VARCHAR(100),
    body_style VARCHAR(100),
    
    -- Engine information
    engine_cc INTEGER,
    engine_code VARCHAR(50),
    engine_no VARCHAR(100),
    fuel_type VARCHAR(50),
    cylinders INTEGER,
    valve_count INTEGER,
    
    -- Technical specifications
    power_bhp DECIMAL(8,2),
    power_kw DECIMAL(8,2),
    torque_nm DECIMAL(8,2),
    torque_lbft DECIMAL(8,2),
    co2_emissions INTEGER,
    euro_status VARCHAR(10),
    
    -- Physical dimensions
    length_mm INTEGER,
    width_mm INTEGER,
    height_mm INTEGER,
    kerb_weight_min INTEGER,
    kerb_weight_max INTEGER,
    
    -- Other details
    key_code VARCHAR(50),
    radio_code VARCHAR(50),
    paint_code VARCHAR(20),
    transmission VARCHAR(50),
    drive_type VARCHAR(20),
    
    -- System fields
    last_invoice_date DATE,
    notes TEXT,
    reminder_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BUSINESS PROCESS TABLES
-- =====================================================

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    
    -- Appointment details
    appointment_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration INTEGER, -- minutes
    appointment_type VARCHAR(100),
    resource VARCHAR(100), -- bay/technician
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document types enum
CREATE TYPE document_type AS ENUM ('estimate', 'jobsheet', 'invoice', 'credit_note');
CREATE TYPE document_status AS ENUM ('draft', 'issued', 'paid', 'cancelled', 'exported');

-- Documents table (estimates, jobsheets, invoices, credit notes)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    appointment_id UUID REFERENCES appointments(id),
    
    -- Document identification
    document_type document_type NOT NULL,
    document_number VARCHAR(50),
    order_reference VARCHAR(100),
    
    -- Dates
    created_date DATE NOT NULL,
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    expires_date DATE,
    
    -- Status tracking
    status document_status DEFAULT 'draft',
    printed BOOLEAN DEFAULT FALSE,
    emailed BOOLEAN DEFAULT FALSE,
    exported BOOLEAN DEFAULT FALSE,
    reconciled BOOLEAN DEFAULT FALSE,
    
    -- Financial totals
    subtotal_net DECIMAL(12,2) DEFAULT 0,
    subtotal_tax DECIMAL(12,2) DEFAULT 0,
    subtotal_gross DECIMAL(12,2) DEFAULT 0,
    
    labour_net DECIMAL(12,2) DEFAULT 0,
    labour_tax DECIMAL(12,2) DEFAULT 0,
    labour_gross DECIMAL(12,2) DEFAULT 0,
    
    parts_net DECIMAL(12,2) DEFAULT 0,
    parts_tax DECIMAL(12,2) DEFAULT 0,
    parts_gross DECIMAL(12,2) DEFAULT 0,
    
    total_net DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    total_gross DECIMAL(12,2) DEFAULT 0,
    
    -- Discounts
    global_discount_percent DECIMAL(5,2) DEFAULT 0,
    labour_discount_percent DECIMAL(5,2) DEFAULT 0,
    parts_discount_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Vehicle information snapshot
    vehicle_registration VARCHAR(20),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_mileage INTEGER,
    
    -- Staff assignments
    technician VARCHAR(100),
    sales_person VARCHAR(100),
    mot_tester VARCHAR(100),
    
    -- MOT information
    mot_class VARCHAR(10),
    mot_cost DECIMAL(8,2),
    mot_status VARCHAR(50),
    
    -- System fields
    terms_and_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Line items table (parts and labour on documents)
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    stock_id UUID REFERENCES stock_items(id),

    -- Item details
    item_type VARCHAR(50) NOT NULL, -- 'labour', 'part', 'misc'
    description TEXT NOT NULL,
    part_number VARCHAR(100),
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,

    -- Pricing
    unit_cost DECIMAL(10,4) DEFAULT 0,
    unit_price DECIMAL(10,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,

    -- Calculated totals
    line_net DECIMAL(12,2) NOT NULL,
    line_tax DECIMAL(12,2) NOT NULL,
    line_gross DECIMAL(12,2) NOT NULL,

    -- Tax information
    tax_code VARCHAR(10),
    tax_rate DECIMAL(5,2),
    tax_inclusive BOOLEAN DEFAULT FALSE,

    -- Additional information
    supplier VARCHAR(200),
    supplier_invoice VARCHAR(100),
    purchase_date DATE,
    guarantee_period INTEGER, -- months
    guarantee_notes TEXT,
    nominal_code VARCHAR(20),
    technician VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock/inventory table
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),

    -- Item identification
    part_number VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    description TEXT NOT NULL,
    manufacturer VARCHAR(200),
    category VARCHAR(100),
    subcategory VARCHAR(100),

    -- Pricing
    cost_net DECIMAL(10,4) DEFAULT 0,
    retail_price_net DECIMAL(10,4) DEFAULT 0,
    trade_price_net DECIMAL(10,4) DEFAULT 0,
    markup_retail DECIMAL(5,2) DEFAULT 0,
    markup_trade DECIMAL(5,2) DEFAULT 0,

    -- Tax
    cost_tax_code VARCHAR(10),
    sale_tax_code VARCHAR(10),

    -- Inventory
    quantity_in_stock DECIMAL(10,3) DEFAULT 0,
    quantity_available DECIMAL(10,3) DEFAULT 0,
    quantity_on_order DECIMAL(10,3) DEFAULT 0,
    quantity_reserved DECIMAL(10,3) DEFAULT 0,
    low_stock_level DECIMAL(10,3) DEFAULT 0,
    min_order_quantity DECIMAL(10,3) DEFAULT 1,

    -- Storage
    location VARCHAR(100),
    tracking_enabled BOOLEAN DEFAULT FALSE,

    -- Guarantee
    guarantee_period INTEGER, -- months
    guarantee_notes TEXT,

    -- Additional fields
    keywords TEXT,
    notes TEXT,
    nominal_code VARCHAR(20),

    -- Tyre-specific fields (if applicable)
    tyre_classification VARCHAR(50),
    tyre_fuel_economy VARCHAR(10),
    tyre_wet_grip VARCHAR(10),
    tyre_noise_level INTEGER,
    tyre_width INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE,

    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255),
    telephone VARCHAR(50),

    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    town VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'UK',

    -- Business details
    account_number VARCHAR(50),
    payment_terms INTEGER DEFAULT 30,
    trade_discount DECIMAL(5,2) DEFAULT 0,

    active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receipts/payments table
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id),

    -- Payment details
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- cash, card, cheque, bacs, etc.
    description TEXT,

    -- Surcharge information (for card payments)
    surcharge_applied BOOLEAN DEFAULT FALSE,
    surcharge_net DECIMAL(8,2) DEFAULT 0,
    surcharge_tax DECIMAL(8,2) DEFAULT 0,
    surcharge_gross DECIMAL(8,2) DEFAULT 0,

    -- Reconciliation
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_date DATE,
    reconciled_reference VARCHAR(100),

    -- Export tracking
    exported BOOLEAN DEFAULT FALSE,
    export_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    template_id UUID REFERENCES reminder_templates(id),

    -- Reminder details
    due_date DATE NOT NULL,
    reminder_type VARCHAR(100), -- MOT, Service, etc.

    -- Action tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_date DATE,
    print_actioned BOOLEAN DEFAULT FALSE,
    print_actioned_date DATE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_date DATE,

    -- Delivery methods enabled
    email_enabled BOOLEAN DEFAULT TRUE,
    print_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,

    -- Rescheduling
    rescheduled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reminder templates
CREATE TABLE reminder_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id VARCHAR(50) UNIQUE NOT NULL,

    template_type VARCHAR(100) NOT NULL,
    template_name VARCHAR(200),

    -- Template content
    email_subject VARCHAR(500),
    email_body TEXT,
    sms_content TEXT,
    print_template TEXT,

    -- Timing
    days_before_due INTEGER DEFAULT 30,

    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_customers_account_number ON customers(account_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_surname ON customers(surname);
CREATE INDEX idx_customers_postcode ON customers(postcode);

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_registration ON vehicles(registration);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);

CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_vehicle_id ON appointments(vehicle_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX idx_documents_type_status ON documents(document_type, status);
CREATE INDEX idx_documents_created_date ON documents(created_date);
CREATE INDEX idx_documents_number ON documents(document_number);

CREATE INDEX idx_line_items_document_id ON line_items(document_id);
CREATE INDEX idx_line_items_stock_id ON line_items(stock_id);
CREATE INDEX idx_line_items_part_number ON line_items(part_number);

CREATE INDEX idx_stock_items_part_number ON stock_items(part_number);
CREATE INDEX idx_stock_items_category ON stock_items(category);
CREATE INDEX idx_stock_items_supplier_id ON stock_items(supplier_id);

CREATE INDEX idx_receipts_document_id ON receipts(document_id);
CREATE INDEX idx_receipts_payment_date ON receipts(payment_date);

CREATE INDEX idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);

-- =====================================================
-- CONSTRAINTS AND TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON reminder_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
