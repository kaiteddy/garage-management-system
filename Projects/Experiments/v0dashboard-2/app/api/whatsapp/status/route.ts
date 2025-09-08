import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

export async function GET() {
  try {
    console.log("[WHATSAPP-STATUS] Checking WhatsApp status...")

    // Check Twilio configuration
    const twilioConfigured = TwilioService.isConfigured()
    const whatsappConfigured = TwilioService.isWhatsAppConfigured()

    // Check environment variables
    const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID
    const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER
    const hasWhatsAppNumber = !!process.env.TWILIO_WHATSAPP_NUMBER
    const hasWebhookToken = !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

    // Determine overall status
    const twilioConnected = hasAccountSid && hasAuthToken && hasPhoneNumber
    const webhookVerified = hasWebhookToken
    const businessProfileSetup = whatsappConfigured
    const templatesApproved = whatsappConfigured // Simplified for now
    const readyForProduction = twilioConnected && whatsappConfigured && webhookVerified

    const status = {
      twilioConnected,
      whatsappConfigured,
      webhookVerified,
      businessProfileSetup,
      templatesApproved,
      readyForProduction
    }

    console.log("[WHATSAPP-STATUS] Status check complete:", status)

    return NextResponse.json({
      success: true,
      status,
      details: {
        environment_variables: {
          TWILIO_ACCOUNT_SID: hasAccountSid ? "✅ Set" : "❌ Missing",
          TWILIO_AUTH_TOKEN: hasAuthToken ? "✅ Set" : "❌ Missing",
          TWILIO_PHONE_NUMBER: hasPhoneNumber ? "✅ Set" : "❌ Missing",
          TWILIO_WHATSAPP_NUMBER: hasWhatsAppNumber ? "✅ Set" : "❌ Missing",
          WHATSAPP_WEBHOOK_VERIFY_TOKEN: hasWebhookToken ? "✅ Set" : "❌ Missing"
        },
        twilio_service: {
          configured: twilioConfigured,
          whatsapp_configured: whatsappConfigured
        }
      }
    })

  } catch (error) {
    console.error("[WHATSAPP-STATUS] Error checking status:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check WhatsApp status",
      status: {
        twilioConnected: false,
        whatsappConfigured: false,
        webhookVerified: false,
        businessProfileSetup: false,
        templatesApproved: false,
        readyForProduction: false
      }
    }, { status: 500 })
  }
}
