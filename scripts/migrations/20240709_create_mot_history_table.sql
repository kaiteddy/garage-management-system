-- Create MOT history table if it doesn't exist
CREATE TABLE IF NOT EXISTS mot_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration VARCHAR(20) NOT NULL,
    test_date TIMESTAMP,
    expiry_date DATE,
    test_result VARCHAR(20),
    odometer_value INTEGER,
    odometer_unit VARCHAR(10),
    test_number VARCHAR(50) UNIQUE,
    has_failures BOOLEAN DEFAULT false,
    has_advisories BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle
      FOREIGN KEY(registration) 
      REFERENCES vehicles(registration)
      ON DELETE CASCADE
);

-- Create index on registration for faster lookups
CREATE INDEX IF NOT EXISTS idx_mot_history_registration ON mot_history(registration);

-- Create index on test_number for the unique constraint
CREATE INDEX IF NOT EXISTS idx_mot_history_test_number ON mot_history(test_number);
