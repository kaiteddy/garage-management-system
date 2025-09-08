import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { action = 'register' } = await request.json()
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449
    
    if (action === 'register') {
      console.log('[WHATSAPP-SENDER] Registering WhatsApp sender via Senders API...')
      
      // Register WhatsApp sender using Senders API
      const sender = await client.messaging.v2.channels.senders.create({
        senderId: `whatsapp:${businessNumber}`,
        profile: {
          name: 'ELI MOTORS',
          about: 'Professional automotive services in Hendon since 1979. MOT testing, servicing, repairs & diagnostics.',
          address: '123 High Street, Hendon, London NW4 1AB',
          emails: ['info@elimotors.co.uk'],
          websites: ['https://www.elimotors.co.uk'],
          vertical: 'Other',
          logoUrl: 'https://v0dashboard.vercel.app/logo.png',
          description: 'ELI MOTORS - Your trusted automotive service center'
        },
        webhook: {
          callbackUrl: 'https://v0dashboard.vercel.app/api/sms/webhook',
          callbackMethod: 'POST'
        }
      })

      return NextResponse.json({
        success: true,
        registration_initiated: true,
        sender_details: {
          sid: sender.sid,
          sender_id: sender.senderId,
          status: sender.status,
          phone_number: businessNumber
        },
        next_steps: [
          "Registration initiated - status will be 'CREATING' initially",
          "Wait 2-5 minutes for Meta to process the registration",
          "Check status using the 'check' action",
          "Once status is 'ONLINE', WhatsApp is ready to use"
        ],
        important_notes: [
          "Twilio will handle SMS verification automatically",
          "Your business number will be verified with Meta",
          "No manual OTP entry required for Twilio SMS numbers",
          "This creates a WhatsApp Business Account (WABA) automatically"
        ]
      })
    }

    if (action === 'check') {
      console.log('[WHATSAPP-SENDER] Checking WhatsApp sender status...')
      
      // List all senders to find our WhatsApp sender
      const senders = await client.messaging.v2.channels.senders.list({
        limit: 20
      })
      
      const whatsappSender = senders.find(sender => 
        sender.senderId === `whatsapp:${businessNumber}`
      )

      if (!whatsappSender) {
        return NextResponse.json({
          success: false,
          error: "WhatsApp sender not found",
          suggestion: "Register the sender first using action: 'register'"
        })
      }

      // Get detailed sender information
      const senderDetails = await client.messaging.v2.channels.senders(whatsappSender.sid).fetch()

      return NextResponse.json({
        success: true,
        sender_status: {
          sid: senderDetails.sid,
          sender_id: senderDetails.senderId,
          status: senderDetails.status,
          phone_number: businessNumber,
          waba_id: senderDetails.configuration?.wabaId || 'Not available',
          profile: senderDetails.profile,
          properties: senderDetails.properties
        },
        status_meaning: {
          CREATING: "Registration in progress - wait a few minutes",
          OFFLINE: "Registration failed or pending - check requirements",
          ONLINE: "✅ Ready to send/receive WhatsApp messages!",
          SUSPENDED: "Suspended by Meta - contact support"
        },
        ready_to_use: senderDetails.status === 'ONLINE',
        next_actions: senderDetails.status === 'ONLINE' ? [
          "✅ WhatsApp sender is ready!",
          "Test sending a WhatsApp message",
          "Configure MOT reminders to use WhatsApp",
          "Update customer communication preferences"
        ] : [
          "Wait for registration to complete",
          "Check again in 2-5 minutes",
          "If status remains OFFLINE, check error logs",
          "Ensure phone number meets WhatsApp requirements"
        ]
      })
    }

    if (action === 'test') {
      console.log('[WHATSAPP-SENDER] Testing WhatsApp message sending...')
      
      // Send a test WhatsApp message
      const testMessage = await client.messages.create({
        body: `🚗 ELI MOTORS - WhatsApp Test Message

✅ WhatsApp Business registration successful!

📱 Your business number ${businessNumber} is now registered for WhatsApp messaging.

🔧 This enables:
• MOT reminder notifications
• Service appointment confirmations  
• Customer communication via WhatsApp

📞 ELI MOTORS
🌐 www.elimotors.co.uk
📍 Serving Hendon since 1979`,
        from: `whatsapp:${businessNumber}`,
        to: 'whatsapp:+447843275372' // Your test number
      })

      return NextResponse.json({
        success: true,
        test_message_sent: true,
        message_details: {
          sid: testMessage.sid,
          status: testMessage.status,
          from: testMessage.from,
          to: testMessage.to
        },
        verification: {
          if_received_as_whatsapp: "✅ WhatsApp Business is working perfectly!",
          if_received_as_sms: "❌ Still using SMS fallback - check sender registration",
          if_not_received: "Check Twilio logs and sender status"
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['register', 'check', 'test']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-SENDER] Error:', error)
    return NextResponse.json({
      success: false,
      error: "WhatsApp sender registration failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        "Ensure TWILIO_PHONE_NUMBER is set correctly",
        "Verify phone number is not already registered with WhatsApp",
        "Check that phone number has SMS capabilities",
        "Ensure display name follows Meta guidelines"
      ]
    }, { status: 500 })
  }
}
