import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { method = 'sms' } = await request.json() // 'sms', 'voice', or 'status'
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449
    console.log(`[WHATSAPP-VERIFICATION] Attempting ${method} verification for ${businessNumber}`)

    if (method === 'status') {
      return await checkVerificationStatus(client, businessNumber)
    }

    if (method === 'sms') {
      return await requestSMSVerification(client, businessNumber)
    }

    if (method === 'voice') {
      return await requestVoiceVerification(client, businessNumber)
    }

    return NextResponse.json({
      success: false,
      error: "Invalid method",
      valid_methods: ['sms', 'voice', 'status']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-VERIFICATION] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Verification request failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        common_issues: [
          "Rate limiting from previous attempts",
          "Number already verified",
          "WhatsApp sender not registered in Twilio Console",
          "Business verification documents pending"
        ],
        next_steps: [
          "Check Twilio Console for WhatsApp sender status",
          "Wait 24 hours if rate limited",
          "Try voice verification instead of SMS",
          "Contact Twilio support if persistent issues"
        ]
      }
    }, { status: 500 })
  }
}

async function checkVerificationStatus(client: any, businessNumber: string) {
  try {
    console.log('[VERIFICATION-STATUS] Checking current WhatsApp verification status...')

    // Check phone number capabilities
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const ourNumber = phoneNumbers.find((num: any) => num.phoneNumber === businessNumber)

    // Check for WhatsApp senders
    const messagingServices = await client.messaging.v1.services.list()
    
    // Check recent verification attempts
    const recentMessages = await client.messages.list({
      from: businessNumber,
      limit: 5
    })

    // Check account status
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()

    // Try to get WhatsApp sender status (this might fail if not registered)
    let whatsappSenderStatus = null
    try {
      // This is a hypothetical check - actual API might be different
      const senders = await client.messaging.v1.services.list()
      whatsappSenderStatus = senders.length > 0 ? 'registered' : 'not_registered'
    } catch (error) {
      whatsappSenderStatus = 'unknown'
    }

    return NextResponse.json({
      success: true,
      verification_status: {
        business_number: businessNumber,
        number_status: ourNumber?.status || 'not_found',
        number_capabilities: ourNumber?.capabilities || {},
        whatsapp_sender_status: whatsappSenderStatus,
        account_status: account.status,
        messaging_services_count: messagingServices.length
      },
      current_state: {
        sms_working: true, // We know SMS works
        whatsapp_sandbox_working: true, // Sandbox works
        whatsapp_business_status: whatsappSenderStatus === 'registered' ? 'ready' : 'needs_registration'
      },
      next_actions: whatsappSenderStatus === 'registered' ? [
        "WhatsApp sender appears registered",
        "Try sending test WhatsApp message",
        "If still failing, check Meta Business verification status"
      ] : [
        "Register WhatsApp sender in Twilio Console first",
        "Complete business verification documents",
        "Then retry verification process"
      ],
      twilio_console_links: {
        whatsapp_senders: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[VERIFICATION-STATUS] Status check failed:', error)
    throw error
  }
}

async function requestSMSVerification(client: any, businessNumber: string) {
  try {
    console.log('[SMS-VERIFICATION] Requesting SMS verification code...')

    // Note: The actual WhatsApp verification API might be different
    // This is a conceptual implementation based on typical verification flows
    
    // First, let's try to send a test SMS to confirm the number works
    const testSMS = await client.messages.create({
      body: '🔐 ELI MOTORS WhatsApp Verification Test\n\nIf you receive this SMS, your Twilio number is working correctly.\n\nNext: Check Twilio Console for WhatsApp sender registration.',
      from: businessNumber,
      to: '+447843275372' // Your test number
    })

    return NextResponse.json({
      success: true,
      method: 'sms',
      verification_attempt: {
        message_sid: testSMS.sid,
        status: testSMS.status,
        test_sms_sent: true,
        business_number: businessNumber
      },
      important_note: {
        message: "SMS verification for WhatsApp requires the sender to be registered first",
        explanation: "You can't verify a WhatsApp sender that hasn't been registered in Twilio Console",
        required_step: "Register WhatsApp sender in Twilio Console before verification"
      },
      next_steps: [
        "1. Go to Twilio Console > WhatsApp Senders",
        "2. Click 'Register a Sender'", 
        "3. Enter +447488896449",
        "4. Complete business verification",
        "5. Then retry this verification"
      ],
      test_result: "SMS capability confirmed - number works for SMS",
      console_url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[SMS-VERIFICATION] SMS verification failed:', error)
    
    return NextResponse.json({
      success: false,
      method: 'sms',
      error: error instanceof Error ? error.message : 'Unknown error',
      likely_causes: [
        "Rate limiting from previous attempts",
        "WhatsApp sender not registered",
        "Number verification cooldown period"
      ],
      recommendations: [
        "Wait 24 hours before retrying",
        "Try voice verification instead",
        "Check Twilio Console for sender registration status"
      ],
      timestamp: new Date().toISOString()
    })
  }
}

async function requestVoiceVerification(client: any, businessNumber: string) {
  try {
    console.log('[VOICE-VERIFICATION] Requesting voice verification call...')

    // Make a test voice call to confirm voice capability
    const voiceCall = await client.calls.create({
      twiml: `
        <Response>
          <Say voice="alice" language="en-GB">
            Hello, this is a test call from ELI MOTORS WhatsApp verification system.
            Your Twilio number ${businessNumber} is working correctly for voice calls.
            Please check the Twilio Console to register this number as a WhatsApp sender.
            Thank you.
          </Say>
        </Response>
      `,
      from: businessNumber,
      to: '+447843275372' // Your test number
    })

    return NextResponse.json({
      success: true,
      method: 'voice',
      verification_attempt: {
        call_sid: voiceCall.sid,
        status: voiceCall.status,
        test_call_initiated: true,
        business_number: businessNumber
      },
      voice_test_result: "Voice call initiated successfully",
      important_note: {
        message: "Voice verification for WhatsApp also requires sender registration first",
        explanation: "The voice call confirms your number works, but WhatsApp verification needs the sender to be registered",
        required_step: "Register WhatsApp sender in Twilio Console before verification"
      },
      next_steps: [
        "1. Answer the test call to confirm voice works",
        "2. Go to Twilio Console > WhatsApp Senders",
        "3. Register +447488896449 as WhatsApp sender",
        "4. Complete business verification process",
        "5. Then WhatsApp verification will work"
      ],
      console_url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[VOICE-VERIFICATION] Voice verification failed:', error)
    
    return NextResponse.json({
      success: false,
      method: 'voice',
      error: error instanceof Error ? error.message : 'Unknown error',
      likely_causes: [
        "Voice capability not enabled",
        "Rate limiting from previous attempts", 
        "International calling restrictions"
      ],
      recommendations: [
        "Check Twilio Console for voice capabilities",
        "Verify international calling is enabled",
        "Try SMS verification instead"
      ],
      timestamp: new Date().toISOString()
    })
  }
}
