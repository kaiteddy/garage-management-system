-- Add oil_data column to vehicles table for storing oil and lubricants specifications
DO $$
BEGIN
    -- Add oil_data column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vehicles' AND column_name = 'oil_data') THEN
        ALTER TABLE vehicles ADD COLUMN oil_data JSONB;
        RAISE NOTICE 'Added oil_data column to vehicles table';
    ELSE
        RAISE NOTICE 'oil_data column already exists in vehicles table';
    END IF;
END $$;

-- Create index on oil_data for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_oil_data ON vehicles USING GIN (oil_data);
