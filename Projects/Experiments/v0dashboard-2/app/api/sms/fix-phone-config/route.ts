import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    console.log("[SMS-FIX] 🔧 Fixing Twilio phone number configuration...")

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    if (!phoneNumber) {
      throw new Error("TWILIO_PHONE_NUMBER not configured")
    }

    // Get current phone number configuration
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    })

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Phone number not found in Twilio account",
        phone_number: phoneNumber,
        suggestion: "Verify the phone number is correctly provisioned in your Twilio account"
      })
    }

    const currentConfig = phoneNumbers[0]
    
    // Update webhook URLs to current ngrok tunnel
    const webhookUrl = "https://garage-manager.eu.ngrok.io/api/sms/webhook"
    
    const updatedNumber = await client.incomingPhoneNumbers(currentConfig.sid)
      .update({
        smsUrl: webhookUrl,
        smsMethod: 'POST',
        statusCallback: `${webhookUrl}/status`,
        statusCallbackMethod: 'POST'
      })

    return NextResponse.json({
      success: true,
      message: "Phone number configuration updated",
      phone_number: phoneNumber,
      configuration: {
        sid: updatedNumber.sid,
        sms_url: updatedNumber.smsUrl,
        status_callback: updatedNumber.statusCallback,
        capabilities: updatedNumber.capabilities
      },
      webhook_updated: true,
      current_tunnel: "https://garage-manager.eu.ngrok.io"
    })

  } catch (error) {
    console.error("[SMS-FIX] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix phone configuration",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
