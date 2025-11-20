import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Check WhatsApp sandbox status
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER // whatsapp:+14155238886
    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449

    console.log('Checking WhatsApp configuration...')
    console.log('WhatsApp Sandbox Number:', whatsappNumber)
    console.log('Business Number:', businessNumber)

    // Check recent WhatsApp messages
    const whatsappMessages = await client.messages.list({
      from: whatsappNumber,
      limit: 10
    })

    // Check recent SMS messages to business number
    const smsToBusinessNumber = await client.messages.list({
      to: businessNumber,
      limit: 10
    })

    // Check recent SMS messages from business number
    const smsFromBusinessNumber = await client.messages.list({
      from: businessNumber,
      limit: 10
    })

    // Get account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()

    return NextResponse.json({
      success: true,
      configuration: {
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
        business_number: businessNumber,
        whatsapp_sandbox: whatsappNumber,
        account_status: account.status,
        account_type: account.type
      },
      message_analysis: {
        whatsapp_messages_sent: whatsappMessages.length,
        sms_to_business_number: smsToBusinessNumber.length,
        sms_from_business_number: smsFromBusinessNumber.length,
        recent_whatsapp_messages: whatsappMessages.map(msg => ({
          sid: msg.sid,
          to: msg.to,
          body: msg.body?.substring(0, 100) + '...',
          status: msg.status,
          dateCreated: msg.dateCreated,
          errorCode: msg.errorCode,
          errorMessage: msg.errorMessage
        })),
        recent_sms_to_business: smsToBusinessNumber.map(msg => ({
          sid: msg.sid,
          from: msg.from,
          body: msg.body?.substring(0, 100) + '...',
          status: msg.status,
          dateCreated: msg.dateCreated
        })),
        recent_sms_from_business: smsFromBusinessNumber.map(msg => ({
          sid: msg.sid,
          to: msg.to,
          body: msg.body?.substring(0, 100) + '...',
          status: msg.status,
          dateCreated: msg.dateCreated
        }))
      },
      whatsapp_verification_issue: {
        likely_cause: "WhatsApp Business verification rate limiting",
        explanation: "WhatsApp limits verification attempts to prevent spam. Multiple attempts in short time trigger rate limiting.",
        recommended_actions: [
          "Wait 24-48 hours before trying again",
          "Use exact format: +447488896449",
          "Try during business hours (9 AM - 5 PM GMT)",
          "Contact Facebook Business Support if issue persists"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('WhatsApp diagnostic error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to run WhatsApp diagnostic"
      },
      { status: 500 }
    )
  }
}
