import { NextResponse } from "next/server"
import twilio from 'twilio'

export async function GET() {
  try {
    console.log("[TWILIO-CONFIG] Fetching Twilio configuration...")

    // Read environment variables dynamically for serverless compatibility
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

    console.log("[TWILIO-CONFIG] Environment variables:", {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'Missing',
      authToken: authToken ? 'Present' : 'Missing',
      phoneNumber: phoneNumber || 'Missing',
      whatsappNumber: whatsappNumber || 'Missing'
    })
    
    // Check if basic credentials are configured
    const hasCredentials = !!(accountSid && authToken && phoneNumber)
    
    let twilioStatus = 'Not configured'
    let phoneNumberInfo = null
    let accountInfo = null
    
    if (hasCredentials) {
      try {
        const client = twilio(accountSid, authToken)
        
        // Test connection and get account info
        accountInfo = await client.api.accounts(accountSid).fetch()
        twilioStatus = accountInfo.status === 'active' ? 'Connected' : accountInfo.status
        
        // Get phone number configuration
        const phoneNumbers = await client.incomingPhoneNumbers.list({
          phoneNumber: phoneNumber,
          limit: 1
        })
        
        if (phoneNumbers.length > 0) {
          phoneNumberInfo = phoneNumbers[0]
        }
        
      } catch (error) {
        console.error('[TWILIO-CONFIG] Connection error:', error)
        twilioStatus = `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
    
    // Determine base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'https://garagemanagerpro.vercel.app'
    
    const expectedWebhooks = {
      voice: `${baseUrl}/api/twilio/voice`,
      sms: `${baseUrl}/api/sms/webhook`,
      whatsapp: `${baseUrl}/api/whatsapp/webhook`,
      statusCallback: `${baseUrl}/api/twilio/status-callback`
    }
    
    const config = {
      twilio: {
        status: twilioStatus,
        accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'Not configured',
        fullyConfigured: hasCredentials && twilioStatus === 'Connected'
      },
      phoneNumber: {
        number: phoneNumber || 'Not configured',
        info: phoneNumberInfo,
        configured: !!phoneNumberInfo
      },
      whatsapp: {
        status: whatsappNumber ? (whatsappNumber.includes('+14155238886') ? 'Sandbox' : 'Production') : 'Not configured',
        number: whatsappNumber || 'Not configured'
      },
      webhooks: {
        voice: phoneNumberInfo?.voiceUrl || 'Not configured',
        sms: phoneNumberInfo?.smsUrl || 'Not configured',
        whatsapp: 'Not configured', // WhatsApp webhooks are configured differently
        statusCallback: phoneNumberInfo?.statusCallback || 'Not configured'
      },
      expected: expectedWebhooks,
      webhooksMatch: {
        voice: phoneNumberInfo?.voiceUrl === expectedWebhooks.voice,
        sms: phoneNumberInfo?.smsUrl === expectedWebhooks.sms,
        statusCallback: phoneNumberInfo?.statusCallback === expectedWebhooks.statusCallback
      },
      account: accountInfo ? {
        friendlyName: accountInfo.friendlyName,
        type: accountInfo.type,
        status: accountInfo.status
      } : null
    }
    
    return NextResponse.json({
      success: true,
      config: config,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[TWILIO-CONFIG] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        twilio: {
          status: 'Error',
          accountSid: 'Error loading',
          fullyConfigured: false
        },
        phoneNumber: {
          number: 'Error loading',
          info: null,
          configured: false
        },
        whatsapp: {
          status: 'Error loading',
          number: 'Error loading'
        },
        webhooks: {
          voice: 'Error loading',
          sms: 'Error loading',
          whatsapp: 'Error loading',
          statusCallback: 'Error loading'
        }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
