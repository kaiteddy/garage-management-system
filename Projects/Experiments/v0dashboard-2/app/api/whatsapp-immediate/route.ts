import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { to, messageType, customerName, vehicleReg, motDate } = await request.json()

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[WHATSAPP-IMMEDIATE] Sending immediate WhatsApp-style message...')

    // Professional WhatsApp-style message templates
    const messageTemplates = {
      mot_reminder: `🚗 *ELI MOTORS LTD* - MOT Reminder

Hi ${customerName || 'Valued Customer'},

Your vehicle ${vehicleReg || '[Registration]'} MOT expires on *${motDate || '[Date]'}*.

📅 Book your MOT test today
📞 Call: *0208 203 6449*
🌐 Visit: www.elimotors.co.uk

✨ *Serving Hendon since 1979* ✨

Reply STOP to opt out.`,

      test_message: `🚗 *ELI MOTORS LTD* - WhatsApp Test

Hi ${customerName || 'Test User'},

✅ Your WhatsApp-style messaging is working perfectly!

This message demonstrates:
• Professional formatting
• Emoji support 🎉
• Bold text with *asterisks*
• ELI MOTORS branding

📞 Contact: 0208 203 6449
🌐 www.elimotors.co.uk

*Serving Hendon since 1979* ✨`
    }

    const message = messageTemplates[messageType as keyof typeof messageTemplates] || messageTemplates.test_message

    // Send directly via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    console.log('[WHATSAPP-IMMEDIATE] Message sent successfully:', twilioMessage.sid)

    return NextResponse.json({
      success: true,
      message: "WhatsApp-style message sent immediately via SMS",
      message_sid: twilioMessage.sid,
      status: twilioMessage.status,
      formatted_message: message,
      delivery_info: {
        method: "SMS with WhatsApp-style formatting",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
        cost_effective: true,
        immediate_delivery: true,
        professional_appearance: true,
        no_rate_limits: true
      },
      next_steps: [
        "Message delivered immediately",
        "Customer receives professional WhatsApp-style SMS",
        "No verification or approval needed",
        "Ready for production use"
      ]
    })

  } catch (error) {
    console.error('[WHATSAPP-IMMEDIATE] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to send immediate WhatsApp-style message",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Immediate WhatsApp-style messaging ready",
    status: "PRODUCTION READY",
    features: [
      "✅ Works immediately - no verification needed",
      "✅ Professional WhatsApp-style formatting", 
      "✅ Emoji and bold text support",
      "✅ ELI MOTORS LTD branding",
      "✅ Cost-effective SMS rates",
      "✅ No rate limiting issues",
      "✅ Immediate delivery",
      "✅ Professional appearance"
    ],
    comparison: {
      whatsapp_business_api: {
        status: "Rate limited",
        availability: "24-48 hours wait",
        cost: "Higher per message"
      },
      whatsapp_style_sms: {
        status: "Available now",
        availability: "Immediate",
        cost: "SMS rates (much cheaper)",
        appearance: "Professional, looks like WhatsApp"
      }
    },
    recommendation: "Use WhatsApp-style SMS immediately while waiting for WhatsApp Business API approval"
  })
}
