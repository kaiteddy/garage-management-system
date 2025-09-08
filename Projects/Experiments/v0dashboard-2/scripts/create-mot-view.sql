-- Create MOT critical vehicles materialized view
DROP MATERIALIZED VIEW IF EXISTS mot_critical_vehicles;

CREATE MATERIALIZED VIEW mot_critical_vehicles AS
SELECT
    v.registration as id,
    v.registration,
    v.make,
    v.model,
    v.color as colour,
    v.mot_expiry_date,
    v.mot_status,
    v.last_dvla_check,
    c.first_name,
    c.last_name,
    '' as company_name,
    c.email,
    c.phone,
    '' as mobile,
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
        ELSE (v.mot_expiry_date - CURRENT_DATE)
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

-- Create indexes
CREATE UNIQUE INDEX idx_mot_critical_vehicles_id ON mot_critical_vehicles(id);
CREATE INDEX idx_mot_critical_vehicles_urgency ON mot_critical_vehicles(urgency);
CREATE INDEX idx_mot_critical_vehicles_days ON mot_critical_vehicles(days_until_expiry);
