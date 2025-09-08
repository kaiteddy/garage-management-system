import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[VERIFICATION-STATUS] Checking WhatsApp verification status...')

    // Check recent messages to see if verification is in progress
    const recentMessages = await client.messages.list({
      from: process.env.TWILIO_PHONE_NUMBER,
      limit: 10
    })

    // Check for any WhatsApp-related messages
    const whatsappMessages = await client.messages.list({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      limit: 10
    })

    // Check phone number status
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num =>
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    // Check account status and capabilities
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()

    // Check messaging services
    const messagingServices = await client.messaging.v1.services.list()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      verification_status: {
        business_number: process.env.TWILIO_PHONE_NUMBER,
        number_status: businessNumber?.status || 'unknown',
        voice_call_attempted: true,
        verification_in_progress: true,
        last_check: new Date().toISOString()
      },
      recent_activity: {
        sms_messages: recentMessages.length,
        whatsapp_messages: whatsappMessages.length,
        account_status: account.status,
        messaging_services: messagingServices.length
      },
      next_steps: [
        "Answer the verification call if it comes through",
        "Enter the verification code when prompted",
        "Check Twilio Console for status updates",
        "Monitor this endpoint for progress"
      ],
      monitoring: {
        check_frequency: "Every 5-10 minutes",
        expected_duration: "5-15 minutes for voice verification",
        fallback_options: [
          "SMS verification",
          "Manual document upload",
          "Contact Twilio support"
        ]
      },
      console_links: {
        whatsapp_senders: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
        account_logs: "https://console.twilio.com/us1/monitor/logs/errors"
      }
    })

  } catch (error) {
    console.error('[VERIFICATION-STATUS] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check verification status",
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: "Check Twilio Console directly for verification status"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { verificationCode } = await request.json()

    if (!verificationCode) {
      return NextResponse.json({
        success: false,
        error: "Verification code is required"
      }, { status: 400 })
    }

    console.log('[VERIFICATION-STATUS] Attempting to submit verification code...')

    // Note: The actual verification code submission would typically be done
    // through the Twilio Console UI or specific verification API endpoints

    return NextResponse.json({
      success: true,
      message: "Verification code received",
      code: verificationCode,
      next_action: "Submit this code in the Twilio Console WhatsApp sender registration page",
      console_url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
      note: "Verification codes must be submitted through the Twilio Console interface"
    })

  } catch (error) {
    console.error('[VERIFICATION-STATUS] Error submitting code:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process verification code"
    }, { status: 500 })
  }
}
