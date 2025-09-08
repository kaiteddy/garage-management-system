import { NextResponse } from "next/server"
import { WhatsAppService } from "@/lib/whatsapp-service"

export async function POST(request: Request) {
  try {
    console.log("[WHATSAPP-WEBHOOK] Received WhatsApp webhook")
    
    const formData = await request.formData()
    
    // Extract webhook data
    const webhookData = {
      MessageSid: formData.get('MessageSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      NumMedia: formData.get('NumMedia') as string,
      MediaUrl0: formData.get('MediaUrl0') as string,
      MediaContentType0: formData.get('MediaContentType0') as string,
      AccountSid: formData.get('AccountSid') as string,
      ApiVersion: formData.get('ApiVersion') as string
    }

    console.log("[WHATSAPP-WEBHOOK] Webhook data:", {
      MessageSid: webhookData.MessageSid,
      From: webhookData.From,
      To: webhookData.To,
      Body: webhookData.Body ? `${webhookData.Body.substring(0, 50)}...` : null,
      MessageStatus: webhookData.MessageStatus
    })

    // Process the webhook
    const result = await WhatsAppService.processWebhook(webhookData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Webhook processed successfully"
      })
    } else {
      console.error("[WHATSAPP-WEBHOOK] Error processing webhook:", result.error)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[WHATSAPP-WEBHOOK] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process WhatsApp webhook"
    }, { status: 500 })
  }
}

// Handle GET requests for webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hubMode = searchParams.get('hub.mode')
    const hubChallenge = searchParams.get('hub.challenge')
    const hubVerifyToken = searchParams.get('hub.verify_token')

    console.log("[WHATSAPP-WEBHOOK] Webhook verification request:", {
      hubMode,
      hubChallenge,
      hubVerifyToken
    })

    // Verify the webhook (you should set a verify token in your environment)
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token'
    
    if (hubMode === 'subscribe' && hubVerifyToken === expectedToken) {
      console.log("[WHATSAPP-WEBHOOK] Webhook verified successfully")
      return new Response(hubChallenge, { status: 200 })
    } else {
      console.log("[WHATSAPP-WEBHOOK] Webhook verification failed")
      return new Response('Forbidden', { status: 403 })
    }

  } catch (error) {
    console.error("[WHATSAPP-WEBHOOK] Verification error:", error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
