import { NextResponse } from "next/server"
import twilio from 'twilio'

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials not configured"
      }, { status: 500 })
    }
    
    const client = twilio(accountSid, authToken)
    
    // Get recent messages to your Twilio number
    const messages = await client.messages.list({
      to: '+447488896449',
      limit: 10,
      dateSentAfter: new Date(Date.now() - 60 * 60 * 1000) // Last hour
    })
    
    const recentMessages = messages.map(message => ({
      sid: message.sid,
      from: message.from,
      to: message.to,
      body: message.body,
      dateSent: message.dateSent,
      direction: message.direction,
      status: message.status
    }))
    
    return NextResponse.json({
      success: true,
      messages: recentMessages,
      count: recentMessages.length
    })
    
  } catch (error) {
    console.error("[TWILIO-SMS] Error fetching recent messages:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
