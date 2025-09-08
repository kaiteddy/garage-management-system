import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[BUSINESS-SETTINGS-INIT] Creating business settings tables...")

    // Create business_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS business_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        category VARCHAR(50) DEFAULT 'general',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create technicians table
    await sql`
      CREATE TABLE IF NOT EXISTS technicians (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        specialization TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create service_bays table
    await sql`
      CREATE TABLE IF NOT EXISTS service_bays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        bay_type VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Insert default business settings
    const defaultSettings = [
      // Business Information
      { key: 'business_name', value: 'Your Garage Name', type: 'string', category: 'business', description: 'Business name displayed on documents and communications' },
      { key: 'business_address', value: '', type: 'text', category: 'business', description: 'Full business address' },
      { key: 'business_phone', value: '', type: 'string', category: 'business', description: 'Main business phone number' },
      { key: 'business_email', value: '', type: 'string', category: 'business', description: 'Main business email address' },
      { key: 'business_website', value: '', type: 'string', category: 'business', description: 'Business website URL' },
      { key: 'vat_number', value: '', type: 'string', category: 'business', description: 'VAT registration number' },
      { key: 'company_registration', value: '', type: 'string', category: 'business', description: 'Company registration number' },
      
      // MOT Settings
      { key: 'mot_reminder_periods', value: '2 weeks,1 month,3 months,6 months', type: 'array', category: 'mot', description: 'Available MOT reminder periods' },
      { key: 'default_mot_reminder', value: '1 month', type: 'string', category: 'mot', description: 'Default MOT reminder period' },
      { key: 'mot_test_fee', value: '54.85', type: 'decimal', category: 'mot', description: 'Standard MOT test fee' },
      
      // Service Settings
      { key: 'default_labour_rate', value: '75.00', type: 'decimal', category: 'service', description: 'Default hourly labour rate' },
      { key: 'vat_rate', value: '20.00', type: 'decimal', category: 'service', description: 'VAT rate percentage' },
      { key: 'payment_terms_days', value: '30', type: 'integer', category: 'service', description: 'Default payment terms in days' },
      
      // Communication Settings
      { key: 'sms_enabled', value: 'false', type: 'boolean', category: 'communication', description: 'Enable SMS notifications' },
      { key: 'email_enabled', value: 'true', type: 'boolean', category: 'communication', description: 'Enable email notifications' },
      { key: 'whatsapp_enabled', value: 'false', type: 'boolean', category: 'communication', description: 'Enable WhatsApp notifications' },
      
      // System Settings
      { key: 'timezone', value: 'Europe/London', type: 'string', category: 'system', description: 'System timezone' },
      { key: 'date_format', value: 'DD/MM/YYYY', type: 'string', category: 'system', description: 'Date display format' },
      { key: 'currency_symbol', value: '£', type: 'string', category: 'system', description: 'Currency symbol' },
      { key: 'currency_code', value: 'GBP', type: 'string', category: 'system', description: 'Currency code' }
    ]

    for (const setting of defaultSettings) {
      await sql`
        INSERT INTO business_settings (setting_key, setting_value, setting_type, category, description)
        VALUES (${setting.key}, ${setting.value}, ${setting.type}, ${setting.category}, ${setting.description})
        ON CONFLICT (setting_key) DO NOTHING
      `
    }

    // Insert default technicians
    const defaultTechnicians = [
      { name: 'Dave', email: '', phone: '', specialization: 'General Service' },
      { name: 'Lewis', email: '', phone: '', specialization: 'MOT Testing' },
      { name: 'Mike', email: '', phone: '', specialization: 'Diagnostics' },
      { name: 'John', email: '', phone: '', specialization: 'General Service' },
      { name: 'Steve', email: '', phone: '', specialization: 'Bodywork' },
      { name: 'Tony', email: '', phone: '', specialization: 'Engine Repair' }
    ]

    for (const tech of defaultTechnicians) {
      await sql`
        INSERT INTO technicians (name, email, phone, specialization)
        VALUES (${tech.name}, ${tech.email}, ${tech.phone}, ${tech.specialization})
        ON CONFLICT DO NOTHING
      `
    }

    // Insert default service bays
    const defaultBays = [
      { name: 'MOT Bay', description: 'MOT testing bay with equipment', type: 'mot' },
      { name: 'A Point Ramp', description: 'Main service ramp', type: 'service' },
      { name: 'Service Bay', description: 'General service bay', type: 'service' },
      { name: 'Diagnostic Bay', description: 'Diagnostic equipment bay', type: 'diagnostic' }
    ]

    for (const bay of defaultBays) {
      await sql`
        INSERT INTO service_bays (name, description, bay_type)
        VALUES (${bay.name}, ${bay.description}, ${bay.type})
        ON CONFLICT DO NOTHING
      `
    }

    console.log("[BUSINESS-SETTINGS-INIT] Successfully initialized business settings tables")

    return NextResponse.json({
      success: true,
      message: "Business settings tables initialized successfully",
      tables_created: ['business_settings', 'technicians', 'service_bays'],
      default_settings_count: defaultSettings.length,
      default_technicians_count: defaultTechnicians.length,
      default_bays_count: defaultBays.length
    })

  } catch (error) {
    console.error("[BUSINESS-SETTINGS-INIT] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to initialize business settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
