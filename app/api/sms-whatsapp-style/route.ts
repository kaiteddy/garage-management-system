import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const { to, messageType, customerName, vehicleReg, motDate } = await request.json()

    console.log('[SMS-WHATSAPP-STYLE] Sending WhatsApp-style SMS...')

    // Create WhatsApp-style message templates
    const messageTemplates = {
      mot_reminder: `🚗 *ELI MOTORS LTD* - MOT Reminder

Hi ${customerName || 'Valued Customer'},

Your vehicle ${vehicleReg || '[Registration]'} MOT expires on *${motDate || '[Date]'}*.

📅 Book your MOT test today
📞 Call: *0208 203 6449*
🌐 Visit: www.elimotors.co.uk

✨ *Serving Hendon since 1979* ✨

Reply STOP to opt out.`,

      mot_critical: `🚨 *URGENT MOT REMINDER* 🚨

Hi ${customerName || 'Valued Customer'},

Your ${vehicleReg || '[Registration]'} MOT expires in *3 DAYS* (${motDate || '[Date]'}).

⚠️ *Driving without valid MOT is illegal*

📞 *BOOK NOW: 0208 203 6449*
🌐 www.elimotors.co.uk

*ELI MOTORS LTD* - Your trusted MOT centre
Reply STOP to opt out.`,

      service_confirmation: `✅ *ELI MOTORS LTD* - Service Confirmed

Hi ${customerName || 'Customer'},

Your ${vehicleReg || '[Registration]'} service is confirmed:

📅 Date: ${motDate || '[Date]'}
🕐 Time: [Time]
📍 Location: ELI MOTORS LTD, Hendon

📞 Questions? Call 0208 203 6449
🌐 www.elimotors.co.uk

See you soon! 🚗✨`,

      welcome: `👋 *Welcome to ELI MOTORS LTD*

Hi ${customerName || 'Customer'},

Thank you for choosing us for your ${vehicleReg || 'vehicle'} needs!

🔧 *Our Services:*
• MOT Testing
• Vehicle Servicing  
• Repairs & Maintenance

📞 Contact: *0208 203 6449*
🌐 Web: www.elimotors.co.uk
📍 Serving Hendon since 1979

Reply STOP to opt out.`
    }

    const message = messageTemplates[messageType as keyof typeof messageTemplates] || messageTemplates.mot_reminder

    // Send via Twilio SMS with professional formatting
    const result = await TwilioService.sendSMS({
      to: to,
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "WhatsApp-style SMS sent successfully",
        message_sid: result.messageSid,
        formatted_message: message,
        delivery_method: "SMS with WhatsApp-style formatting",
        cost_effective: true,
        professional_appearance: true,
        immediate_delivery: true
      })
    } else {
      throw new Error(result.error || 'Failed to send SMS')
    }

  } catch (error) {
    console.error('[SMS-WHATSAPP-STYLE] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to send WhatsApp-style SMS",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "WhatsApp-style SMS service ready",
    available_templates: [
      "mot_reminder",
      "mot_critical", 
      "service_confirmation",
      "welcome"
    ],
    features: [
      "Professional WhatsApp-style formatting",
      "Emoji support",
      "Bold text with asterisks",
      "ELI MOTORS LTD branding",
      "Immediate delivery",
      "Cost-effective (SMS rates)",
      "No rate limiting issues",
      "Works with existing phone numbers"
    ],
    usage: {
      endpoint: "/api/sms-whatsapp-style",
      method: "POST",
      parameters: {
        to: "Customer phone number",
        messageType: "mot_reminder | mot_critical | service_confirmation | welcome",
        customerName: "Customer name",
        vehicleReg: "Vehicle registration",
        motDate: "MOT expiry date"
      }
    }
  })
}
