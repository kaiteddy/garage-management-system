-- Tyre Pricing Views and Enhancements
-- This script creates views and functions specifically for tyre pricing analysis

-- 1. Create a view for tyre-specific pricing history
CREATE OR REPLACE VIEW tyre_pricing_history AS
SELECT 
    pph.*,
    -- Extract tyre size using regex
    CASE 
        WHEN pph.part_name ~ '(\d{3})/(\d{2})R(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[1] || '/' || 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[2] || 'R' || 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[3]
        WHEN pph.part_name ~ '(\d{3})/(\d{2})-(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[1] || '/' || 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[2] || 'R' || 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[3]
        ELSE NULL
    END as tyre_size,
    -- Extract width, profile, diameter
    CASE 
        WHEN pph.part_name ~ '(\d{3})/(\d{2})R(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[1]::INTEGER
        WHEN pph.part_name ~ '(\d{3})/(\d{2})-(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[1]::INTEGER
        ELSE NULL
    END as tyre_width,
    CASE 
        WHEN pph.part_name ~ '(\d{3})/(\d{2})R(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[2]::INTEGER
        WHEN pph.part_name ~ '(\d{3})/(\d{2})-(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[2]::INTEGER
        ELSE NULL
    END as tyre_profile,
    CASE 
        WHEN pph.part_name ~ '(\d{3})/(\d{2})R(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})R(\d{2})'))[3]::INTEGER
        WHEN pph.part_name ~ '(\d{3})/(\d{2})-(\d{2})' THEN 
            (regexp_match(pph.part_name, '(\d{3})/(\d{2})-(\d{2})'))[3]::INTEGER
        ELSE NULL
    END as tyre_diameter
FROM parts_pricing_history pph
WHERE 
    LOWER(pph.part_name) LIKE '%tyre%' 
    OR LOWER(pph.part_name) LIKE '%tire%'
    OR pph.part_name ~ '\d{3}/\d{2}R\d{2}'
    OR pph.part_name ~ '\d{3}/\d{2}-\d{2}'
    OR LOWER(pph.notes) LIKE '%tyre%';

-- 2. Create a materialized view for tyre size analytics (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS tyre_size_analytics AS
SELECT 
    tyre_size,
    tyre_width,
    tyre_profile,
    tyre_diameter,
    COUNT(*) as total_sales,
    SUM(quantity_sold) as total_quantity,
    AVG(price_charged) as average_price,
    MIN(price_charged) as min_price,
    MAX(price_charged) as max_price,
    MAX(price_charged) - MIN(price_charged) as price_range,
    SUM(price_charged * quantity_sold) as total_revenue,
    MAX(date_sold) as last_sold,
    MIN(date_sold) as first_sold,
    -- Price stability calculation
    CASE 
        WHEN STDDEV(price_charged) IS NULL THEN 'stable'
        WHEN STDDEV(price_charged) / AVG(price_charged) > 0.2 THEN 'volatile'
        WHEN AVG(price_charged) > LAG(AVG(price_charged)) OVER (ORDER BY MAX(date_sold)) * 1.1 THEN 'trending_up'
        WHEN AVG(price_charged) < LAG(AVG(price_charged)) OVER (ORDER BY MAX(date_sold)) * 0.9 THEN 'trending_down'
        ELSE 'stable'
    END as price_stability,
    -- Recommended price (average + 10% buffer)
    ROUND(AVG(price_charged) * 1.1, 2) as recommended_price,
    -- Customer type distribution
    COUNT(CASE WHEN customer_type = 'retail' THEN 1 END) as retail_sales,
    COUNT(CASE WHEN customer_type = 'trade' THEN 1 END) as trade_sales,
    COUNT(CASE WHEN customer_type = 'warranty' THEN 1 END) as warranty_sales,
    -- Vehicle make distribution (top 3)
    MODE() WITHIN GROUP (ORDER BY vehicle_make) as most_common_vehicle_make,
    -- Last updated
    NOW() as calculated_at
FROM tyre_pricing_history
WHERE tyre_size IS NOT NULL
GROUP BY tyre_size, tyre_width, tyre_profile, tyre_diameter
HAVING COUNT(*) >= 1  -- At least 1 sale to be included
ORDER BY total_sales DESC, total_revenue DESC;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tyre_pricing_history_size ON parts_pricing_history 
USING GIN (to_tsvector('english', part_name)) 
WHERE LOWER(part_name) LIKE '%tyre%' OR part_name ~ '\d{3}/\d{2}R\d{2}';

CREATE INDEX IF NOT EXISTS idx_tyre_pricing_history_date ON parts_pricing_history (date_sold) 
WHERE LOWER(part_name) LIKE '%tyre%' OR part_name ~ '\d{3}/\d{2}R\d{2}';

CREATE INDEX IF NOT EXISTS idx_tyre_pricing_history_customer_type ON parts_pricing_history (customer_type) 
WHERE LOWER(part_name) LIKE '%tyre%' OR part_name ~ '\d{3}/\d{2}R\d{2}';

-- 4. Function to refresh tyre analytics
CREATE OR REPLACE FUNCTION refresh_tyre_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW tyre_size_analytics;
    
    -- Update the parts_pricing_analytics table with tyre-specific data
    INSERT INTO parts_pricing_analytics (
        part_number,
        part_name,
        current_suggested_price,
        average_price_all_time,
        most_recent_price,
        most_recent_sale_date,
        highest_price,
        lowest_price,
        total_sales_count,
        total_quantity_sold,
        total_revenue,
        price_stability_score,
        last_calculated
    )
    SELECT 
        tyre_size as part_number,
        'Tyre ' || tyre_size as part_name,
        recommended_price as current_suggested_price,
        average_price as average_price_all_time,
        (SELECT price_charged FROM tyre_pricing_history tph 
         WHERE tph.tyre_size = tsa.tyre_size 
         ORDER BY date_sold DESC LIMIT 1) as most_recent_price,
        last_sold as most_recent_sale_date,
        max_price as highest_price,
        min_price as lowest_price,
        total_sales as total_sales_count,
        total_quantity as total_quantity_sold,
        total_revenue,
        CASE 
            WHEN price_stability = 'stable' THEN 1.0
            WHEN price_stability = 'trending_up' THEN 0.8
            WHEN price_stability = 'trending_down' THEN 0.8
            WHEN price_stability = 'volatile' THEN 0.5
            ELSE 0.7
        END as price_stability_score,
        NOW() as last_calculated
    FROM tyre_size_analytics tsa
    ON CONFLICT (part_number) DO UPDATE SET
        current_suggested_price = EXCLUDED.current_suggested_price,
        average_price_all_time = EXCLUDED.average_price_all_time,
        most_recent_price = EXCLUDED.most_recent_price,
        most_recent_sale_date = EXCLUDED.most_recent_sale_date,
        highest_price = EXCLUDED.highest_price,
        lowest_price = EXCLUDED.lowest_price,
        total_sales_count = EXCLUDED.total_sales_count,
        total_quantity_sold = EXCLUDED.total_quantity_sold,
        total_revenue = EXCLUDED.total_revenue,
        price_stability_score = EXCLUDED.price_stability_score,
        last_calculated = EXCLUDED.last_calculated;
        
    RAISE NOTICE 'Tyre analytics refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get tyre pricing suggestions
CREATE OR REPLACE FUNCTION get_tyre_pricing_suggestion(
    p_tyre_size VARCHAR(20),
    p_customer_type VARCHAR(20) DEFAULT 'retail'
)
RETURNS TABLE (
    suggested_price DECIMAL(10,2),
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    historical_sales INTEGER,
    price_stability VARCHAR(20)
) AS $$
DECLARE
    base_price DECIMAL(10,2);
    sales_count INTEGER;
    stability VARCHAR(20);
    confidence DECIMAL(3,2) := 0.8;
BEGIN
    -- Get analytics for the tyre size
    SELECT 
        tsa.recommended_price,
        tsa.total_sales,
        tsa.price_stability
    INTO base_price, sales_count, stability
    FROM tyre_size_analytics tsa
    WHERE tsa.tyre_size = p_tyre_size;
    
    -- If no data found, return null
    IF base_price IS NULL THEN
        RETURN;
    END IF;
    
    -- Adjust price based on customer type
    CASE p_customer_type
        WHEN 'trade' THEN base_price := base_price * 0.85;
        WHEN 'warranty' THEN base_price := base_price * 0.9;
        WHEN 'internal' THEN base_price := base_price * 0.7;
        ELSE base_price := base_price; -- retail price
    END CASE;
    
    -- Adjust confidence based on data quality
    IF sales_count >= 10 THEN confidence := 0.95;
    ELSIF sales_count >= 5 THEN confidence := 0.9;
    ELSIF sales_count >= 2 THEN confidence := 0.8;
    ELSE confidence := 0.6;
    END IF;
    
    -- Adjust confidence based on price stability
    CASE stability
        WHEN 'stable' THEN confidence := confidence + 0.05;
        WHEN 'volatile' THEN confidence := confidence - 0.1;
        ELSE confidence := confidence;
    END CASE;
    
    -- Ensure confidence doesn't exceed 1.0
    confidence := LEAST(confidence, 1.0);
    
    RETURN QUERY SELECT 
        ROUND(base_price, 2) as suggested_price,
        confidence as confidence_score,
        FORMAT('Based on %s sales with %s pricing. Adjusted for %s customer.', 
               sales_count, stability, p_customer_type) as reasoning,
        sales_count as historical_sales,
        stability as price_stability;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a trigger to automatically refresh analytics when new tyre data is added
CREATE OR REPLACE FUNCTION trigger_refresh_tyre_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if this is a tyre-related part
    IF (LOWER(NEW.part_name) LIKE '%tyre%' 
        OR LOWER(NEW.part_name) LIKE '%tire%'
        OR NEW.part_name ~ '\d{3}/\d{2}R\d{2}'
        OR LOWER(NEW.notes) LIKE '%tyre%') THEN
        
        -- Schedule a refresh (in a real system, you might want to use a job queue)
        PERFORM refresh_tyre_analytics();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tyre_analytics_refresh_trigger ON parts_pricing_history;
CREATE TRIGGER tyre_analytics_refresh_trigger
    AFTER INSERT ON parts_pricing_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_tyre_analytics();

-- 7. Initial refresh of analytics
SELECT refresh_tyre_analytics();

COMMENT ON VIEW tyre_pricing_history IS 'View that extracts tyre-specific data from parts pricing history with parsed size information';
COMMENT ON MATERIALIZED VIEW tyre_size_analytics IS 'Pre-calculated analytics for tyre sizes including pricing trends and recommendations';
COMMENT ON FUNCTION get_tyre_pricing_suggestion(VARCHAR, VARCHAR) IS 'Function to get intelligent pricing suggestions for specific tyre sizes and customer types';
COMMENT ON FUNCTION refresh_tyre_analytics() IS 'Function to refresh all tyre-related analytics and update pricing suggestions';
