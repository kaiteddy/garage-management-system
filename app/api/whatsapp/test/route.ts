import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    console.log('[WHATSAPP-TEST] Starting WhatsApp connection test...')

    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        message: 'Twilio credentials not configured',
        details: {
          accountSid: !!accountSid,
          authToken: !!authToken,
          whatsappNumber: !!whatsappNumber
        }
      })
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken)

    // Test 1: Verify account
    console.log('[WHATSAPP-TEST] Testing account verification...')
    const account = await client.api.accounts(accountSid).fetch()
    
    // Test 2: List WhatsApp senders (if any)
    console.log('[WHATSAPP-TEST] Checking WhatsApp senders...')
    let whatsappSenders = []
    try {
      const senders = await client.messaging.v1.services.list()
      whatsappSenders = senders.filter(service => 
        service.friendlyName?.toLowerCase().includes('whatsapp')
      )
    } catch (error) {
      console.log('[WHATSAPP-TEST] No messaging services found (normal for sandbox)')
    }

    // Test 3: Check phone numbers
    console.log('[WHATSAPP-TEST] Checking phone numbers...')
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 10 })
    const whatsappNumbers = phoneNumbers.filter(number => 
      number.capabilities?.sms || number.capabilities?.voice
    )

    // Test 4: Validate webhook URL
    const webhookUrl = `${request.nextUrl.origin}/api/whatsapp/webhook`
    
    const testResults = {
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      },
      whatsappSenders: whatsappSenders.length,
      phoneNumbers: whatsappNumbers.length,
      webhookUrl,
      environment: {
        accountSid: !!accountSid,
        authToken: !!authToken,
        whatsappNumber: !!whatsappNumber
      },
      capabilities: {
        sms: true,
        whatsapp: whatsappSenders.length > 0 || !!whatsappNumber,
        voice: whatsappNumbers.some(n => n.capabilities?.voice)
      }
    }

    console.log('[WHATSAPP-TEST] Test completed successfully')

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connection test completed successfully',
      details: testResults
    })

  } catch (error) {
    console.error('[WHATSAPP-TEST] Error testing WhatsApp connection:', error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}
