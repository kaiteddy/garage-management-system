import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 [SEED] Adding default booking system data...')
    
    // Insert default service types
    await sql`
      INSERT INTO service_types (name, description, duration_minutes, price, color, requires_mot_bay) VALUES
      ('MOT Test', 'Annual MOT test', 45, 54.85, '#EF4444', TRUE),
      ('Full Service', 'Comprehensive vehicle service', 120, 150.00, '#10B981', FALSE),
      ('Basic Service', 'Basic vehicle service and checks', 60, 80.00, '#3B82F6', FALSE),
      ('Brake Check', 'Brake system inspection and service', 90, 120.00, '#F59E0B', FALSE),
      ('Tyre Fitting', 'Tyre replacement service', 30, 25.00, '#8B5CF6', FALSE),
      ('Diagnostic', 'Vehicle diagnostic check', 60, 75.00, '#EC4899', FALSE),
      ('Oil Change', 'Engine oil and filter change', 30, 45.00, '#06B6D4', FALSE),
      ('Repair Work', 'General repair work', 60, 85.00, '#84CC16', FALSE)
      ON CONFLICT DO NOTHING
    `
    
    // Insert default technicians
    await sql`
      INSERT INTO technicians (name, email, phone) VALUES
      ('John Smith', 'john@garage.com', '07123456789'),
      ('Sarah Johnson', 'sarah@garage.com', '07987654321'),
      ('Mike Wilson', 'mike@garage.com', '07555123456')
      ON CONFLICT DO NOTHING
    `
    
    // Insert default workshop bays
    await sql`
      INSERT INTO workshop_bays (name, description, bay_type, has_lift, has_mot_equipment) VALUES
      ('Bay 1', 'Main service bay with lift', 'general', TRUE, FALSE),
      ('Bay 2', 'MOT testing bay', 'mot', FALSE, TRUE),
      ('Bay 3', 'Quick service bay', 'general', FALSE, FALSE),
      ('Bay 4', 'Heavy repair bay with lift', 'general', TRUE, FALSE)
      ON CONFLICT DO NOTHING
    `
    
    // Insert default workshop settings
    await sql`
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
      ('max_bookings_per_slot', '3', 'number', 'Maximum concurrent bookings per time slot'),
      ('slot_duration_minutes', '30', 'number', 'Duration of each booking slot in minutes'),
      ('garage_name', 'Your Garage Name', 'string', 'Name of the garage for bookings'),
      ('garage_phone', '01234 567890', 'string', 'Main garage phone number'),
      ('garage_email', 'bookings@yourgarage.com', 'string', 'Main garage email'),
      ('garage_address', '123 High Street, Your Town, AB12 3CD', 'string', 'Garage address for bookings')
      ON CONFLICT (setting_key) DO NOTHING
    `
    
    // Insert some sample customers for testing
    await sql`
      INSERT INTO customers (name, email, phone, address) VALUES
      ('John Doe', 'john.doe@email.com', '07123456789', '123 Main Street, Anytown, AB12 3CD'),
      ('Jane Smith', 'jane.smith@email.com', '07987654321', '456 Oak Avenue, Somewhere, CD34 5EF'),
      ('Bob Johnson', 'bob.johnson@email.com', '07555123456', '789 Pine Road, Elsewhere, EF56 7GH')
      ON CONFLICT DO NOTHING
    `
    
    // Insert some sample vehicles
    await sql`
      INSERT INTO vehicles (registration, make, model, year, color, fuel_type, customer_id) VALUES
      ('AB12 CDE', 'Ford', 'Focus', 2018, 'Blue', 'Petrol', 1),
      ('FG34 HIJ', 'Volkswagen', 'Golf', 2020, 'White', 'Diesel', 2),
      ('KL56 MNO', 'BMW', 'X5', 2019, 'Black', 'Diesel', 3),
      ('PQ78 RST', 'Toyota', 'Corolla', 2017, 'Silver', 'Hybrid', 1)
      ON CONFLICT DO NOTHING
    `
    
    console.log('✅ [SEED] Default booking system data added successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Default booking system data added successfully',
      data: {
        serviceTypes: 8,
        technicians: 3,
        workshopBays: 4,
        settings: 15,
        customers: 3,
        vehicles: 4
      }
    })
    
  } catch (error) {
    console.error('❌ [SEED] Error adding default data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current data counts
    const serviceTypes = await sql`SELECT COUNT(*) as count FROM service_types`
    const technicians = await sql`SELECT COUNT(*) as count FROM technicians`
    const bays = await sql`SELECT COUNT(*) as count FROM workshop_bays`
    const settings = await sql`SELECT COUNT(*) as count FROM workshop_settings`
    const customers = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicles = await sql`SELECT COUNT(*) as count FROM vehicles`
    const bookings = await sql`SELECT COUNT(*) as count FROM bookings`
    
    return NextResponse.json({
      success: true,
      currentData: {
        serviceTypes: parseInt(serviceTypes[0].count),
        technicians: parseInt(technicians[0].count),
        workshopBays: parseInt(bays[0].count),
        settings: parseInt(settings[0].count),
        customers: parseInt(customers[0].count),
        vehicles: parseInt(vehicles[0].count),
        bookings: parseInt(bookings[0].count)
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
