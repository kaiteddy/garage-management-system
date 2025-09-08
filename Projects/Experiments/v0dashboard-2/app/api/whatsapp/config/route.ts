import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[WHATSAPP-CONFIG] Loading WhatsApp configuration...")

    // Return configuration (masked for security)
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?
        `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : '',
      authToken: process.env.TWILIO_AUTH_TOKEN ? '***HIDDEN***' : '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
      webhookUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
      verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '***HIDDEN***' : ''
    }

    return NextResponse.json({
      success: true,
      config,
      environment: process.env.NODE_ENV || 'development'
    })

  } catch (error) {
    console.error("[WHATSAPP-CONFIG] Error loading configuration:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to load WhatsApp configuration"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'test' } = await request.json()

    const twilio = require('twilio')
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    if (action === 'complete-registration') {
      console.log('[WHATSAPP-CONFIG] Completing WhatsApp sender registration...')

      try {
        // Register WhatsApp sender using Senders API
        const sender = await client.messaging.v2.channels.senders.create({
          senderId: 'whatsapp:+447488896449',
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
          registration_completed: true,
          sender_details: {
            sid: sender.sid,
            sender_id: sender.senderId,
            status: sender.status,
            phone_number: '+447488896449'
          },
          next_steps: [
            "Registration completed - creating WABA and Phone Number ID",
            "Wait 2-5 minutes for Meta to process",
            "Use 'check-status' to monitor progress",
            "Once status is 'ONLINE', WhatsApp is ready"
          ]
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Registration failed',
          details: error.message,
          possible_solutions: [
            'Number may already be registered elsewhere',
            'Complete registration via Twilio Console',
            'Check if number has SMS capabilities'
          ]
        })
      }
    }

    if (action === 'test') {
      console.log('[WHATSAPP-CONFIG] Testing WhatsApp sender...')

      // Send a test WhatsApp message
      const testMessage = await client.messages.create({
        body: `🎉 WhatsApp Test - ELI MOTORS

✅ Your WhatsApp Business sender is working!

Time: ${new Date().toLocaleString()}
From: +447488896449

🚗 Ready for MOT reminders!
📱 WhatsApp Business is active!`,
        from: 'whatsapp:+447488896449',
        to: 'whatsapp:+447843275372'
      })

      return NextResponse.json({
        success: true,
        test_completed: true,
        message_details: {
          sid: testMessage.sid,
          status: testMessage.status,
          from: testMessage.from,
          to: testMessage.to
        },
        verification: {
          check_your_phone: "Check +447843275372 for WhatsApp message",
          if_received_as_whatsapp: "✅ WhatsApp Business working perfectly!",
          if_received_as_sms: "❌ Still using SMS - check sender registration",
          if_not_received: "❌ Message failed - check Twilio logs"
        }
      })
    }

    if (action === 'check-status') {
      console.log('[WHATSAPP-CONFIG] Checking sender status...')

      // Check if WhatsApp sender exists
      try {
        const senders = await client.messaging.v2.channels.senders.list({ limit: 20 })
        const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
        const whatsappSender = senders.find(sender =>
          sender.senderId === whatsappNumber
        )

        if (whatsappSender) {
          return NextResponse.json({
            success: true,
            sender_found: true,
            sender_status: {
              sid: whatsappSender.sid,
              status: whatsappSender.status,
              phone_number: whatsappNumber?.replace('whatsapp:', '') || 'Unknown',
              ready_to_use: whatsappSender.status === 'ONLINE'
            },
            message: whatsappSender.status === 'ONLINE' ?
              '✅ WhatsApp sender is ONLINE and ready!' :
              `⚠️ WhatsApp sender status: ${whatsappSender.status}`
          })
        } else {
          return NextResponse.json({
            success: false,
            sender_found: false,
            message: '❌ WhatsApp sender not found - may need to register'
          })
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to check sender status',
          details: error.message
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action',
      valid_actions: ['test', 'check-status']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-CONFIG] POST Error:', error)
    return NextResponse.json({
      success: false,
      error: 'WhatsApp test failed',
      details: error.message
    }, { status: 500 })
  }
}
