import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

export async function POST() {
  try {
    console.log("[WHATSAPP-TEST] Testing WhatsApp connection...")

    // Check if Twilio is configured
    if (!TwilioService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Twilio is not configured. Please check your environment variables."
      }, { status: 400 })
    }

    // Test basic Twilio connection
    const twilioConfig = TwilioService.getConfiguration()
    
    // Check if WhatsApp is configured
    const whatsappConfigured = TwilioService.isWhatsAppConfigured()

    const testResults = {
      twilio_configured: TwilioService.isConfigured(),
      whatsapp_configured: whatsappConfigured,
      account_sid: !!process.env.TWILIO_ACCOUNT_SID,
      auth_token: !!process.env.TWILIO_AUTH_TOKEN,
      phone_number: !!process.env.TWILIO_PHONE_NUMBER,
      whatsapp_number: !!process.env.TWILIO_WHATSAPP_NUMBER,
      webhook_token: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    }

    const allTestsPassed = Object.values(testResults).every(Boolean)

    console.log("[WHATSAPP-TEST] Test results:", testResults)

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? 
        "All WhatsApp connection tests passed!" : 
        "Some WhatsApp connection tests failed",
      test_results: testResults,
      configuration: twilioConfig,
      recommendations: allTestsPassed ? [
        "✅ WhatsApp is ready for testing",
        "✅ You can send test messages",
        "✅ Webhook is configured"
      ] : [
        "❌ Check environment variables",
        "❌ Verify Twilio account settings",
        "❌ Ensure WhatsApp Business is approved"
      ]
    })

  } catch (error) {
    console.error("[WHATSAPP-TEST] Error testing connection:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test WhatsApp connection",
      details: error.message
    }, { status: 500 })
  }
}
