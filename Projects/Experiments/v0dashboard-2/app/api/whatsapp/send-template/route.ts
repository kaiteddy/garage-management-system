import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

/**
 * WhatsApp Template Message Sender
 * POST /api/whatsapp/send-template
 * 
 * Sends WhatsApp messages using Twilio Content Templates
 */
export async function POST(request: Request) {
  try {
    console.log('[WHATSAPP-TEMPLATE] 📱 Sending WhatsApp template message...')
    
    const body = await request.json()
    const {
      to,
      templateSid,
      templateVariables = {},
      messageType = 'template',
      customerName,
      urgencyLevel = 'medium'
    } = body

    // Validate required fields
    if (!to || !templateSid) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: 'to' and 'templateSid'"
      }, { status: 400 })
    }

    console.log('[WHATSAPP-TEMPLATE] Template details:', {
      to,
      templateSid,
      templateVariables,
      messageType
    })

    // Check if Twilio WhatsApp is configured
    if (!TwilioService.isWhatsAppConfigured()) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp not configured. Please check Twilio settings."
      }, { status: 500 })
    }

    // Prepare the message
    const message = {
      to,
      body: '', // Not used for template messages
      templateSid,
      templateVariables,
      messageType,
      urgencyLevel,
      channel: 'whatsapp' as const,
      customerId: body.customerId || null,
      vehicleRegistration: body.vehicleRegistration || null
    }

    // Send the WhatsApp template message
    const result = await TwilioService.sendWhatsApp(message)

    if (result.success) {
      console.log('[WHATSAPP-TEMPLATE] ✅ Template message sent successfully:', result.messageSid)
      
      return NextResponse.json({
        success: true,
        message: "WhatsApp template message sent successfully!",
        channel: result.channel,
        message_sid: result.messageSid,
        cost: result.cost,
        template_info: {
          template_sid: templateSid,
          variables: templateVariables
        },
        delivery_info: {
          method: "WhatsApp Business Template",
          to: to,
          sent_at: new Date().toISOString(),
          estimated_delivery: "Within 30 seconds"
        }
      })
    } else {
      console.error('[WHATSAPP-TEMPLATE] ❌ Failed to send template message:', result.error)
      
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to send WhatsApp template message",
        channel: result.channel
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[WHATSAPP-TEMPLATE] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

/**
 * GET /api/whatsapp/send-template
 * 
 * Returns available WhatsApp templates and usage information
 */
export async function GET() {
  try {
    const config = TwilioService.getConfiguration()
    
    // Common WhatsApp templates for garage business
    const availableTemplates = [
      {
        sid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
        name: "appointment_reminder",
        description: "Appointment reminder template",
        variables: ["date", "time"],
        example: {
          "1": "12/1",
          "2": "3pm"
        }
      },
      {
        sid: "HX_mot_reminder_template",
        name: "mot_reminder",
        description: "MOT expiry reminder",
        variables: ["vehicle_reg", "expiry_date"],
        example: {
          "1": "AB12 CDE",
          "2": "31/12/2024"
        }
      },
      {
        sid: "HX_service_reminder_template",
        name: "service_reminder",
        description: "Service due reminder",
        variables: ["vehicle_reg", "service_type"],
        example: {
          "1": "AB12 CDE",
          "2": "Annual Service"
        }
      }
    ]

    return NextResponse.json({
      success: true,
      whatsapp_configured: config.whatsappConfigured,
      sandbox_mode: config.whatsappNumber?.includes('+14155238886') || false,
      available_templates: availableTemplates,
      usage_info: {
        cost_per_conversation: "£0.005",
        delivery_time: "Within 30 seconds",
        requirements: [
          "Phone number must join WhatsApp sandbox first",
          "Send 'join art-taught' to +14155238886",
          "Template variables must match template definition"
        ]
      },
      test_example: {
        endpoint: "/api/whatsapp/send-template",
        method: "POST",
        body: {
          to: "+447843275372",
          templateSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
          templateVariables: {
            "1": "12/1",
            "2": "3pm"
          },
          messageType: "appointment_reminder"
        }
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-TEMPLATE] Error getting templates:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
