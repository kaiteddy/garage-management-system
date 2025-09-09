import { NextResponse } from "next/server"
import twilio from 'twilio'

/**
 * Twilio Webhook Configuration Helper
 * POST /api/twilio/configure-webhooks
 * 
 * Automatically configures webhooks for Twilio phone numbers
 */
export async function POST(request: Request) {
  try {
    console.log('[WEBHOOK-CONFIG] 🔗 Configuring Twilio webhooks...')
    
    const body = await request.json()
    const {
      phoneNumber = process.env.TWILIO_PHONE_NUMBER,
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
      updateSMS = true,
      updateVoice = true,
      updateStatusCallback = true
    } = body

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials not configured"
      }, { status: 400 })
    }

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Phone number not specified"
      }, { status: 400 })
    }

    const client = twilio(accountSid, authToken)

    // Find the phone number
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    })

    if (numbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Phone number ${phoneNumber} not found in Twilio account`
      }, { status: 404 })
    }

    const number = numbers[0]
    const webhookUrls = {
      sms: `${baseUrl}/api/webhooks/communication-responses`,
      voice: `${baseUrl}/api/twilio/voice`,
      statusCallback: `${baseUrl}/api/webhooks/status-callback`
    }

    // Prepare update data
    const updateData: any = {}

    if (updateSMS) {
      updateData.smsUrl = webhookUrls.sms
      updateData.smsMethod = 'POST'
    }

    if (updateVoice) {
      updateData.voiceUrl = webhookUrls.voice
      updateData.voiceMethod = 'POST'
    }

    if (updateStatusCallback) {
      updateData.statusCallback = webhookUrls.statusCallback
      updateData.statusCallbackMethod = 'POST'
    }

    // Update the phone number configuration
    const updatedNumber = await client.incomingPhoneNumbers(number.sid).update(updateData)

    console.log('[WEBHOOK-CONFIG] ✅ Webhooks configured successfully')

    return NextResponse.json({
      success: true,
      phoneNumber: updatedNumber.phoneNumber,
      webhooks: {
        sms: {
          url: updatedNumber.smsUrl,
          method: updatedNumber.smsMethod,
          updated: updateSMS
        },
        voice: {
          url: updatedNumber.voiceUrl,
          method: updatedNumber.voiceMethod,
          updated: updateVoice
        },
        statusCallback: {
          url: updatedNumber.statusCallback,
          method: updatedNumber.statusCallbackMethod,
          updated: updateStatusCallback
        }
      },
      message: "Webhooks configured successfully"
    })

  } catch (error) {
    console.error('[WEBHOOK-CONFIG] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to configure webhooks",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Twilio configuration incomplete",
        missing: {
          accountSid: !accountSid,
          authToken: !authToken,
          phoneNumber: !phoneNumber
        }
      })
    }

    const client = twilio(accountSid, authToken)

    // Get current webhook configuration
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    })

    if (numbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Phone number ${phoneNumber} not found`
      })
    }

    const number = numbers[0]
    const recommendedUrls = {
      sms: `${baseUrl}/api/webhooks/communication-responses`,
      voice: `${baseUrl}/api/voice/webhook`,
      statusCallback: `${baseUrl}/api/webhooks/status-callback`
    }

    const currentConfig = {
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      current: {
        smsUrl: number.smsUrl || 'Not configured',
        smsMethod: number.smsMethod || 'Not configured',
        voiceUrl: number.voiceUrl || 'Not configured',
        voiceMethod: number.voiceMethod || 'Not configured',
        statusCallback: number.statusCallback || 'Not configured',
        statusCallbackMethod: number.statusCallbackMethod || 'Not configured'
      },
      recommended: recommendedUrls,
      needsUpdate: {
        sms: number.smsUrl !== recommendedUrls.sms,
        voice: number.voiceUrl !== recommendedUrls.voice,
        statusCallback: number.statusCallback !== recommendedUrls.statusCallback
      }
    }

    return NextResponse.json({
      success: true,
      configuration: currentConfig,
      instructions: [
        'Use POST to this endpoint to automatically configure webhooks',
        'Or manually configure in Twilio Console → Phone Numbers → Manage → Active numbers',
        'Click on your phone number and set the webhook URLs',
        'Ensure all URLs use HTTPS in production'
      ],
      webhookEndpoints: {
        sms: {
          url: recommendedUrls.sms,
          description: 'Handles incoming SMS and WhatsApp messages',
          method: 'POST'
        },
        voice: {
          url: recommendedUrls.voice,
          description: 'Handles incoming voice calls',
          method: 'POST'
        },
        statusCallback: {
          url: recommendedUrls.statusCallback,
          description: 'Receives delivery status updates',
          method: 'POST'
        }
      }
    })

  } catch (error) {
    console.error('[WEBHOOK-CONFIG] Error getting configuration:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get webhook configuration",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
