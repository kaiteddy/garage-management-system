-- Add missing DVLA columns to vehicles table
-- Run this before executing the DVLA vehicle scan

-- Add DVLA-specific columns if they don't exist
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS engine_capacity INTEGER,
ADD COLUMN IF NOT EXISTS co2_emissions INTEGER,
ADD COLUMN IF NOT EXISTS tax_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_due_date DATE,
ADD COLUMN IF NOT EXISTS vehicle_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_dvla_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER,
ADD COLUMN IF NOT EXISTS month_of_first_registration VARCHAR(10),
ADD COLUMN IF NOT EXISTS euro_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS type_approval VARCHAR(50),
ADD COLUMN IF NOT EXISTS wheelplan VARCHAR(20),
ADD COLUMN IF NOT EXISTS marked_for_export BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS real_driving_emissions VARCHAR(20),
ADD COLUMN IF NOT EXISTS date_of_last_v5c_issued DATE;

-- Create MOT reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS mot_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id VARCHAR(255) NOT NULL,
    registration VARCHAR(20) NOT NULL,
    mot_expiry_date DATE,
    reminder_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_mot_reminders_vehicle 
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT unique_vehicle_mot_reminder UNIQUE (vehicle_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mot_reminders_expiry_date ON mot_reminders(mot_expiry_date);
CREATE INDEX IF NOT EXISTS idx_mot_reminders_status ON mot_reminders(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_dvla_check ON vehicles(last_dvla_check);
CREATE INDEX IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date);

-- Create materialized view for MOT critical vehicles
DROP MATERIALIZED VIEW IF EXISTS mot_critical_vehicles;
CREATE MATERIALIZED VIEW mot_critical_vehicles AS
SELECT 
    v.id,
    v.registration,
    v.make,
    v.model,
    v.colour,
    v.mot_expiry_date,
    v.mot_status,
    v.last_dvla_check,
    c.forename,
    c.surname,
    c.company_name,
    c.email,
    c.telephone,
    c.mobile,
    CASE 
        WHEN v.mot_expiry_date IS NULL THEN 'unknown'
        WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
        WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'due_later'
        ELSE 'current'
    END as urgency,
    CASE 
        WHEN v.mot_expiry_date IS NULL THEN 999
        WHEN v.mot_expiry_date < CURRENT_DATE THEN 0
        ELSE EXTRACT(days FROM v.mot_expiry_date - CURRENT_DATE)
    END as days_until_expiry
FROM vehicles v
LEFT JOIN customers c ON v.customer_id = c.id
WHERE v.registration IS NOT NULL 
    AND v.registration != ''
    AND (
        v.mot_expiry_date IS NULL 
        OR v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
    )
ORDER BY days_until_expiry ASC, v.registration;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mot_critical_vehicles_id ON mot_critical_vehicles(id);
CREATE INDEX IF NOT EXISTS idx_mot_critical_vehicles_urgency ON mot_critical_vehicles(urgency);
CREATE INDEX IF NOT EXISTS idx_mot_critical_vehicles_days ON mot_critical_vehicles(days_until_expiry);

-- Update existing vehicles with default values
UPDATE vehicles 
SET 
    mot_status = COALESCE(mot_status, 'unknown'),
    vehicle_status = COALESCE(vehicle_status, 'current'),
    marked_for_export = COALESCE(marked_for_export, FALSE)
WHERE mot_status IS NULL OR vehicle_status IS NULL OR marked_for_export IS NULL;

-- Create function to refresh MOT critical view
CREATE OR REPLACE FUNCTION refresh_mot_critical_vehicles()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mot_critical_vehicles;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-refresh view when vehicles are updated
CREATE OR REPLACE FUNCTION trigger_refresh_mot_critical()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if MOT-related fields changed
    IF (TG_OP = 'UPDATE' AND (
        OLD.mot_expiry_date IS DISTINCT FROM NEW.mot_expiry_date OR
        OLD.mot_status IS DISTINCT FROM NEW.mot_status OR
        OLD.registration IS DISTINCT FROM NEW.registration
    )) OR TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        -- Use pg_notify to trigger async refresh
        PERFORM pg_notify('refresh_mot_critical', '');
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_mot_critical_refresh ON vehicles;
CREATE TRIGGER trigger_mot_critical_refresh
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION trigger_refresh_mot_critical();

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW mot_critical_vehicles;

-- Grant permissions
GRANT SELECT ON mot_reminders TO PUBLIC;
GRANT SELECT ON mot_critical_vehicles TO PUBLIC;

-- Display summary
SELECT 
    'Database schema updated successfully!' as message,
    COUNT(*) as total_vehicles,
    COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_mot_data,
    COUNT(CASE WHEN last_dvla_check IS NOT NULL THEN 1 END) as vehicles_previously_checked
FROM vehicles;
