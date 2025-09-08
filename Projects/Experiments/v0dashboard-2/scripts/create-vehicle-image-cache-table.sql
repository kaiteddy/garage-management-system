-- Create vehicle image cache table for rate limiting and performance
-- This table stores vehicle images to avoid repeated API calls to SWS/HaynesPro

CREATE TABLE IF NOT EXISTS vehicle_image_cache (
    id SERIAL PRIMARY KEY,
    vrm VARCHAR(20) NOT NULL UNIQUE,
    image_url TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast VRM lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_vrm ON vehicle_image_cache(vrm);

-- Create index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_vehicle_image_cache_created_at ON vehicle_image_cache(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_image_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_image_cache_updated_at
    BEFORE UPDATE ON vehicle_image_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_image_cache_updated_at();

-- Add comments for documentation
COMMENT ON TABLE vehicle_image_cache IS 'Cache for vehicle images from HaynesPro/SWS API to reduce API calls and improve performance';
COMMENT ON COLUMN vehicle_image_cache.vrm IS 'Vehicle Registration Mark (license plate)';
COMMENT ON COLUMN vehicle_image_cache.image_url IS 'URL or data URL of the vehicle image';
COMMENT ON COLUMN vehicle_image_cache.source IS 'Source of the image (e.g., HaynesPro via SWS, Generated SVG)';
COMMENT ON COLUMN vehicle_image_cache.created_at IS 'When the cache entry was first created';
COMMENT ON COLUMN vehicle_image_cache.updated_at IS 'When the cache entry was last updated';
