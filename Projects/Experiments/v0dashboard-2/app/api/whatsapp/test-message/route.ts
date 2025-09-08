import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json()

    if (!to) {
      return NextResponse.json({
        success: false,
        error: "Phone number is required"
      }, { status: 400 })
    }

    console.log(`[WHATSAPP-TEST] Sending test message to ${to}`)

    // Send test message
    const result = await WhatsAppService.sendWhatsAppMessage({
      to: to,
      content: message || "🧪 WhatsApp Test Message\n\nThis is a test message from ELI MOTORS to verify WhatsApp integration is working correctly.\n\n✅ If you received this, WhatsApp is working!\n\nReply STOP to opt out.",
      customerId: 'test-health-check',
      messageType: 'test_message'
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test message sent successfully",
        details: {
          message_sid: result.messageSid,
          conversation_id: result.conversationId,
          cost: result.cost,
          channel: result.channel
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to send test message"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[WHATSAPP-TEST] Error sending test message:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "WhatsApp test message endpoint ready",
    usage: {
      method: "POST",
      body: {
        to: "Phone number (e.g., +447843275372)",
        message: "Optional custom message"
      }
    },
    sandbox_setup: {
      step1: "Join WhatsApp sandbox by sending 'join art-taught' to +14155238886",
      step2: "Use this endpoint to send test messages",
      step3: "Check WhatsApp Management page for conversation history"
    }
  })
}
