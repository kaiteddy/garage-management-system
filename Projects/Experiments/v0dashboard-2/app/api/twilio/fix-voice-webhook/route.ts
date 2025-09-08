import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    console.log("[FIX-VOICE-WEBHOOK] 🔧 Fixing voice webhook configuration...")

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
        phone_number: phoneNumber
      })
    }

    const currentConfig = phoneNumbers[0]

    // Update webhook URLs to current ngrok tunnel with smart routing
    const voiceWebhookUrl = "https://garage-manager.eu.ngrok.io/api/twilio/voice/smart-routing"
    const smsWebhookUrl = "https://garage-manager.eu.ngrok.io/api/sms/webhook"

    console.log(`[FIX-VOICE-WEBHOOK] Updating webhooks for ${phoneNumber}`)
    console.log(`[FIX-VOICE-WEBHOOK] Voice URL: ${voiceWebhookUrl}`)
    console.log(`[FIX-VOICE-WEBHOOK] SMS URL: ${smsWebhookUrl}`)

    const updatedNumber = await client.incomingPhoneNumbers(currentConfig.sid)
      .update({
        voiceUrl: voiceWebhookUrl,
        voiceMethod: 'POST',
        smsUrl: smsWebhookUrl,
        smsMethod: 'POST',
        statusCallback: `${voiceWebhookUrl}/status`,
        statusCallbackMethod: 'POST'
      })

    // Test the voice webhook
    const testResponse = await fetch(voiceWebhookUrl, {
      method: 'GET'
    })

    return NextResponse.json({
      success: true,
      message: "Voice webhook configuration updated",
      phone_number: phoneNumber,
      configuration: {
        sid: updatedNumber.sid,
        voice_url: updatedNumber.voiceUrl,
        voice_method: updatedNumber.voiceMethod,
        sms_url: updatedNumber.smsUrl,
        status_callback: updatedNumber.statusCallback
      },
      webhook_test: {
        url: voiceWebhookUrl,
        accessible: testResponse.ok,
        status: testResponse.status
      },
      call_flow: {
        greeting: "Professional ELI MOTORS LTD greeting with Polly.Amy voice",
        routing: "Direct connection to main business number",
        voice_quality: "Amazon Polly Amy (natural British voice)",
        timeout: "45 seconds before voicemail",
        features: [
          "Caller ID shows +447488896449",
          "Automatic transcription of voicemails",
          "Extended recording time (3 minutes)",
          "Special verification code handling"
        ]
      },
      next_steps: [
        "Test by calling +447488896449",
        "Verify smart routing works (regular vs verification calls)",
        "Test WhatsApp Business verification process",
        "Check verification codes dashboard",
        "Verify voicemail recording and transcription"
      ]
    })

  } catch (error) {
    console.error("[FIX-VOICE-WEBHOOK] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix voice webhook",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
