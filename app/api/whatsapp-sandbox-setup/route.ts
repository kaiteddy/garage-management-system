import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Get sandbox configuration
    const sandbox = await client.messaging.v1.services.list()
    
    return NextResponse.json({
      success: true,
      sandbox_setup: {
        sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER,
        join_instructions: {
          step_1: "Send a WhatsApp message to +14155238886",
          step_2: "Message content: 'join art-taught'",
          step_3: "Wait for confirmation message",
          step_4: "Then test WhatsApp functionality"
        },
        important_notes: [
          "You must join the sandbox before receiving WhatsApp messages",
          "Each phone number needs to join individually", 
          "Sandbox is for testing only - production needs business verification",
          "Messages sent to non-joined numbers will fallback to SMS"
        ]
      },
      current_status: {
        your_number: "+447843275372",
        sandbox_joined: "Unknown - check by sending test message",
        fallback_behavior: "SMS delivery when WhatsApp fails"
      }
    })

  } catch (error) {
    console.error('Sandbox setup error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get sandbox setup",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'test' } = await request.json()
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    if (action === 'test') {
      // Test if number is joined to sandbox
      const testMessage = await client.messages.create({
        body: `🔧 WhatsApp Sandbox Test - ELI MOTORS

If you receive this as a WhatsApp message, your number is properly joined to the sandbox.

If you receive this as SMS, you need to:
1. Send WhatsApp to +14155238886
2. Message: "join art-taught"
3. Wait for confirmation
4. Then retry this test

📱 Testing from: ${process.env.TWILIO_WHATSAPP_NUMBER}`,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: 'whatsapp:+447843275372'
      })

      return NextResponse.json({
        success: true,
        test_message_sent: true,
        message_sid: testMessage.sid,
        instructions: {
          if_received_as_whatsapp: "✅ Sandbox working - you're joined!",
          if_received_as_sms: "❌ Need to join sandbox first",
          how_to_join: [
            "1. Open WhatsApp on your phone",
            "2. Send message to: +14155238886", 
            "3. Message content: join art-taught",
            "4. Wait for confirmation reply",
            "5. Then retry this test"
          ]
        }
      })
    }

    if (action === 'send-join-reminder') {
      // Send SMS with join instructions
      const reminderSMS = await client.messages.create({
        body: `🔧 WhatsApp Sandbox Setup - ELI MOTORS

To receive WhatsApp messages from our system:

1️⃣ Open WhatsApp
2️⃣ Send message to: +14155238886
3️⃣ Message: join art-taught
4️⃣ Wait for confirmation

Then test again at: ${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp-sandbox-setup

📱 This enables WhatsApp testing for MOT reminders.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+447843275372'
      })

      return NextResponse.json({
        success: true,
        reminder_sent: true,
        message_sid: reminderSMS.sid,
        next_step: "Follow SMS instructions to join WhatsApp sandbox"
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['test', 'send-join-reminder']
    }, { status: 400 })

  } catch (error) {
    console.error('Sandbox action error:', error)
    return NextResponse.json({
      success: false,
      error: "Sandbox action failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
