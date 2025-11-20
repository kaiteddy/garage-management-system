import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[REGISTRATION-PROGRESS] Checking WhatsApp registration progress...')

    // Check recent call logs for verification calls
    const recentCalls = await client.calls.list({
      to: process.env.TWILIO_PHONE_NUMBER,
      limit: 10
    })

    // Check for completed verification calls
    const completedCalls = recentCalls.filter(call => call.status === 'completed')
    const latestCompletedCall = completedCalls[0]

    // Check messaging services for WhatsApp capability
    const messagingServices = await client.messaging.v1.services.list()
    
    // Check phone number capabilities
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num => 
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    // Try to check if WhatsApp is enabled (this might not be directly available via API)
    let whatsappEnabled = false
    try {
      // Attempt to send a test WhatsApp message to see if the number is registered
      const testResult = await client.messages.create({
        body: 'WhatsApp registration test - ignore this message',
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` // Send to self as test
      })
      whatsappEnabled = true
      console.log('[REGISTRATION-PROGRESS] WhatsApp test successful:', testResult.sid)
    } catch (error) {
      console.log('[REGISTRATION-PROGRESS] WhatsApp not yet enabled:', error)
      whatsappEnabled = false
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      registration_progress: {
        phone_verification: {
          status: completedCalls.length > 0 ? 'completed' : 'pending',
          completed_calls: completedCalls.length,
          latest_call: latestCompletedCall ? {
            sid: latestCompletedCall.sid,
            duration: latestCompletedCall.duration,
            status: latestCompletedCall.status,
            date: latestCompletedCall.dateCreated
          } : null
        },
        whatsapp_registration: {
          status: whatsappEnabled ? 'active' : 'pending',
          business_number: process.env.TWILIO_PHONE_NUMBER,
          sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER
        },
        account_status: {
          messaging_services: messagingServices.length,
          phone_number_active: !!businessNumber,
          phone_number_status: businessNumber?.status || 'unknown'
        }
      },
      next_actions: whatsappEnabled ? [
        "✅ WhatsApp registration complete!",
        "Update environment variable to use production number",
        "Test production WhatsApp messaging",
        "Set up message templates"
      ] : [
        "Enter verification code in Twilio Console",
        "Complete business information form",
        "Submit for Meta business verification",
        "Wait for approval (1-3 business days)"
      ],
      console_links: {
        whatsapp_senders: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        call_logs: "https://console.twilio.com/us1/monitor/logs/calls",
        phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
      },
      verification_code_help: {
        check_voicemail: "Check voicemail on +447488896449 for verification code",
        call_duration: latestCompletedCall?.duration ? `${latestCompletedCall.duration} seconds` : 'No completed calls',
        transcription_note: "Enable voicemail transcription in Twilio Console for email delivery"
      }
    })

  } catch (error) {
    console.error('[REGISTRATION-PROGRESS] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check registration progress",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
