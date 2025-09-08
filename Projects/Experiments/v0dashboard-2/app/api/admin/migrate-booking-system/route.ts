import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [MIGRATION] Creating booking system tables...')
    
    // 1. SERVICE TYPES TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS service_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        price DECIMAL(10,2) DEFAULT 0.00,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT TRUE,
        requires_mot_bay BOOLEAN DEFAULT FALSE,
        requires_lift BOOLEAN DEFAULT FALSE,
        max_concurrent INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 2. TECHNICIANS TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS technicians (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        specialties TEXT[],
        hourly_rate DECIMAL(10,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        can_do_mot BOOLEAN DEFAULT FALSE,
        max_concurrent_jobs INTEGER DEFAULT 1,
        working_hours JSONB DEFAULT '{"monday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "tuesday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "wednesday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "thursday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "friday": {"start": "08:00", "end": "17:00", "breaks": [{"start": "12:00", "end": "13:00"}]}, "saturday": {"start": "08:00", "end": "12:00", "breaks": []}, "sunday": {"start": null, "end": null, "breaks": []}}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 3. WORKSHOP BAYS TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS workshop_bays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        bay_type VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT TRUE,
        has_lift BOOLEAN DEFAULT FALSE,
        has_mot_equipment BOOLEAN DEFAULT FALSE,
        max_vehicle_length DECIMAL(5,2),
        max_vehicle_height DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Ensure customers and vehicles tables exist (create basic versions if needed)
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        registration VARCHAR(20) NOT NULL UNIQUE,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        color VARCHAR(50),
        fuel_type VARCHAR(20),
        customer_id INTEGER REFERENCES customers(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // 4. BOOKINGS TABLE (without foreign keys initially)
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_reference VARCHAR(20) UNIQUE NOT NULL,
        customer_id INTEGER,
        vehicle_id INTEGER,
        service_type_id INTEGER,
        technician_id INTEGER,
        bay_id INTEGER,
        scheduled_date DATE NOT NULL,
        scheduled_start_time TIME NOT NULL,
        scheduled_end_time TIME NOT NULL,
        actual_start_time TIMESTAMP WITH TIME ZONE,
        actual_end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'scheduled',
        priority VARCHAR(10) DEFAULT 'normal',
        notes TEXT,
        internal_notes TEXT,
        estimated_cost DECIMAL(10,2),
        final_cost DECIMAL(10,2),
        customer_phone VARCHAR(20),
        customer_email VARCHAR(255),
        reminder_sent_at TIMESTAMP WITH TIME ZONE,
        confirmation_sent_at TIMESTAMP WITH TIME ZONE,
        booking_source VARCHAR(20) DEFAULT 'manual',
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 5. BOOKING_SERVICES TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS booking_services (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER,
        service_type_id INTEGER,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 6. TECHNICIAN_AVAILABILITY TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS technician_availability (
        id SERIAL PRIMARY KEY,
        technician_id INTEGER,
        date DATE NOT NULL,
        availability_type VARCHAR(20) NOT NULL,
        start_time TIME,
        end_time TIME,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 7. BOOKING_REMINDERS TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS booking_reminders (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER,
        reminder_type VARCHAR(20) NOT NULL,
        method VARCHAR(10) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 8. WORKSHOP_SETTINGS TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS workshop_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    console.log('✅ [MIGRATION] Created all booking system tables')
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_technician ON bookings(technician_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference)`
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(scheduled_date, scheduled_start_time)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tech_availability_date ON technician_availability(technician_id, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_booking ON booking_reminders(booking_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_status ON booking_reminders(status)`
    
    console.log('✅ [MIGRATION] Created all indexes')
    
    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    
    // Apply triggers
    await sql`DROP TRIGGER IF EXISTS update_service_types_updated_at ON service_types`
    await sql`CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    
    await sql`DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians`
    await sql`CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    
    await sql`DROP TRIGGER IF EXISTS update_workshop_bays_updated_at ON workshop_bays`
    await sql`CREATE TRIGGER update_workshop_bays_updated_at BEFORE UPDATE ON workshop_bays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    
    await sql`DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings`
    await sql`CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    
    console.log('✅ [MIGRATION] Created all triggers')
    
    return NextResponse.json({
      success: true,
      message: 'Booking system database schema created successfully'
    })
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error creating booking system schema:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests'
  }, { status: 405 })
}
