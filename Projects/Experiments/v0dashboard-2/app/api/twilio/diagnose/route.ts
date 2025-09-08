import { NextResponse } from "next/server"
import twilio from 'twilio'

export async function GET() {
  try {
    console.log("[TWILIO-DIAGNOSE] Running comprehensive Twilio diagnostics...")
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL,
        publicAppUrl: process.env.NEXT_PUBLIC_APP_URL
      },
      credentials: {
        accountSid: accountSid ? `✅ Set (${accountSid.substring(0, 8)}...)` : '❌ Missing',
        authToken: authToken ? '✅ Set (hidden)' : '❌ Missing',
        phoneNumber: phoneNumber || '❌ Missing',
        whatsappNumber: whatsappNumber || '❌ Missing'
      },
      connection: null,
      phoneNumberDetails: null,
      webhookStatus: null,
      recommendations: [],
      errors: []
    }
    
    // Determine base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'https://garagemanagerpro.vercel.app'
    
    diagnostics.environment.detectedBaseUrl = baseUrl
    
    // Test Twilio connection
    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken)
        
        // Test account access
        const account = await client.api.accounts(accountSid).fetch()
        diagnostics.connection = {
          status: '✅ Connected',
          accountStatus: account.status,
          accountType: account.type,
          friendlyName: account.friendlyName
        }
        
        // Get phone number details
        if (phoneNumber) {
          try {
            const phoneNumbers = await client.incomingPhoneNumbers.list({
              phoneNumber: phoneNumber,
              limit: 1
            })
            
            if (phoneNumbers.length > 0) {
              const phone = phoneNumbers[0]
              diagnostics.phoneNumberDetails = {
                sid: phone.sid,
                phoneNumber: phone.phoneNumber,
                friendlyName: phone.friendlyName,
                capabilities: phone.capabilities,
                voiceUrl: phone.voiceUrl,
                voiceMethod: phone.voiceMethod,
                smsUrl: phone.smsUrl,
                smsMethod: phone.smsMethod,
                statusCallback: phone.statusCallback,
                statusCallbackMethod: phone.statusCallbackMethod
              }
              
              // Check webhook configuration
              const expectedWebhooks = {
                voice: `${baseUrl}/api/twilio/voice`,
                sms: `${baseUrl}/api/sms/webhook`,
                statusCallback: `${baseUrl}/api/twilio/status-callback`
              }
              
              diagnostics.webhookStatus = {
                expected: expectedWebhooks,
                current: {
                  voice: phone.voiceUrl,
                  sms: phone.smsUrl,
                  statusCallback: phone.statusCallback
                },
                matches: {
                  voice: phone.voiceUrl === expectedWebhooks.voice,
                  sms: phone.smsUrl === expectedWebhooks.sms,
                  statusCallback: phone.statusCallback === expectedWebhooks.statusCallback
                }
              }
              
              // Generate recommendations
              if (!diagnostics.webhookStatus.matches.voice) {
                diagnostics.recommendations.push(`🔧 Voice webhook needs update: ${phone.voiceUrl} → ${expectedWebhooks.voice}`)
              }
              if (!diagnostics.webhookStatus.matches.sms) {
                diagnostics.recommendations.push(`🔧 SMS webhook needs update: ${phone.smsUrl} → ${expectedWebhooks.sms}`)
              }
              if (!diagnostics.webhookStatus.matches.statusCallback) {
                diagnostics.recommendations.push(`🔧 Status callback needs update: ${phone.statusCallback} → ${expectedWebhooks.statusCallback}`)
              }
              
              if (diagnostics.recommendations.length === 0) {
                diagnostics.recommendations.push('✅ All webhooks are correctly configured!')
              }
              
            } else {
              diagnostics.errors.push(`❌ Phone number ${phoneNumber} not found in Twilio account`)
              diagnostics.recommendations.push('📞 Verify phone number is correct and exists in your Twilio account')
            }
          } catch (error) {
            diagnostics.errors.push(`❌ Error fetching phone number details: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        } else {
          diagnostics.recommendations.push('📞 Configure TWILIO_PHONE_NUMBER environment variable')
        }
        
        // Test recent messages
        try {
          const recentMessages = await client.messages.list({
            limit: 5,
            dateSentAfter: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          })
          
          diagnostics.recentActivity = {
            messageCount: recentMessages.length,
            messages: recentMessages.map(msg => ({
              sid: msg.sid,
              from: msg.from,
              to: msg.to,
              status: msg.status,
              direction: msg.direction,
              dateSent: msg.dateSent
            }))
          }
        } catch (error) {
          diagnostics.errors.push(`⚠️ Could not fetch recent messages: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        
      } catch (error) {
        diagnostics.connection = {
          status: '❌ Connection failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        diagnostics.errors.push(`❌ Twilio connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        diagnostics.recommendations.push('🔐 Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct')
      }
    } else {
      diagnostics.connection = {
        status: '❌ No credentials'
      }
      diagnostics.recommendations.push('🔐 Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables')
    }
    
    // Environment-specific recommendations
    if (process.env.NODE_ENV === 'development') {
      diagnostics.recommendations.push('🚀 For production deployment, ensure environment variables are set in Vercel')
    }
    
    if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
      diagnostics.recommendations.push('🌐 Set NEXT_PUBLIC_APP_URL for consistent webhook URLs')
    }
    
    return NextResponse.json({
      success: true,
      diagnostics: diagnostics
    })
    
  } catch (error) {
    console.error('[TWILIO-DIAGNOSE] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
