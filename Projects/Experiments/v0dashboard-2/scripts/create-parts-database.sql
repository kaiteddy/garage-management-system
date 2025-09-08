-- Enhanced Parts Database Migration
-- This script creates comprehensive parts management tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing stock table if it exists (we'll recreate as view)
DROP TABLE IF EXISTS stock CASCADE;

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

-- PartSouq API usage tracking
CREATE TABLE IF NOT EXISTS partsouq_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type VARCHAR(50), -- 'search', 'details', 'pricing'
    search_query TEXT,
    part_number VARCHAR(100),
    vehicle_registration VARCHAR(20),
    results_count INTEGER,
    api_cost DECIMAL(10,4),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create backward compatibility view for existing stock table references
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

-- Create indexes for better performance
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

-- PartSouq API usage indexes
CREATE INDEX IF NOT EXISTS idx_partsouq_api_usage_created_at ON partsouq_api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_partsouq_api_usage_part_number ON partsouq_api_usage(part_number);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_suppliers_updated_at BEFORE UPDATE ON parts_suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default categories
INSERT INTO parts (part_number, description, category, subcategory, is_active) VALUES
('DEFAULT-001', 'Default Part Entry', 'General', 'Miscellaneous', true)
ON CONFLICT (part_number) DO NOTHING;

-- Insert some default suppliers
INSERT INTO parts_suppliers (name, is_active) VALUES
('PartSouq', true),
('Euro Car Parts', true),
('GSF Car Parts', true),
('Motor Factor', true)
ON CONFLICT DO NOTHING;

COMMIT;
