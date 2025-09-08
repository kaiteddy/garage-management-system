-- Add MOT related columns to vehicles table if they don't exist
DO $$
BEGIN
    -- Add mot_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_status') THEN
        ALTER TABLE vehicles ADD COLUMN mot_status VARCHAR(20) DEFAULT 'unknown';
    END IF;

    -- Add mot_last_checked column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_last_checked') THEN
        ALTER TABLE vehicles ADD COLUMN mot_last_checked TIMESTAMP;
    END IF;

    -- Add mot_expiry_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_expiry_date') THEN
        ALTER TABLE vehicles ADD COLUMN mot_expiry_date DATE;
    END IF;

    -- Add mot_test_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_test_number') THEN
        ALTER TABLE vehicles ADD COLUMN mot_test_number VARCHAR(50);
    END IF;

    -- Add mot_test_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_test_date') THEN
        ALTER TABLE vehicles ADD COLUMN mot_test_date DATE;
    END IF;

    -- Add mot_odometer_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_odometer_value') THEN
        ALTER TABLE vehicles ADD COLUMN mot_odometer_value INTEGER;
    END IF;

    -- Add mot_odometer_unit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_odometer_unit') THEN
        ALTER TABLE vehicles ADD COLUMN mot_odometer_unit VARCHAR(10);
    END IF;

    -- Add mot_test_result column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_test_result') THEN
        ALTER TABLE vehicles ADD COLUMN mot_test_result VARCHAR(20);
    END IF;

    -- Add mot_advisories column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_advisories') THEN
        ALTER TABLE vehicles ADD COLUMN mot_advisories JSONB;
    END IF;

    -- Add mot_defects column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'mot_defects') THEN
        ALTER TABLE vehicles ADD COLUMN mot_defects JSONB;
    END IF;
END $$;
