import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const {
      to,
      message,
      messageType,
      customerName,
      vehicleReg,
      motDate,
      customMessage,
      preferWhatsApp = true
    } = await request.json()

    console.log("[WHATSAPP-SEND-TEST] Sending test message...")

    if (!to) {
      return NextResponse.json({
        success: false,
        error: "Phone number is required"
      }, { status: 400 })
    }

    // Validate phone number format (more flexible)
    const cleanPhone = to.replace(/\s+/g, '').replace(/^\+/, '')
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      return NextResponse.json({
        success: false,
        error: "Invalid phone number format. Please use format like +447123456789 or 07123456789"
      }, { status: 400 })
    }

    // Create message based on template or custom content
    let finalMessage = message

    if (messageType && messageType !== 'custom') {
      const messageTemplates = {
        mot_reminder: `🚗 *ELI MOTORS LTD* - MOT Reminder

Hi ${customerName || 'Valued Customer'},

Your vehicle ${vehicleReg || '[Registration]'} MOT expires on *${motDate || '[Date]'}*.

📅 Book your MOT test today
📞 Call: *0208 203 6449*
🌐 Visit: www.elimotors.co.uk

✨ *Serving Hendon since 1979* ✨

Reply STOP to opt out.`,
        test: `🧪 TEST MESSAGE from ELI MOTORS LTD

${message || 'WhatsApp integration test'}

✅ WhatsApp system is working!

ELI MOTORS LTD - Serving Hendon since 1979`
      }

      finalMessage = messageTemplates[messageType as keyof typeof messageTemplates] ||
                    (customMessage || message || 'Test message')
    } else if (customMessage) {
      finalMessage = customMessage
    } else if (!finalMessage) {
      finalMessage = `🧪 TEST MESSAGE from ELI MOTORS LTD

WhatsApp integration test

✅ System is working!

ELI MOTORS LTD - Serving Hendon since 1979`
    }

    // Determine channel preference
    const channel = preferWhatsApp && TwilioService.isWhatsAppConfigured() ? 'whatsapp' : 'sms'

    console.log(`[WHATSAPP-SEND-TEST] Attempting send via ${channel} to ${to}`)

    // Send message using TwilioService with automatic fallback
    const result = await TwilioService.sendMessage({
      to: to,
      body: finalMessage,
      messageType: messageType || 'test',
      customerId: null,
      vehicleRegistration: vehicleReg,
      urgencyLevel: messageType === 'mot_critical' ? 'high' : 'medium',
      channel: channel
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test message sent successfully!",
        channel: result.channel,
        message_sid: result.messageSid,
        cost: result.cost,
        delivery_info: {
          method: result.channel === 'whatsapp' ? 'WhatsApp Business' : 'SMS',
          to: to,
          sent_at: new Date().toISOString(),
          estimated_delivery: "Within 30 seconds"
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to send test message",
        channel: result.channel
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[WHATSAPP-SEND-TEST] Error sending test message:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to send test message",
      details: error.message
    }, { status: 500 })
  }
}
