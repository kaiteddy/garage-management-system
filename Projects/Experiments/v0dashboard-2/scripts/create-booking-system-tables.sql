-- Comprehensive Booking System Database Schema
-- Based on MOTAsoft Virtual Garage Manager requirements

-- =====================================================
-- 1. SERVICE TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS service_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price DECIMAL(10,2) DEFAULT 0.00,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for calendar display
    is_active BOOLEAN DEFAULT TRUE,
    requires_mot_bay BOOLEAN DEFAULT FALSE,
    requires_lift BOOLEAN DEFAULT FALSE,
    max_concurrent INTEGER DEFAULT 1, -- How many can run simultaneously
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TECHNICIANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS technicians (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    specialties TEXT[], -- Array of specialties
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    can_do_mot BOOLEAN DEFAULT FALSE,
    max_concurrent_jobs INTEGER DEFAULT 1,
    working_hours JSONB DEFAULT '{"monday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "tuesday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "wednesday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "thursday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "friday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "saturday": {"start": "08:00", "end": "12:00", "breaks": []}, "sunday": {"start": null, "end": null, "breaks": []}}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. WORKSHOP BAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workshop_bays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    bay_type VARCHAR(50) DEFAULT 'general', -- general, mot, lift, diagnostic
    is_active BOOLEAN DEFAULT TRUE,
    has_lift BOOLEAN DEFAULT FALSE,
    has_mot_equipment BOOLEAN DEFAULT FALSE,
    max_vehicle_length DECIMAL(5,2), -- in meters
    max_vehicle_height DECIMAL(5,2), -- in meters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. BOOKINGS TABLE (Main booking records)
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    service_type_id INTEGER REFERENCES service_types(id),
    technician_id INTEGER REFERENCES technicians(id),
    bay_id INTEGER REFERENCES workshop_bays(id),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Status and details
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, no_show
    priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent
    notes TEXT,
    internal_notes TEXT,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    
    -- Customer communication
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Booking source
    booking_source VARCHAR(20) DEFAULT 'manual', -- manual, online, phone, walk_in
    created_by INTEGER, -- staff member who created booking
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. BOOKING_SERVICES TABLE (Multiple services per booking)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_services (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    service_type_id INTEGER REFERENCES service_types(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TECHNICIAN_AVAILABILITY TABLE (Exceptions to normal hours)
-- =====================================================
CREATE TABLE IF NOT EXISTS technician_availability (
    id SERIAL PRIMARY KEY,
    technician_id INTEGER REFERENCES technicians(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    availability_type VARCHAR(20) NOT NULL, -- available, unavailable, holiday, sick, training
    start_time TIME,
    end_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. BOOKING_REMINDERS TABLE (Track reminder communications)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_reminders (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL, -- confirmation, reminder_24h, reminder_2h, follow_up
    method VARCHAR(10) NOT NULL, -- email, sms, phone
    recipient VARCHAR(255) NOT NULL,
    message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, delivered
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. WORKSHOP_SETTINGS TABLE (Business configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS workshop_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician ON bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(scheduled_date, scheduled_start_time);

-- Technician availability indexes
CREATE INDEX IF NOT EXISTS idx_tech_availability_date ON technician_availability(technician_id, date);

-- Booking services indexes
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);

-- Reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_booking ON booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON booking_reminders(status);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workshop_bays_updated_at BEFORE UPDATE ON workshop_bays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default service types
INSERT INTO service_types (name, description, duration_minutes, price, color, requires_mot_bay) VALUES
('MOT Test', 'Annual MOT test', 45, 54.85, '#EF4444', TRUE),
('Full Service', 'Comprehensive vehicle service', 120, 150.00, '#10B981', FALSE),
('Basic Service', 'Basic vehicle service and checks', 60, 80.00, '#3B82F6', FALSE),
('Brake Check', 'Brake system inspection and service', 90, 120.00, '#F59E0B', FALSE),
('Tyre Fitting', 'Tyre replacement service', 30, 25.00, '#8B5CF6', FALSE),
('Diagnostic', 'Vehicle diagnostic check', 60, 75.00, '#EC4899', FALSE),
('Oil Change', 'Engine oil and filter change', 30, 45.00, '#06B6D4', FALSE),
('Repair Work', 'General repair work', 60, 85.00, '#84CC16', FALSE)
ON CONFLICT DO NOTHING;

-- Insert default workshop settings
INSERT INTO workshop_settings (setting_key, setting_value, setting_type, description) VALUES
('business_hours_start', '08:00', 'string', 'Daily opening time'),
('business_hours_end', '17:00', 'string', 'Daily closing time'),
('lunch_break_start', '12:00', 'string', 'Lunch break start time'),
('lunch_break_end', '13:00', 'string', 'Lunch break end time'),
('booking_advance_days', '30', 'number', 'How many days in advance customers can book'),
('min_booking_notice_hours', '2', 'number', 'Minimum hours notice required for booking'),
('reminder_24h_enabled', 'true', 'boolean', 'Send 24-hour reminder'),
('reminder_2h_enabled', 'true', 'boolean', 'Send 2-hour reminder'),
('online_booking_enabled', 'true', 'boolean', 'Allow online bookings'),
('max_bookings_per_slot', '3', 'number', 'Maximum concurrent bookings per time slot')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE bookings IS 'Main booking records for workshop appointments';
COMMENT ON TABLE service_types IS 'Available service types with pricing and duration';
COMMENT ON TABLE technicians IS 'Workshop technicians and their schedules';
COMMENT ON TABLE workshop_bays IS 'Physical workshop bays and their capabilities';
COMMENT ON TABLE booking_services IS 'Individual services within a booking (many-to-many)';
COMMENT ON TABLE technician_availability IS 'Exceptions to normal working hours';
COMMENT ON TABLE booking_reminders IS 'Automated reminder communications';
COMMENT ON TABLE workshop_settings IS 'Configurable business settings';
