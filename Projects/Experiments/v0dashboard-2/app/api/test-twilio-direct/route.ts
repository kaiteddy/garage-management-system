import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json()
    
    console.log("[TEST-TWILIO-DIRECT] Testing direct Twilio integration...")
    
    // Read environment variables directly
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    
    console.log("[TEST-TWILIO-DIRECT] Environment check:", {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'Missing',
      authToken: authToken ? 'Present' : 'Missing',
      phoneNumber: phoneNumber || 'Missing'
    })
    
    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials not configured",
        env_check: {
          accountSid: !!accountSid,
          authToken: !!authToken,
          phoneNumber: !!phoneNumber
        }
      }, { status: 400 })
    }
    
    // Initialize Twilio client
    const client = twilio(accountSid, authToken)
    
    // Test connection first
    console.log("[TEST-TWILIO-DIRECT] Testing Twilio connection...")
    const account = await client.api.accounts(accountSid).fetch()
    console.log("[TEST-TWILIO-DIRECT] Account status:", account.status)
    
    // Send test message
    const testMessage = message || `🧪 TEST MESSAGE from ELI MOTORS LTD\n\nThis is a test of the WhatsApp/SMS system.\n\n✅ Integration is working!\n\nELI MOTORS LTD - Serving Hendon since 1979`
    
    console.log("[TEST-TWILIO-DIRECT] Sending message to:", to)
    
    const twilioMessage = await client.messages.create({
      body: testMessage,
      from: phoneNumber,
      to: to
    })
    
    console.log("[TEST-TWILIO-DIRECT] Message sent successfully:", twilioMessage.sid)
    
    return NextResponse.json({
      success: true,
      message: "Test message sent successfully!",
      details: {
        messageSid: twilioMessage.sid,
        to: twilioMessage.to,
        from: twilioMessage.from,
        status: twilioMessage.status,
        accountStatus: account.status
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[TEST-TWILIO-DIRECT] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Direct Twilio test endpoint",
    usage: {
      method: "POST",
      body: {
        to: "Customer phone number (e.g., +447843275372)",
        message: "Optional custom message"
      }
    }
  })
}
