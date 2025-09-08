import { NextResponse } from "next/server"
import twilio from 'twilio'

export async function GET() {
  try {
    console.log("[TWILIO-TEST] Testing Twilio configuration...")
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
    
    // Check environment variables
    const config = {
      accountSid: accountSid ? '✅ Configured' : '❌ Missing',
      authToken: authToken ? '✅ Configured' : '❌ Missing',
      phoneNumber: phoneNumber || '❌ Not configured',
      whatsappNumber: whatsappNumber || '❌ Not configured',
      webhookUrls: {
        voice: process.env.TWILIO_VOICE_WEBHOOK_URL || '❌ Not configured',
        sms: process.env.TWILIO_SMS_WEBHOOK_URL || '❌ Not configured',
        whatsapp: process.env.TWILIO_WEBHOOK_URL || '❌ Not configured'
      }
    }
    
    let twilioStatus = '❌ Cannot connect'
    let phoneNumberInfo = null
    
    // Test Twilio connection
    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken)
        
        // Get account info
        const account = await client.api.accounts(accountSid).fetch()
        twilioStatus = `✅ Connected (${account.friendlyName})`
        
        // Get phone number info
        if (phoneNumber) {
          const numbers = await client.incomingPhoneNumbers.list({
            phoneNumber: phoneNumber
          })
          
          if (numbers.length > 0) {
            const number = numbers[0]
            phoneNumberInfo = {
              sid: number.sid,
              friendlyName: number.friendlyName,
              voiceUrl: number.voiceUrl || '❌ Not configured',
              smsUrl: number.smsUrl || '❌ Not configured',
              capabilities: {
                voice: number.capabilities.voice ? '✅' : '❌',
                sms: number.capabilities.sms ? '✅' : '❌',
                mms: number.capabilities.mms ? '✅' : '❌'
              }
            }
          }
        }
        
      } catch (error) {
        twilioStatus = `❌ Connection error: ${error.message}`
      }
    }
    
    // WhatsApp sandbox status
    let whatsappStatus = '❌ Not configured'
    if (whatsappNumber) {
      if (whatsappNumber.includes('+14155238886')) {
        whatsappStatus = '🧪 Sandbox configured'
      } else {
        whatsappStatus = '✅ Production configured'
      }
    }
    
    return NextResponse.json({
      success: true,
      configuration: {
        twilio: {
          status: twilioStatus,
          accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'Not configured'
        },
        phoneNumber: {
          number: phoneNumber,
          info: phoneNumberInfo
        },
        whatsapp: {
          status: whatsappStatus,
          number: whatsappNumber
        },
        webhooks: config.webhookUrls,
        environment: config
      },
      recommendations: [
        phoneNumberInfo?.voiceUrl ? null : '📞 Configure voice webhook in Twilio Console',
        phoneNumberInfo?.smsUrl ? null : '💬 Configure SMS webhook in Twilio Console',
        whatsappNumber ? null : '📱 Configure WhatsApp number',
        '🔐 Ensure webhooks use HTTPS',
        '✅ Test all endpoints after configuration'
      ].filter(Boolean),
      nextSteps: [
        '1. Go to Twilio Console → Phone Numbers',
        '2. Click on your number (+447488896449)',
        '3. Set Voice webhook: ' + (process.env.TWILIO_VOICE_WEBHOOK_URL || 'Not configured'),
        '4. Set SMS webhook: ' + (process.env.TWILIO_SMS_WEBHOOK_URL || 'Not configured'),
        '5. Save configuration',
        '6. Test by calling/texting your number'
      ]
    })
    
  } catch (error) {
    console.error("[TWILIO-TEST] Error testing configuration:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      configuration: null
    }, { status: 500 })
  }
}
