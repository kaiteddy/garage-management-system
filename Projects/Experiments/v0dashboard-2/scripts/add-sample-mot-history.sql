-- Add sample MOT history data for testing the visualization
-- This creates realistic MOT history for vehicle HY66 DNJ

INSERT INTO mot_history (
    registration, 
    vehicle_registration,
    test_date, 
    expiry_date, 
    test_result, 
    odometer_value, 
    odometer_unit, 
    mot_test_number,
    has_failures,
    has_advisories
) VALUES 
-- 2024 MOT Test (Most Recent)
('HY66DNJ', 'HY66 DNJ', '2024-02-13', '2025-02-13', 'PASSED', 118500, 'mi', '202402131234567', false, true),

-- 2023 MOT Test
('HY66DNJ', 'HY66 DNJ', '2023-02-15', '2024-02-15', 'PASSED', 106200, 'mi', '202302151234568', false, false),

-- 2022 MOT Test
('HY66DNJ', 'HY66 DNJ', '2022-02-18', '2023-02-18', 'PASSED', 94800, 'mi', '202202181234569', false, true),

-- 2021 MOT Test
('HY66DNJ', 'HY66 DNJ', '2021-02-20', '2022-02-20', 'FAILED', 83400, 'mi', '202102201234570', true, false),
-- 2021 Retest (Same year, passed after repair)
('HY66DNJ', 'HY66 DNJ', '2021-02-25', '2022-02-25', 'PASSED', 83420, 'mi', '202102251234571', false, true),

-- 2020 MOT Test
('HY66DNJ', 'HY66 DNJ', '2020-02-22', '2021-02-22', 'PASSED', 72100, 'mi', '202002221234572', false, false),

-- 2019 MOT Test (First MOT - 3 years after registration)
('HY66DNJ', 'HY66 DNJ', '2019-02-25', '2020-02-25', 'PASSED', 58900, 'mi', '201902251234573', false, true)

ON CONFLICT (mot_test_number) DO NOTHING;

-- Update the main vehicle record with current MOT status
UPDATE vehicles 
SET 
    mot_status = 'Valid',
    mot_expiry_date = '2025-02-13',
    mot_test_date = '2024-02-13',
    mot_test_number = '202402131234567',
    mot_last_checked = NOW(),
    tax_status = 'Valid',
    tax_expiry_date = '2025-04-01'
WHERE registration = 'HY66DNJ' OR registration = 'HY66 DNJ';
