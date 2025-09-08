-- Migration: Add enhanced vehicle data fields to eliminate N/A values
-- Date: 2025-01-05
-- Purpose: Add specific columns for engine_code, euro_status, tyre specifications, and service intervals

DO $$
BEGIN
    -- Add engine code field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'engine_code') THEN
        ALTER TABLE vehicles ADD COLUMN engine_code VARCHAR(20);
        RAISE NOTICE 'Added engine_code column';
    END IF;
    
    -- Add Euro status field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'euro_status') THEN
        ALTER TABLE vehicles ADD COLUMN euro_status VARCHAR(20);
        RAISE NOTICE 'Added euro_status column';
    END IF;
    
    -- Add tyre size fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tyre_size_front') THEN
        ALTER TABLE vehicles ADD COLUMN tyre_size_front VARCHAR(50);
        RAISE NOTICE 'Added tyre_size_front column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tyre_size_rear') THEN
        ALTER TABLE vehicles ADD COLUMN tyre_size_rear VARCHAR(50);
        RAISE NOTICE 'Added tyre_size_rear column';
    END IF;
    
    -- Add tyre pressure fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tyre_pressure_front') THEN
        ALTER TABLE vehicles ADD COLUMN tyre_pressure_front VARCHAR(20);
        RAISE NOTICE 'Added tyre_pressure_front column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tyre_pressure_rear') THEN
        ALTER TABLE vehicles ADD COLUMN tyre_pressure_rear VARCHAR(20);
        RAISE NOTICE 'Added tyre_pressure_rear column';
    END IF;
    
    -- Add timing belt interval field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'timing_belt_interval') THEN
        ALTER TABLE vehicles ADD COLUMN timing_belt_interval VARCHAR(50);
        RAISE NOTICE 'Added timing_belt_interval column';
    END IF;
    
    -- Add indexes for better query performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_engine_code') THEN
        CREATE INDEX idx_vehicles_engine_code ON vehicles(engine_code);
        RAISE NOTICE 'Added index on engine_code';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_euro_status') THEN
        CREATE INDEX idx_vehicles_euro_status ON vehicles(euro_status);
        RAISE NOTICE 'Added index on euro_status';
    END IF;
    
    RAISE NOTICE 'Enhanced vehicle fields migration completed successfully';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN vehicles.engine_code IS 'Vehicle engine code (e.g., N20B20, B48A20)';
COMMENT ON COLUMN vehicles.euro_status IS 'Euro emissions standard (e.g., Euro 6, Euro 5)';
COMMENT ON COLUMN vehicles.tyre_size_front IS 'Front tyre size specification (e.g., 225/45R17)';
COMMENT ON COLUMN vehicles.tyre_size_rear IS 'Rear tyre size specification (e.g., 225/45R17)';
COMMENT ON COLUMN vehicles.tyre_pressure_front IS 'Recommended front tyre pressure (e.g., 2.2 bar)';
COMMENT ON COLUMN vehicles.tyre_pressure_rear IS 'Recommended rear tyre pressure (e.g., 2.2 bar)';
COMMENT ON COLUMN vehicles.timing_belt_interval IS 'Timing belt replacement interval (e.g., 100,000 miles)';
