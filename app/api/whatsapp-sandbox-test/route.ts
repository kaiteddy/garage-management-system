import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Send test message via WhatsApp sandbox
    const message = await client.messages.create({
      body: `🚗 ELI MOTORS LTD - WhatsApp Business Test

✅ Your WhatsApp integration is working perfectly!

📱 Business Number: +447488896449
🌐 Website: www.elimotors.co.uk
📍 Serving Hendon since 1979

This message confirms your WhatsApp Business API is ready for:
• MOT reminders
• Customer communications
• Appointment confirmations

Reply "STOP" to opt out.`,
      from: process.env.TWILIO_WHATSAPP_NUMBER, // whatsapp:+14155238886
      to: 'whatsapp:+447843275372' // Your test number
    })

    return NextResponse.json({
      success: true,
      message_sid: message.sid,
      status: message.status,
      sandbox_info: {
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: 'whatsapp:+447843275372',
        business_ready: true,
        verification_status: "Sandbox working - Business verification pending rate limit reset"
      },
      next_steps: [
        "Wait 24-48 hours for WhatsApp verification rate limit to reset",
        "Retry business number verification with +447488896449",
        "Continue development using sandbox for testing",
        "Contact Facebook Business Support if needed"
      ]
    })

  } catch (error) {
    console.error('WhatsApp sandbox test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
