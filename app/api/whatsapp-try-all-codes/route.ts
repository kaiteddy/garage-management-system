import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Send SMS with all possible join codes to try
    const allJoinCodes = await client.messages.create({
      body: `📱 WhatsApp Sandbox - All Join Codes to Try

Your Twilio account needs the exact join code. Try these one by one:

🔧 Send WhatsApp message to: +14155238886

Try these codes (one at a time):
1️⃣ join art-taught
2️⃣ join sandbox  
3️⃣ join twilio-sandbox
4️⃣ join art-taught-sandbox
5️⃣ join whatsapp-sandbox
6️⃣ join test-sandbox

📋 Instructions:
• Open WhatsApp
• New message to +14155238886
• Send ONE of the codes above
• Wait for "connected to sandbox" reply
• Then test again

🌐 Or check console: console.twilio.com
Look for "WhatsApp Sandbox" section

ELI MOTORS - Getting WhatsApp ready!`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+447843275372'
    })

    return NextResponse.json({
      success: true,
      comprehensive_codes_sent: true,
      message_sid: allJoinCodes.sid,
      join_codes_provided: [
        "join art-taught",
        "join sandbox",
        "join twilio-sandbox", 
        "join art-taught-sandbox",
        "join whatsapp-sandbox",
        "join test-sandbox"
      ],
      instructions: [
        "1. Open WhatsApp on your phone",
        "2. Send message to +14155238886",
        "3. Try each join code until one works",
        "4. Wait for confirmation from Twilio",
        "5. Test WhatsApp messaging again"
      ],
      console_check: {
        url: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn",
        what_to_look_for: "Sandbox Configuration section with your specific join code"
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-ALL-CODES] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to send join codes",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
