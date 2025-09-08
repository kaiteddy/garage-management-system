import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: NextRequest) {
  try {
    console.log('[MANUAL-UPDATE] Starting manual Twilio webhook update...')

    // Get credentials from request body or environment
    const body = await request.json().catch(() => ({}))
    
    const accountSid = body.accountSid || process.env.TWILIO_ACCOUNT_SID
    const authToken = body.authToken || process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = body.phoneNumber || process.env.TWILIO_PHONE_NUMBER

    console.log('[MANUAL-UPDATE] Using Account SID:', accountSid.substring(0, 8) + '...')
    console.log('[MANUAL-UPDATE] Using Phone Number:', phoneNumber)

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Missing required credentials',
        provided: {
          accountSid: !!accountSid,
          authToken: !!authToken,
          phoneNumber: !!phoneNumber
        }
      }, { status: 400 })
    }

    // Determine the correct base URL
    const baseUrl = body.baseUrl ||
                   process.env.NEXT_PUBLIC_APP_URL ||
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   request.headers.get('origin') ||
                   'https://garagemanager-4cbsv5uqm-kaisarkinnovations.vercel.app'

    console.log('[MANUAL-UPDATE] Using base URL:', baseUrl)

    // Define webhook URLs
    const webhookUrls = {
      voice: `${baseUrl}/api/twilio/voice/smart-routing`,
      sms: `${baseUrl}/api/sms/webhook`,
      statusCallback: `${baseUrl}/api/twilio/voice/recording`,
      whatsapp: `${baseUrl}/api/whatsapp/webhook`
    }

    console.log('[MANUAL-UPDATE] Webhook URLs:', webhookUrls)

    // Initialize Twilio client
    const client = twilio(accountSid, authToken)

    // Test connection first
    console.log('[MANUAL-UPDATE] Testing Twilio connection...')
    const account = await client.api.accounts(accountSid).fetch()
    console.log('[MANUAL-UPDATE] Account status:', account.status)

    // Find the phone number
    console.log('[MANUAL-UPDATE] Finding phone number...')
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber,
      limit: 1
    })

    if (phoneNumbers.length === 0) {
      // Try listing all numbers to see what's available
      const allNumbers = await client.incomingPhoneNumbers.list({ limit: 10 })
      
      return NextResponse.json({
        success: false,
        error: `Phone number ${phoneNumber} not found in Twilio account`,
        availableNumbers: allNumbers.map(num => ({
          sid: num.sid,
          phoneNumber: num.phoneNumber,
          friendlyName: num.friendlyName
        }))
      }, { status: 404 })
    }

    const phoneNumberRecord = phoneNumbers[0]
    console.log('[MANUAL-UPDATE] Found phone number:', phoneNumberRecord.phoneNumber, 'SID:', phoneNumberRecord.sid)

    // Get current configuration
    const currentConfig = {
      voiceUrl: phoneNumberRecord.voiceUrl,
      voiceMethod: phoneNumberRecord.voiceMethod,
      smsUrl: phoneNumberRecord.smsUrl,
      smsMethod: phoneNumberRecord.smsMethod,
      statusCallback: phoneNumberRecord.statusCallback,
      statusCallbackMethod: phoneNumberRecord.statusCallbackMethod
    }

    console.log('[MANUAL-UPDATE] Current configuration:', currentConfig)

    // Update the phone number configuration
    console.log('[MANUAL-UPDATE] Updating phone number configuration...')
    const updatedNumber = await client.incomingPhoneNumbers(phoneNumberRecord.sid).update({
      voiceUrl: webhookUrls.voice,
      voiceMethod: 'POST',
      smsUrl: webhookUrls.sms,
      smsMethod: 'POST',
      statusCallback: webhookUrls.statusCallback,
      statusCallbackMethod: 'POST'
    })

    console.log('[MANUAL-UPDATE] Update completed successfully')

    // Verify the update
    const verifyNumber = await client.incomingPhoneNumbers(phoneNumberRecord.sid).fetch()

    const results = {
      phoneNumber: phoneNumber,
      phoneNumberSid: phoneNumberRecord.sid,
      baseUrl: baseUrl,
      webhookUrls: webhookUrls,
      before: currentConfig,
      after: {
        voiceUrl: verifyNumber.voiceUrl,
        voiceMethod: verifyNumber.voiceMethod,
        smsUrl: verifyNumber.smsUrl,
        smsMethod: verifyNumber.smsMethod,
        statusCallback: verifyNumber.statusCallback,
        statusCallbackMethod: verifyNumber.statusCallbackMethod
      },
      success: {
        voice: verifyNumber.voiceUrl === webhookUrls.voice,
        sms: verifyNumber.smsUrl === webhookUrls.sms,
        statusCallback: verifyNumber.statusCallback === webhookUrls.statusCallback
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Twilio webhooks updated successfully',
      results: results
    })

  } catch (error) {
    console.error('[MANUAL-UPDATE] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Manual Twilio webhook update endpoint',
    usage: {
      method: 'POST',
      body: {
        accountSid: 'optional - your Twilio Account SID',
        authToken: 'optional - your Twilio Auth Token', 
        phoneNumber: 'optional - your Twilio phone number',
        baseUrl: 'optional - your app base URL'
      },
      note: 'If not provided in body, will use environment variables or defaults'
    }
  })
}
