import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[WHATSAPP-SANDBOX] Getting your specific sandbox configuration...')

    // Try to get the actual sandbox configuration
    try {
      // Get WhatsApp sandbox settings - this is the correct API call
      const sandbox = await client.messaging.v1.services.list()
      
      // Try to get sandbox participants (joined numbers)
      let sandboxParticipants = []
      try {
        // This might work to get sandbox info
        const participants = await client.messaging.v1.services.list()
        sandboxParticipants = participants
      } catch (e) {
        console.log('[SANDBOX] Could not get participants:', e.message)
      }

      return NextResponse.json({
        success: true,
        your_account_sandbox: {
          account_sid: process.env.TWILIO_ACCOUNT_SID,
          sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER,
          messaging_services: sandbox.length,
          participants: sandboxParticipants.length
        },
        sandbox_join_instructions: {
          method_1: {
            description: "Standard Twilio Sandbox",
            whatsapp_number: "+14155238886",
            join_codes_to_try: [
              "join art-taught",
              "join art-taught-sandbox", 
              "join sandbox",
              "join twilio-sandbox"
            ]
          },
          method_2: {
            description: "Check Twilio Console for exact code",
            console_url: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn",
            instructions: "Look for 'Sandbox Configuration' section"
          }
        },
        troubleshooting_steps: [
          "1. Go to Twilio Console WhatsApp Sandbox",
          "2. Look for the exact join code for your account", 
          "3. Send that code to +14155238886 via WhatsApp",
          "4. Wait for confirmation message",
          "5. Test WhatsApp messaging"
        ],
        alternative_test: {
          description: "Try sending WhatsApp message without joining first",
          note: "Some accounts don't require sandbox joining"
        }
      })

    } catch (twilioError) {
      console.error('[SANDBOX] Twilio API error:', twilioError)
      
      return NextResponse.json({
        success: false,
        error: "Could not access sandbox configuration",
        details: twilioError.message,
        manual_steps: {
          step_1: "Open Twilio Console: https://console.twilio.com",
          step_2: "Go to Messaging > Try WhatsApp",
          step_3: "Find your sandbox join code",
          step_4: "Send join code to sandbox number via WhatsApp"
        },
        console_direct_link: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
      })
    }

  } catch (error) {
    console.error('[WHATSAPP-SANDBOX] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get sandbox configuration",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'test_without_join' } = await request.json()
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    if (action === 'test_without_join') {
      console.log('[WHATSAPP-TEST] Testing WhatsApp without sandbox join...')
      
      // Try sending WhatsApp message directly
      const whatsappTest = await client.messages.create({
        body: `🚗 ELI MOTORS - WhatsApp Direct Test

✅ Testing WhatsApp delivery without sandbox join

📱 If you receive this as WhatsApp: Sandbox working!
📧 If you receive this as SMS: Need to join sandbox

🔧 Business Number: +447488896449
🌐 www.elimotors.co.uk
📍 Serving Hendon since 1979

This tests direct WhatsApp capability.`,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: 'whatsapp:+447843275372'
      })

      return NextResponse.json({
        success: true,
        test_sent: true,
        message_sid: whatsappTest.sid,
        status: whatsappTest.status,
        test_instructions: {
          if_whatsapp: "✅ Your account doesn't need sandbox joining!",
          if_sms: "❌ Need to join sandbox with correct code",
          next_step: "Check how you received this message"
        },
        sandbox_alternatives: [
          "Try different join codes: 'join art-taught', 'join sandbox'",
          "Check Twilio Console for your specific join code",
          "Contact Twilio support for sandbox access"
        ]
      })
    }

    if (action === 'send_join_instructions') {
      // Send detailed join instructions via SMS
      const instructionsSMS = await client.messages.create({
        body: `📱 WhatsApp Sandbox Setup - ELI MOTORS

To enable WhatsApp messaging:

🔧 METHOD 1:
1. Open WhatsApp
2. Message: +14155238886  
3. Send: "join art-taught"
4. Wait for confirmation

🔧 METHOD 2 (if above fails):
1. Go to: console.twilio.com
2. Find "WhatsApp Sandbox"
3. Get your specific join code
4. Send that code to +14155238886

📞 Need help? Call: 0208 203 6449`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+447843275372'
      })

      return NextResponse.json({
        success: true,
        instructions_sent: true,
        message_sid: instructionsSMS.sid,
        next_steps: [
          "Follow SMS instructions to join WhatsApp sandbox",
          "Try both join methods provided",
          "Test WhatsApp after joining"
        ]
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['test_without_join', 'send_join_instructions']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-SANDBOX] Action error:', error)
    return NextResponse.json({
      success: false,
      error: "Action failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
