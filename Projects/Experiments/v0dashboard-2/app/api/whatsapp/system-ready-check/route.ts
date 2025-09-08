import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    console.log('[SYSTEM-CHECK] 🔍 Running comprehensive WhatsApp readiness check...')
    
    const systemCheck = {
      timestamp: new Date().toISOString(),
      deployment: {
        url: 'https://v0dashboard.vercel.app',
        environment: process.env.NODE_ENV,
        vercel_url: process.env.VERCEL_URL
      },
      twilio_config: {
        account_sid: process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing',
        auth_token: process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing',
        phone_number: process.env.TWILIO_PHONE_NUMBER || '❌ Missing',
        whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing'
      },
      connection_test: null,
      phone_number_details: null,
      whatsapp_status: null,
      webhook_urls: {
        sms: 'https://v0dashboard.vercel.app/api/sms/webhook',
        voice: 'https://v0dashboard.vercel.app/api/voice/webhook',
        whatsapp: 'https://v0dashboard.vercel.app/api/whatsapp/webhook',
        status: 'https://v0dashboard.vercel.app/api/twilio/status'
      },
      readiness_score: 0,
      blocking_issues: [],
      recommendations: []
    }

    // Test Twilio connection
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        
        // Get account info
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
        systemCheck.connection_test = {
          status: '✅ Connected',
          account_status: account.status,
          account_type: account.type,
          friendly_name: account.friendlyName
        }
        systemCheck.readiness_score += 25

        // Check phone number details
        if (process.env.TWILIO_PHONE_NUMBER) {
          const phoneNumbers = await client.incomingPhoneNumbers.list({
            phoneNumber: process.env.TWILIO_PHONE_NUMBER
          })
          
          if (phoneNumbers.length > 0) {
            const phoneNumber = phoneNumbers[0]
            systemCheck.phone_number_details = {
              status: '✅ Found in account',
              sid: phoneNumber.sid,
              friendly_name: phoneNumber.friendlyName,
              capabilities: {
                voice: phoneNumber.capabilities.voice ? '✅ Yes' : '❌ No',
                sms: phoneNumber.capabilities.sms ? '✅ Yes' : '❌ No',
                mms: phoneNumber.capabilities.mms ? '✅ Yes' : '❌ No'
              },
              current_webhooks: {
                voice_url: phoneNumber.voiceUrl || '❌ Not set',
                sms_url: phoneNumber.smsUrl || '❌ Not set',
                status_callback: phoneNumber.statusCallback || '❌ Not set'
              }
            }
            
            if (phoneNumber.capabilities.sms) {
              systemCheck.readiness_score += 25
            } else {
              systemCheck.blocking_issues.push('Phone number does not have SMS capabilities - required for WhatsApp verification')
            }
          } else {
            systemCheck.phone_number_details = {
              status: '❌ Not found in account',
              configured_number: process.env.TWILIO_PHONE_NUMBER
            }
            systemCheck.blocking_issues.push('Configured phone number not found in Twilio account')
          }
        } else {
          systemCheck.blocking_issues.push('TWILIO_PHONE_NUMBER environment variable not set')
        }

        // Check for existing WhatsApp senders
        try {
          const senders = await client.messaging.v2.channels.senders.list({ limit: 20 })
          const whatsappSenders = senders.filter(sender => 
            sender.senderId.includes('whatsapp:' + process.env.TWILIO_PHONE_NUMBER)
          )
          
          if (whatsappSenders.length > 0) {
            const sender = whatsappSenders[0]
            systemCheck.whatsapp_status = {
              status: '✅ Already registered',
              sender_sid: sender.sid,
              sender_status: sender.status,
              ready_to_use: sender.status === 'ONLINE'
            }
            systemCheck.readiness_score += 50
          } else {
            systemCheck.whatsapp_status = {
              status: '❌ Not registered',
              needs_registration: true
            }
            systemCheck.recommendations.push('Register WhatsApp sender using Senders API or Twilio Console')
          }
        } catch (senderError) {
          systemCheck.whatsapp_status = {
            status: '❓ Unable to check',
            error: senderError.message
          }
        }

      } catch (error) {
        systemCheck.connection_test = {
          status: '❌ Connection failed',
          error: error.message
        }
        systemCheck.blocking_issues.push(`Twilio connection failed: ${error.message}`)
      }
    } else {
      systemCheck.blocking_issues.push('Twilio credentials not configured')
    }

    // Determine overall readiness
    const isReady = systemCheck.readiness_score >= 75 && systemCheck.blocking_issues.length === 0
    
    return NextResponse.json({
      success: true,
      ready_for_whatsapp: isReady,
      readiness_score: `${systemCheck.readiness_score}/100`,
      system_check: systemCheck,
      next_actions: isReady ? [
        '✅ System is ready for WhatsApp!',
        'You can now register WhatsApp sender',
        'Verification codes should be received automatically'
      ] : [
        '❌ System needs configuration',
        'Fix blocking issues listed above',
        'Re-run this check after fixes'
      ],
      quick_fixes: systemCheck.blocking_issues.length > 0 ? [
        'Verify all environment variables are set correctly',
        'Ensure phone number exists in your Twilio account',
        'Check phone number has SMS capabilities',
        'Confirm Twilio account is active and funded'
      ] : [
        'System looks good - proceed with WhatsApp registration'
      ]
    })

  } catch (error) {
    console.error('[SYSTEM-CHECK] Error:', error)
    return NextResponse.json({
      success: false,
      error: "System check failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'fix-webhooks' } = await request.json()
    
    if (action === 'fix-webhooks') {
      console.log('[SYSTEM-CHECK] Updating webhook URLs to v0dashboard...')
      
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER
      
      if (!phoneNumber) {
        return NextResponse.json({
          success: false,
          error: "Phone number not configured"
        }, { status: 400 })
      }

      // Get the phone number SID
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      })
      
      if (phoneNumbers.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Phone number not found in account"
        }, { status: 404 })
      }

      const phoneNumberSid = phoneNumbers[0].sid
      
      // Update webhooks to use v0dashboard.vercel.app
      const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid).update({
        voiceUrl: 'https://v0dashboard.vercel.app/api/voice/webhook',
        voiceMethod: 'POST',
        smsUrl: 'https://v0dashboard.vercel.app/api/sms/webhook',
        smsMethod: 'POST',
        statusCallback: 'https://v0dashboard.vercel.app/api/twilio/status',
        statusCallbackMethod: 'POST'
      })

      return NextResponse.json({
        success: true,
        message: 'Webhooks updated successfully',
        updated_webhooks: {
          voice_url: updatedNumber.voiceUrl,
          sms_url: updatedNumber.smsUrl,
          status_callback: updatedNumber.statusCallback
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action"
    }, { status: 400 })

  } catch (error) {
    console.error('[SYSTEM-CHECK] POST Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to update system configuration",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
