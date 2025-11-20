import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { initializeSMSLog } from "@/lib/twilio-service"

export async function POST() {
  try {
    console.log("[SMS-INITIALIZE] Creating SMS tables...")
    
    // Initialize SMS log table
    await initializeSMSLog()
    
    // Create SMS responses table
    await sql`
      CREATE TABLE IF NOT EXISTS sms_responses (
        id SERIAL PRIMARY KEY,
        from_number TEXT NOT NULL,
        to_number TEXT,
        message_content TEXT NOT NULL,
        message_sid TEXT,
        vehicle_registration TEXT,
        received_at TIMESTAMP DEFAULT NOW(),
        processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP,
        action_taken TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_responses_from_number ON sms_responses(from_number)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_responses_processed ON sms_responses(processed)
    `

    // Add twilio_phone field to customers table if it doesn't exist
    try {
      await sql`
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS twilio_phone TEXT,
        ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS opt_out_date DATE
      `
    } catch (error) {
      console.error("[SMS-INITIALIZE] Error adding columns to customers table:", error)
    }

    // Populate twilio_phone field from phone field if empty
    await sql`
      UPDATE customers
      SET twilio_phone = 
        CASE 
          WHEN phone LIKE '+%' THEN phone
          WHEN phone LIKE '07%' THEN CONCAT('+44', SUBSTRING(phone FROM 2))
          WHEN phone LIKE '7%' THEN CONCAT('+447', SUBSTRING(phone FROM 2))
          ELSE CONCAT('+44', phone)
        END
      WHERE twilio_phone IS NULL OR twilio_phone = ''
      AND phone IS NOT NULL AND phone != ''
    `

    return NextResponse.json({
      success: true,
      message: "SMS tables initialized successfully"
    })
  } catch (error) {
    console.error("[SMS-INITIALIZE] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to initialize SMS tables"
    }, { status: 500 })
  }
}
