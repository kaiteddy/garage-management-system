import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449

    console.log('Checking for verification codes received...')
    console.log('Business Number:', businessNumber)

    // Check for recent SMS messages TO your business number (last 24 hours)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentMessages = await client.messages.list({
      to: businessNumber,
      dateSentAfter: yesterday,
      limit: 20
    })

    // Look for verification codes (typically contain numbers and keywords like "code", "verify", "WhatsApp")
    const verificationMessages = recentMessages.filter(msg => {
      const body = msg.body?.toLowerCase() || ''
      return (
        body.includes('code') ||
        body.includes('verify') ||
        body.includes('verification') ||
        body.includes('whatsapp') ||
        body.includes('facebook') ||
        /\b\d{4,8}\b/.test(body) // Contains 4-8 digit numbers
      )
    })

    // Check all recent messages for any patterns
    const allRecentMessages = recentMessages.map(msg => ({
      sid: msg.sid,
      from: msg.from,
      body: msg.body,
      dateCreated: msg.dateCreated,
      status: msg.status,
      direction: msg.direction,
      isLikelyVerificationCode: (msg.body?.toLowerCase() || '').includes('code') || 
                               (msg.body?.toLowerCase() || '').includes('verify') ||
                               /\b\d{4,8}\b/.test(msg.body || '')
    }))

    // Also check for any messages from WhatsApp/Facebook numbers
    const whatsappSenders = recentMessages.filter(msg => {
      const from = msg.from || ''
      return from.includes('whatsapp') || 
             from.includes('facebook') ||
             from.includes('32665') || // Facebook SMS shortcode
             from.includes('40404')    // Another common verification shortcode
    })

    return NextResponse.json({
      success: true,
      check_time: new Date().toISOString(),
      business_number: businessNumber,
      search_period: "Last 24 hours",
      results: {
        total_messages_received: recentMessages.length,
        verification_messages_found: verificationMessages.length,
        whatsapp_facebook_senders: whatsappSenders.length,
        verification_codes: verificationMessages.map(msg => ({
          sid: msg.sid,
          from: msg.from,
          body: msg.body,
          dateCreated: msg.dateCreated,
          status: msg.status
        })),
        all_recent_messages: allRecentMessages,
        whatsapp_senders: whatsappSenders.map(msg => ({
          sid: msg.sid,
          from: msg.from,
          body: msg.body,
          dateCreated: msg.dateCreated
        }))
      },
      analysis: {
        code_received: verificationMessages.length > 0,
        likely_verification_codes: verificationMessages.map(msg => {
          const codeMatch = msg.body?.match(/\b\d{4,8}\b/)
          return {
            message_sid: msg.sid,
            from: msg.from,
            potential_code: codeMatch ? codeMatch[0] : null,
            full_message: msg.body,
            received_at: msg.dateCreated
          }
        }),
        recommendation: verificationMessages.length > 0 
          ? "Verification code(s) found! Check the messages above."
          : "No verification codes received yet. Rate limiting may still be active."
      }
    })

  } catch (error) {
    console.error('Verification code check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to check for verification codes"
      },
      { status: 500 }
    )
  }
}
