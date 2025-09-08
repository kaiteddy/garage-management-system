-- Parts Pricing History Database Schema
-- This script creates tables for tracking parts pricing history and analytics

-- 1. Parts Master Table (if not exists)
CREATE TABLE IF NOT EXISTS parts_master (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    manufacturer VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'each',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Parts Pricing History Table
CREATE TABLE IF NOT EXISTS parts_pricing_history (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    price_charged DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2), -- For future API integration
    markup_percentage DECIMAL(5,2), -- Calculated markup
    quantity_sold INTEGER DEFAULT 1,
    date_sold TIMESTAMP NOT NULL,
    job_sheet_id VARCHAR(50),
    job_sheet_number VARCHAR(50),
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    customer_type VARCHAR(50) DEFAULT 'retail', -- retail, trade, warranty, etc.
    technician_id VARCHAR(50),
    technician_name VARCHAR(100),
    vehicle_registration VARCHAR(20),
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Parts Pricing Analytics Table (for cached calculations)
CREATE TABLE IF NOT EXISTS parts_pricing_analytics (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    
    -- Pricing statistics
    current_suggested_price DECIMAL(10,2),
    average_price_30_days DECIMAL(10,2),
    average_price_90_days DECIMAL(10,2),
    average_price_all_time DECIMAL(10,2),
    most_recent_price DECIMAL(10,2),
    most_recent_sale_date TIMESTAMP,
    highest_price DECIMAL(10,2),
    lowest_price DECIMAL(10,2),
    
    -- Sales statistics
    total_sales_count INTEGER DEFAULT 0,
    total_quantity_sold INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    sales_last_30_days INTEGER DEFAULT 0,
    sales_last_90_days INTEGER DEFAULT 0,
    
    -- Price variance indicators
    price_variance_percentage DECIMAL(5,2), -- Variance from average
    price_stability_score DECIMAL(3,2), -- 0-1 score for price consistency
    
    -- Profit margin data (for future cost integration)
    average_markup_percentage DECIMAL(5,2),
    estimated_cost_price DECIMAL(10,2),
    
    -- Metadata
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculation_version INTEGER DEFAULT 1
);

-- 4. Parts Pricing Suggestions Table
CREATE TABLE IF NOT EXISTS parts_pricing_suggestions (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    suggested_price DECIMAL(10,2) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL, -- 'historical_average', 'recent_trend', 'market_rate', etc.
    confidence_score DECIMAL(3,2), -- 0-1 confidence in suggestion
    reasoning TEXT,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_part_number ON parts_pricing_history(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_date_sold ON parts_pricing_history(date_sold);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_job_sheet ON parts_pricing_history(job_sheet_id);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_customer ON parts_pricing_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_history_customer_type ON parts_pricing_history(customer_type);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_analytics_part_number ON parts_pricing_analytics(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_suggestions_part_number ON parts_pricing_suggestions(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_suggestions_active ON parts_pricing_suggestions(is_active);

-- Create triggers for automatic analytics updates
CREATE OR REPLACE FUNCTION update_parts_pricing_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when new pricing history is added
    INSERT INTO parts_pricing_analytics (
        part_number,
        part_name,
        most_recent_price,
        most_recent_sale_date,
        last_calculated
    )
    VALUES (
        NEW.part_number,
        NEW.part_name,
        NEW.price_charged,
        NEW.date_sold,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (part_number) DO UPDATE SET
        most_recent_price = NEW.price_charged,
        most_recent_sale_date = NEW.date_sold,
        last_calculated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_parts_pricing_analytics ON parts_pricing_history;
CREATE TRIGGER trigger_update_parts_pricing_analytics
    AFTER INSERT ON parts_pricing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_parts_pricing_analytics();

-- Insert sample data for testing
INSERT INTO parts_master (part_number, part_name, description, category, manufacturer) VALUES
('OIL-5W30-5L', '5W-30 Synthetic Engine Oil 5L', 'Premium synthetic engine oil', 'Lubricants', 'Castrol'),
('FILTER-OIL-001', 'Engine Oil Filter', 'Standard engine oil filter', 'Filters', 'Mann'),
('BRAKE-PAD-FRONT', 'Front Brake Pads', 'Ceramic front brake pads', 'Brakes', 'Brembo'),
('SPARK-PLUG-NGK', 'NGK Spark Plugs', 'Iridium spark plugs set of 4', 'Ignition', 'NGK')
ON CONFLICT (part_number) DO NOTHING;

-- Insert sample pricing history
INSERT INTO parts_pricing_history (
    part_number, part_name, price_charged, quantity_sold, date_sold, 
    job_sheet_id, customer_type, vehicle_registration
) VALUES
('OIL-5W30-5L', '5W-30 Synthetic Engine Oil 5L', 64.95, 1, CURRENT_TIMESTAMP - INTERVAL '5 days', 'JS001', 'retail', 'AB12CDE'),
('OIL-5W30-5L', '5W-30 Synthetic Engine Oil 5L', 59.95, 2, CURRENT_TIMESTAMP - INTERVAL '10 days', 'JS002', 'trade', 'XY98ZAB'),
('FILTER-OIL-001', 'Engine Oil Filter', 12.95, 1, CURRENT_TIMESTAMP - INTERVAL '3 days', 'JS003', 'retail', 'CD34EFG'),
('BRAKE-PAD-FRONT', 'Front Brake Pads', 89.95, 1, CURRENT_TIMESTAMP - INTERVAL '7 days', 'JS004', 'retail', 'HI56JKL')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE parts_pricing_history IS 'Stores historical pricing data for all parts sold';
COMMENT ON TABLE parts_pricing_analytics IS 'Cached analytics and statistics for parts pricing';
COMMENT ON TABLE parts_pricing_suggestions IS 'AI-generated pricing suggestions based on historical data';
