import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"
import twilio from "twilio"

export async function GET() {
  try {
    console.log('[WHATSAPP-SETUP] Checking current WhatsApp configuration...')

    const config = TwilioService.getConfiguration()
    
    // Check environment variables
    const envVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER
    }

    // Determine WhatsApp setup type
    let whatsappSetupType = 'not_configured'
    let setupInstructions = []
    
    if (envVars.TWILIO_WHATSAPP_NUMBER) {
      if (envVars.TWILIO_WHATSAPP_NUMBER.includes('+14155238886')) {
        whatsappSetupType = 'sandbox'
        setupInstructions = [
          "✅ Using Twilio WhatsApp Sandbox (for testing)",
          "📱 To receive WhatsApp messages, users must join sandbox:",
          "1. Send WhatsApp message to: +14155238886",
          "2. Message content: 'join art-taught'",
          "3. Wait for confirmation",
          "4. Then they can receive WhatsApp messages"
        ]
      } else {
        whatsappSetupType = 'production'
        setupInstructions = [
          "✅ Using Production WhatsApp Business API",
          "📱 Messages can be sent to any WhatsApp number",
          "⚠️ Requires Facebook Business verification",
          "💰 Conversation-based pricing applies"
        ]
      }
    }

    // Test connection if configured
    let connectionTest = null
    if (config.smsConfigured) {
      try {
        const client = twilio(envVars.TWILIO_ACCOUNT_SID, envVars.TWILIO_AUTH_TOKEN)
        const account = await client.api.accounts(envVars.TWILIO_ACCOUNT_SID).fetch()
        connectionTest = {
          success: true,
          accountStatus: account.status,
          accountType: account.type,
          accountName: account.friendlyName
        }
      } catch (error) {
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }
    }

    return NextResponse.json({
      success: true,
      current_setup: {
        whatsapp_type: whatsappSetupType,
        sms_configured: config.smsConfigured,
        whatsapp_configured: config.whatsappConfigured,
        fully_configured: config.fullyConfigured
      },
      environment_variables: {
        TWILIO_ACCOUNT_SID: envVars.TWILIO_ACCOUNT_SID ? `${envVars.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'NOT_SET',
        TWILIO_AUTH_TOKEN: envVars.TWILIO_AUTH_TOKEN ? 'CONFIGURED' : 'NOT_SET',
        TWILIO_PHONE_NUMBER: envVars.TWILIO_PHONE_NUMBER || 'NOT_SET',
        TWILIO_WHATSAPP_NUMBER: envVars.TWILIO_WHATSAPP_NUMBER || 'NOT_SET'
      },
      setup_instructions: setupInstructions,
      connection_test: connectionTest,
      recommended_setup: {
        for_testing: {
          TWILIO_WHATSAPP_NUMBER: "whatsapp:+14155238886",
          note: "Sandbox - users must join before receiving messages"
        },
        for_production: {
          TWILIO_WHATSAPP_NUMBER: "whatsapp:+447488896449",
          note: "Production - requires Facebook Business verification"
        }
      },
      troubleshooting: {
        common_issues: [
          "Phone number format: Use +447488896449 (not 07488896449)",
          "WhatsApp prefix: Use whatsapp:+447488896449 for production",
          "Sandbox joining: Users must join sandbox before receiving messages",
          "Rate limiting: WhatsApp verification has rate limits"
        ],
        fallback_behavior: "System automatically falls back to SMS if WhatsApp fails"
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-SETUP] Error checking configuration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to check WhatsApp configuration'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, phoneNumber } = await request.json()
    
    console.log(`[WHATSAPP-SETUP] Executing action: ${action}`)

    if (action === 'test_whatsapp') {
      // Test WhatsApp sending
      const result = await TwilioService.sendMessage({
        to: phoneNumber || '+447843275372',
        body: `🔧 *ELI MOTORS LTD* - WhatsApp Test

Hi! This is a test message to verify WhatsApp functionality.

✅ If you receive this as WhatsApp: System working correctly
❌ If you receive this as SMS: WhatsApp needs configuration

📱 Test sent at: ${new Date().toLocaleString('en-GB')}
🔧 From: ELI MOTORS Garage Management System`,
        messageType: 'whatsapp_test',
        channel: 'whatsapp',
        urgencyLevel: 'low'
      })

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'WhatsApp test message sent' : 'WhatsApp failed, check SMS fallback',
        details: {
          channel_used: result.channel,
          message_sid: result.messageSid,
          cost: result.cost,
          fallback_reason: result.fallbackReason || null
        }
      })
    }

    if (action === 'test_sms') {
      // Test SMS sending
      const result = await TwilioService.sendSMS({
        to: phoneNumber || '+447843275372',
        body: `🔧 ELI MOTORS LTD - SMS Test

This is a test SMS to verify SMS functionality.

✅ SMS system working correctly
📱 Test sent at: ${new Date().toLocaleString('en-GB')}
🔧 From: ELI MOTORS Garage Management System`,
        messageType: 'sms_test',
        urgencyLevel: 'low'
      })

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'SMS test message sent' : 'SMS sending failed',
        details: {
          channel_used: result.channel,
          message_sid: result.messageSid,
          cost: result.cost
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-SETUP] Error executing action:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
