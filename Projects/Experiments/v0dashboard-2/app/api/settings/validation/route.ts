import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export interface ValidationSettings {
  id?: string
  // Vehicle Requirements
  vehicle_registration_required_for_print: boolean
  vehicle_registration_required_for_invoice: boolean
  vehicle_make_required_for_print: boolean
  vehicle_make_required_for_invoice: boolean
  vehicle_model_required_for_print: boolean
  vehicle_model_required_for_invoice: boolean
  
  // Customer Requirements
  customer_name_required_for_print: boolean
  customer_name_required_for_invoice: boolean
  customer_contact_required_for_print: boolean
  customer_contact_required_for_invoice: boolean
  customer_address_required_for_print: boolean
  customer_address_required_for_invoice: boolean
  
  // Job Requirements
  mileage_required_for_print: boolean
  mileage_required_for_invoice: boolean
  technician_required_for_print: boolean
  technician_required_for_invoice: boolean
  service_advisor_required_for_print: boolean
  service_advisor_required_for_invoice: boolean
  
  // Job Items Requirements
  items_required_for_print: boolean
  items_required_for_invoice: boolean
  
  // Custom Messages
  print_blocked_message: string
  invoice_blocked_message: string
  
  // Validation Strictness
  show_warnings: boolean
  block_on_warnings: boolean
  
  created_at?: string
  updated_at?: string
}

const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  // Vehicle Requirements (Registration is critical)
  vehicle_registration_required_for_print: true,
  vehicle_registration_required_for_invoice: true,
  vehicle_make_required_for_print: false,
  vehicle_make_required_for_invoice: false,
  vehicle_model_required_for_print: false,
  vehicle_model_required_for_invoice: false,
  
  // Customer Requirements (Name and contact critical)
  customer_name_required_for_print: true,
  customer_name_required_for_invoice: true,
  customer_contact_required_for_print: true,
  customer_contact_required_for_invoice: true,
  customer_address_required_for_print: false,
  customer_address_required_for_invoice: true,
  
  // Job Requirements (Mileage critical for service records)
  mileage_required_for_print: true,
  mileage_required_for_invoice: true,
  technician_required_for_print: false,
  technician_required_for_invoice: false,
  service_advisor_required_for_print: false,
  service_advisor_required_for_invoice: false,
  
  // Job Items Requirements
  items_required_for_print: false,
  items_required_for_invoice: false,
  
  // Custom Messages
  print_blocked_message: "Please complete all required fields before printing. Check the validation details for specific requirements.",
  invoice_blocked_message: "Please complete all required fields before invoicing. Ensure customer address is complete for proper invoicing.",
  
  // Validation Strictness
  show_warnings: true,
  block_on_warnings: false
}

export async function GET() {
  try {
    console.log('[VALIDATION-SETTINGS] Fetching validation settings...')

    // Try to get existing settings
    const settings = await sql`
      SELECT * FROM validation_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (settings.length > 0) {
      console.log('[VALIDATION-SETTINGS] Found existing settings')
      return NextResponse.json({
        success: true,
        settings: settings[0]
      })
    } else {
      console.log('[VALIDATION-SETTINGS] No settings found, returning defaults')
      return NextResponse.json({
        success: true,
        settings: DEFAULT_VALIDATION_SETTINGS,
        isDefault: true
      })
    }

  } catch (error) {
    console.error('[VALIDATION-SETTINGS] Error fetching settings:', error)
    
    // If table doesn't exist, return defaults
    if (error instanceof Error && error.message.includes('relation "validation_settings" does not exist')) {
      console.log('[VALIDATION-SETTINGS] Table does not exist, returning defaults')
      return NextResponse.json({
        success: true,
        settings: DEFAULT_VALIDATION_SETTINGS,
        isDefault: true,
        needsTableCreation: true
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch validation settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: ValidationSettings = await request.json()
    console.log('[VALIDATION-SETTINGS] Updating validation settings:', settings)

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS validation_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_registration_required_for_print BOOLEAN DEFAULT true,
        vehicle_registration_required_for_invoice BOOLEAN DEFAULT true,
        vehicle_make_required_for_print BOOLEAN DEFAULT false,
        vehicle_make_required_for_invoice BOOLEAN DEFAULT false,
        vehicle_model_required_for_print BOOLEAN DEFAULT false,
        vehicle_model_required_for_invoice BOOLEAN DEFAULT false,
        customer_name_required_for_print BOOLEAN DEFAULT true,
        customer_name_required_for_invoice BOOLEAN DEFAULT true,
        customer_contact_required_for_print BOOLEAN DEFAULT true,
        customer_contact_required_for_invoice BOOLEAN DEFAULT true,
        customer_address_required_for_print BOOLEAN DEFAULT false,
        customer_address_required_for_invoice BOOLEAN DEFAULT true,
        mileage_required_for_print BOOLEAN DEFAULT true,
        mileage_required_for_invoice BOOLEAN DEFAULT true,
        technician_required_for_print BOOLEAN DEFAULT false,
        technician_required_for_invoice BOOLEAN DEFAULT false,
        service_advisor_required_for_print BOOLEAN DEFAULT false,
        service_advisor_required_for_invoice BOOLEAN DEFAULT false,
        items_required_for_print BOOLEAN DEFAULT false,
        items_required_for_invoice BOOLEAN DEFAULT false,
        print_blocked_message TEXT DEFAULT 'Please complete all required fields before printing.',
        invoice_blocked_message TEXT DEFAULT 'Please complete all required fields before invoicing.',
        show_warnings BOOLEAN DEFAULT true,
        block_on_warnings BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Insert or update settings
    const result = await sql`
      INSERT INTO validation_settings (
        vehicle_registration_required_for_print,
        vehicle_registration_required_for_invoice,
        vehicle_make_required_for_print,
        vehicle_make_required_for_invoice,
        vehicle_model_required_for_print,
        vehicle_model_required_for_invoice,
        customer_name_required_for_print,
        customer_name_required_for_invoice,
        customer_contact_required_for_print,
        customer_contact_required_for_invoice,
        customer_address_required_for_print,
        customer_address_required_for_invoice,
        mileage_required_for_print,
        mileage_required_for_invoice,
        technician_required_for_print,
        technician_required_for_invoice,
        service_advisor_required_for_print,
        service_advisor_required_for_invoice,
        items_required_for_print,
        items_required_for_invoice,
        print_blocked_message,
        invoice_blocked_message,
        show_warnings,
        block_on_warnings,
        created_at,
        updated_at
      ) VALUES (
        ${settings.vehicle_registration_required_for_print},
        ${settings.vehicle_registration_required_for_invoice},
        ${settings.vehicle_make_required_for_print ?? false},
        ${settings.vehicle_make_required_for_invoice ?? false},
        ${settings.vehicle_model_required_for_print ?? false},
        ${settings.vehicle_model_required_for_invoice ?? false},
        ${settings.customer_name_required_for_print},
        ${settings.customer_name_required_for_invoice},
        ${settings.customer_contact_required_for_print},
        ${settings.customer_contact_required_for_invoice},
        ${settings.customer_address_required_for_print ?? false},
        ${settings.customer_address_required_for_invoice},
        ${settings.mileage_required_for_print},
        ${settings.mileage_required_for_invoice},
        ${settings.technician_required_for_print ?? false},
        ${settings.technician_required_for_invoice ?? false},
        ${settings.service_advisor_required_for_print ?? false},
        ${settings.service_advisor_required_for_invoice ?? false},
        ${settings.items_required_for_print ?? false},
        ${settings.items_required_for_invoice ?? false},
        ${settings.print_blocked_message || DEFAULT_VALIDATION_SETTINGS.print_blocked_message},
        ${settings.invoice_blocked_message || DEFAULT_VALIDATION_SETTINGS.invoice_blocked_message},
        ${settings.show_warnings ?? true},
        ${settings.block_on_warnings ?? false},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log('[VALIDATION-SETTINGS] Settings saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Validation settings updated successfully',
      settings: result[0]
    })

  } catch (error) {
    console.error('[VALIDATION-SETTINGS] Error saving settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to save validation settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
