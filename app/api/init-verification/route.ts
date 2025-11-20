import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[INIT-VERIFICATION] 🔧 Initializing verification code tables...")

    // Create verification codes table
    await sql`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        from_number VARCHAR(20) NOT NULL,
        verification_code VARCHAR(10) NOT NULL,
        message_body TEXT,
        message_sid VARCHAR(50),
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used BOOLEAN DEFAULT FALSE
      )
    `

    console.log("[INIT-VERIFICATION] ✅ Tables created successfully")

    return NextResponse.json({
      success: true,
      message: "Verification code tracking initialized",
      webhook_url: "https://garage-manager.eu.ngrok.io/api/sms/webhook",
      check_codes_url: "https://garage-manager.eu.ngrok.io/api/verification-codes",
      instructions: [
        "1. Update Twilio webhook URL to: https://garage-manager.eu.ngrok.io/api/sms/webhook",
        "2. Request new verification code from Facebook",
        "3. Check for codes at: /api/verification-codes"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[INIT-VERIFICATION] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to initialize verification tracking",
      details: error.message
    }, { status: 500 })
  }
}
