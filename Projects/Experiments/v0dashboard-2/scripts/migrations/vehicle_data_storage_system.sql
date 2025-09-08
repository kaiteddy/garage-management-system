-- Enhanced Vehicle Data Storage System with API Cost Tracking
-- This migration adds comprehensive vehicle data storage and API cost tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enhanced Vehicle Data Storage
-- Add comprehensive vehicle data columns to existing vehicles table
DO $$
BEGIN
    -- Vehicle identification and basic data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'derivative') THEN
        ALTER TABLE vehicles ADD COLUMN derivative VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'body_style') THEN
        ALTER TABLE vehicles ADD COLUMN body_style VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'doors') THEN
        ALTER TABLE vehicles ADD COLUMN doors INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'transmission') THEN
        ALTER TABLE vehicles ADD COLUMN transmission VARCHAR(50);
    END IF;
    
    -- Engine and performance data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'engine_capacity_cc') THEN
        ALTER TABLE vehicles ADD COLUMN engine_capacity_cc INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'power_bhp') THEN
        ALTER TABLE vehicles ADD COLUMN power_bhp INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'torque_nm') THEN
        ALTER TABLE vehicles ADD COLUMN torque_nm INTEGER;
    END IF;
    
    -- Fuel economy and emissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'fuel_economy_combined_mpg') THEN
        ALTER TABLE vehicles ADD COLUMN fuel_economy_combined_mpg DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'co2_emissions') THEN
        ALTER TABLE vehicles ADD COLUMN co2_emissions INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'euro_status') THEN
        ALTER TABLE vehicles ADD COLUMN euro_status VARCHAR(10);
    END IF;
    
    -- Vehicle image data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'image_url') THEN
        ALTER TABLE vehicles ADD COLUMN image_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'image_expiry_date') THEN
        ALTER TABLE vehicles ADD COLUMN image_expiry_date TIMESTAMP;
    END IF;
    
    -- Technical specifications (JSON for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'technical_specs') THEN
        ALTER TABLE vehicles ADD COLUMN technical_specs JSONB;
    END IF;
    
    -- Service data (oil, A/C, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'service_data') THEN
        ALTER TABLE vehicles ADD COLUMN service_data JSONB;
    END IF;
    
    -- Factory options and equipment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'factory_options') THEN
        ALTER TABLE vehicles ADD COLUMN factory_options JSONB;
    END IF;
    
    -- Data source tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'data_sources') THEN
        ALTER TABLE vehicles ADD COLUMN data_sources JSONB DEFAULT '{}';
    END IF;
    
    -- Last data update tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'last_data_update') THEN
        ALTER TABLE vehicles ADD COLUMN last_data_update TIMESTAMP;
    END IF;
    
    -- Data completeness score (0-100)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'data_completeness_score') THEN
        ALTER TABLE vehicles ADD COLUMN data_completeness_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. API Cost Tracking System
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration VARCHAR(20) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    api_provider VARCHAR(50) NOT NULL, -- 'VDG', 'SWS', 'DVLA', 'MOT'
    api_package VARCHAR(100), -- e.g., 'VehicleDetailsWithImage', 'TechData'
    cost_amount DECIMAL(10,4) NOT NULL DEFAULT 0, -- Cost in pounds
    currency VARCHAR(3) DEFAULT 'GBP',
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status VARCHAR(20), -- 'success', 'error', 'no_data'
    data_retrieved BOOLEAN DEFAULT false,
    cached_hit BOOLEAN DEFAULT false, -- Was this served from cache?
    request_details JSONB, -- Store request parameters
    response_summary JSONB, -- Store summary of what data was returned
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. API Cost Budget Management
CREATE TABLE IF NOT EXISTS api_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_name VARCHAR(100) NOT NULL,
    api_provider VARCHAR(50) NOT NULL,
    monthly_budget_limit DECIMAL(10,2) NOT NULL,
    current_month_spend DECIMAL(10,2) DEFAULT 0,
    budget_month DATE NOT NULL, -- First day of the budget month
    alert_threshold_percentage INTEGER DEFAULT 80, -- Alert when 80% of budget used
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Vehicle Data Cache Management
CREATE TABLE IF NOT EXISTS vehicle_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration VARCHAR(20) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'basic', 'technical', 'image', 'mot', 'service'
    api_source VARCHAR(50) NOT NULL, -- 'VDG', 'SWS', 'DVLA', 'MOT'
    cached_data JSONB NOT NULL,
    cache_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_timestamp TIMESTAMP, -- When this cache expires
    is_valid BOOLEAN DEFAULT true,
    access_count INTEGER DEFAULT 0, -- How many times this cache was used
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(registration, data_type, api_source)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_lookup ON vehicles(registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_data_sources ON vehicles USING GIN (data_sources);
CREATE INDEX IF NOT EXISTS idx_vehicles_technical_specs ON vehicles USING GIN (technical_specs);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_data ON vehicles USING GIN (service_data);
CREATE INDEX IF NOT EXISTS idx_vehicles_factory_options ON vehicles USING GIN (factory_options);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_data_update ON vehicles(last_data_update);

CREATE INDEX IF NOT EXISTS idx_api_usage_registration ON api_usage_log(registration);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_log(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_log(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage_log(cost_amount);
CREATE INDEX IF NOT EXISTS idx_api_usage_vehicle_id ON api_usage_log(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_api_budgets_provider ON api_budgets(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_budgets_month ON api_budgets(budget_month);
CREATE INDEX IF NOT EXISTS idx_api_budgets_active ON api_budgets(is_active);

CREATE INDEX IF NOT EXISTS idx_vehicle_cache_registration ON vehicle_data_cache(registration);
CREATE INDEX IF NOT EXISTS idx_vehicle_cache_type_source ON vehicle_data_cache(data_type, api_source);
CREATE INDEX IF NOT EXISTS idx_vehicle_cache_expiry ON vehicle_data_cache(expiry_timestamp);
CREATE INDEX IF NOT EXISTS idx_vehicle_cache_valid ON vehicle_data_cache(is_valid);

-- 6. Insert default API budgets
INSERT INTO api_budgets (budget_name, api_provider, monthly_budget_limit, budget_month) 
VALUES 
    ('VDG Monthly Budget', 'VDG', 100.00, DATE_TRUNC('month', CURRENT_DATE)),
    ('SWS Monthly Budget', 'SWS', 200.00, DATE_TRUNC('month', CURRENT_DATE))
ON CONFLICT DO NOTHING;

-- 7. Create views for easy reporting
CREATE OR REPLACE VIEW vehicle_data_summary AS
SELECT 
    v.id,
    v.registration,
    v.make,
    v.model,
    v.year,
    v.data_completeness_score,
    v.last_data_update,
    v.data_sources,
    CASE 
        WHEN v.image_url IS NOT NULL AND v.image_expiry_date > NOW() THEN true 
        ELSE false 
    END as has_valid_image,
    CASE 
        WHEN v.technical_specs IS NOT NULL THEN true 
        ELSE false 
    END as has_technical_specs,
    CASE 
        WHEN v.service_data IS NOT NULL THEN true 
        ELSE false 
    END as has_service_data
FROM vehicles v;

CREATE OR REPLACE VIEW api_cost_summary AS
SELECT 
    api_provider,
    DATE_TRUNC('month', request_timestamp) as month,
    COUNT(*) as total_requests,
    SUM(cost_amount) as total_cost,
    AVG(cost_amount) as avg_cost_per_request,
    COUNT(CASE WHEN cached_hit = true THEN 1 END) as cache_hits,
    COUNT(CASE WHEN response_status = 'success' THEN 1 END) as successful_requests
FROM api_usage_log 
GROUP BY api_provider, DATE_TRUNC('month', request_timestamp)
ORDER BY month DESC, api_provider;
