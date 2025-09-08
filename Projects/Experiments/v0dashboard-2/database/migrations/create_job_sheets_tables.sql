-- Job Sheets Database Schema
-- Comprehensive automotive job sheet system with full audit trail

-- Main job sheets table
CREATE TABLE IF NOT EXISTS job_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer Information
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    
    -- Vehicle Information
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_registration VARCHAR(20) NOT NULL,
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_year INTEGER,
    vehicle_derivative VARCHAR(100),
    vehicle_color VARCHAR(50),
    vehicle_vin VARCHAR(50),
    odometer_reading INTEGER,
    odometer_unit VARCHAR(10) DEFAULT 'miles',
    
    -- Job Details
    job_type VARCHAR(50) NOT NULL, -- 'service', 'repair', 'mot', 'diagnostic', etc.
    job_description TEXT,
    work_requested TEXT NOT NULL,
    work_performed TEXT,
    
    -- Dates and Status
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_promised TIMESTAMP WITH TIME ZONE,
    date_started TIMESTAMP WITH TIME ZONE,
    date_completed TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'authorized', 'in_progress', 'completed', 'invoiced', 'collected'
    
    -- Authorization
    customer_authorization_signature TEXT, -- Base64 encoded signature
    customer_authorization_date TIMESTAMP WITH TIME ZONE,
    customer_authorization_method VARCHAR(20), -- 'written', 'oral', 'electronic'
    customer_authorization_notes TEXT,
    
    -- Technician Information
    primary_technician_id UUID REFERENCES users(id),
    primary_technician_name VARCHAR(255),
    technician_signature TEXT, -- Base64 encoded signature
    technician_completion_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional Technicians
    additional_technicians JSONB, -- Array of {id, name, signature, date}
    
    -- Pricing
    labor_hours DECIMAL(10,2) DEFAULT 0,
    labor_rate DECIMAL(10,2) DEFAULT 0,
    labor_total DECIMAL(10,2) DEFAULT 0,
    parts_total DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional Information
    special_instructions TEXT,
    internal_notes TEXT,
    warranty_period INTEGER, -- Days
    warranty_notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job sheet line items (services/repairs performed)
CREATE TABLE IF NOT EXISTS job_sheet_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_sheet_id UUID REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Line Item Details
    line_number INTEGER NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- 'labor', 'part', 'service', 'diagnostic'
    description TEXT NOT NULL,
    
    -- Labor Details
    labor_hours DECIMAL(10,2),
    labor_rate DECIMAL(10,2),
    
    -- Part Details
    part_number VARCHAR(100),
    part_name VARCHAR(255),
    part_brand VARCHAR(100),
    part_condition VARCHAR(20), -- 'new', 'used', 'rebuilt', 'reconditioned'
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    
    -- Pricing
    line_total DECIMAL(10,2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(job_sheet_id, line_number)
);

-- Job sheet audit trail
CREATE TABLE IF NOT EXISTS job_sheet_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_sheet_id UUID REFERENCES job_sheets(id) ON DELETE CASCADE,
    
    -- Change Information
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'authorize', 'complete'
    table_name VARCHAR(50) NOT NULL, -- 'job_sheets', 'job_sheet_line_items'
    record_id UUID NOT NULL,
    
    -- Change Details
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    
    -- User Information
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50),
    
    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_sheets_job_number ON job_sheets(job_number);
CREATE INDEX IF NOT EXISTS idx_job_sheets_customer_id ON job_sheets(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_vehicle_id ON job_sheets(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_sheets_status ON job_sheets(status);
CREATE INDEX IF NOT EXISTS idx_job_sheets_date_created ON job_sheets(date_created);
CREATE INDEX IF NOT EXISTS idx_job_sheets_vehicle_registration ON job_sheets(vehicle_registration);

CREATE INDEX IF NOT EXISTS idx_job_sheet_line_items_job_sheet_id ON job_sheet_line_items(job_sheet_id);
CREATE INDEX IF NOT EXISTS idx_job_sheet_line_items_item_type ON job_sheet_line_items(item_type);

CREATE INDEX IF NOT EXISTS idx_job_sheet_audit_log_job_sheet_id ON job_sheet_audit_log(job_sheet_id);
CREATE INDEX IF NOT EXISTS idx_job_sheet_audit_log_changed_at ON job_sheet_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_job_sheet_audit_log_user_id ON job_sheet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_job_sheet_audit_log_action ON job_sheet_audit_log(action);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION log_job_sheet_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
    INSERT INTO job_sheet_audit_log (
        job_sheet_id,
        action,
        table_name,
        record_id,
        field_name,
        old_value,
        new_value,
        user_id,
        user_name,
        changed_at
    ) VALUES (
        COALESCE(NEW.job_sheet_id, OLD.job_sheet_id, NEW.id, OLD.id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        'record_change',
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::text ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::text ELSE NULL END,
        current_setting('app.current_user_id', true)::uuid,
        current_setting('app.current_user_name', true),
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER job_sheets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON job_sheets
    FOR EACH ROW EXECUTE FUNCTION log_job_sheet_changes();

CREATE TRIGGER job_sheet_line_items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON job_sheet_line_items
    FOR EACH ROW EXECUTE FUNCTION log_job_sheet_changes();
