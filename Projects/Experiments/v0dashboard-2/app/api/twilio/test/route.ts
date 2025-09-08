import { NextResponse } from "next/server"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

export async function POST() {
  try {
    console.log('[TWILIO-TEST] Testing Twilio connection...')

    // Check if credentials are configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json({
        success: false,
        error: 'Twilio credentials not configured',
        missing: {
          accountSid: !TWILIO_ACCOUNT_SID,
          authToken: !TWILIO_AUTH_TOKEN,
          phoneNumber: !TWILIO_PHONE_NUMBER
        }
      }, { status: 400 })
    }

    // Initialize Twilio client
    const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    // Test 1: Validate account
    console.log('[TWILIO-TEST] Validating account...')
    const account = await twilio.api.accounts(TWILIO_ACCOUNT_SID).fetch()
    
    // Test 2: Validate phone number
    console.log('[TWILIO-TEST] Validating phone number...')
    const phoneNumber = await twilio.incomingPhoneNumbers.list({
      phoneNumber: TWILIO_PHONE_NUMBER,
      limit: 1
    })

    // Test 3: Check account balance
    console.log('[TWILIO-TEST] Checking account balance...')
    const balance = await twilio.balance.fetch()

    const testResults = {
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      },
      phoneNumber: {
        configured: TWILIO_PHONE_NUMBER,
        found: phoneNumber.length > 0,
        details: phoneNumber.length > 0 ? {
          sid: phoneNumber[0].sid,
          capabilities: phoneNumber[0].capabilities
        } : null
      },
      balance: {
        currency: balance.currency,
        balance: balance.balance
      },
      timestamp: new Date().toISOString()
    }

    console.log('[TWILIO-TEST] Connection test successful')

    return NextResponse.json({
      success: true,
      message: 'Twilio connection test successful',
      results: testResults
    })

  } catch (error) {
    console.error('[TWILIO-TEST] Connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
