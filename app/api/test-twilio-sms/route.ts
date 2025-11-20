import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Test sending SMS to your Twilio number to verify it can receive
    const message = await client.messages.create({
      body: 'Test SMS to verify Twilio number can receive messages - ELI MOTORS LTD',
      from: process.env.TWILIO_PHONE_NUMBER, // +447488896449
      to: process.env.BUSINESS_OWNER_MOBILE // +447950250970 (Eli's personal)
    })

    console.log('Test SMS sent:', message.sid)

    // Also check recent messages to the Twilio number
    const recentMessages = await client.messages.list({
      to: process.env.TWILIO_PHONE_NUMBER,
      limit: 10
    })

    return NextResponse.json({
      success: true,
      test_message_sid: message.sid,
      twilio_number: process.env.TWILIO_PHONE_NUMBER,
      recent_messages_to_twilio_number: recentMessages.map(msg => ({
        sid: msg.sid,
        from: msg.from,
        body: msg.body,
        dateCreated: msg.dateCreated,
        status: msg.status
      }))
    })

  } catch (error) {
    console.error('Twilio test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        twilio_number: process.env.TWILIO_PHONE_NUMBER
      },
      { status: 500 }
    )
  }
}
