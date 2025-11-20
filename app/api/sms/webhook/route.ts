import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Extract Twilio webhook data
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const messageStatus = formData.get('MessageStatus') as string
    const messageSid = formData.get('MessageSid') as string
    const to = formData.get('To') as string

    console.log("[TWILIO-WEBHOOK] Received SMS:", { from, body, messageStatus })

    // 🎯 CHECK FOR VERIFICATION CODES
    const isVerificationCode = body && /\b\d{6}\b/.test(body)
    const verificationCode = isVerificationCode ? body.match(/\b(\d{6})\b/)?.[1] : null

    if (isVerificationCode && verificationCode) {
      console.log("[TWILIO-WEBHOOK] 🎯 VERIFICATION CODE DETECTED:", verificationCode)
      console.log("[TWILIO-WEBHOOK] 📱 From:", from)
      console.log("[TWILIO-WEBHOOK] 📅 Time:", new Date().toISOString())

      // Store verification code for easy access
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS verification_codes (
            id SERIAL PRIMARY KEY,
            phone_number VARCHAR(20) NOT NULL,
            from_number VARCHAR(20) NOT NULL,
            verification_code VARCHAR(10) NOT NULL,
            message_body TEXT,
            message_sid VARCHAR(50),
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used BOOLEAN DEFAULT FALSE
          )
        `

        await sql`
          INSERT INTO verification_codes (
            phone_number, from_number, verification_code,
            message_body, message_sid, received_at
          ) VALUES (
            ${to}, ${from}, ${verificationCode},
            ${body}, ${messageSid}, CURRENT_TIMESTAMP
          )
        `

        console.log("[TWILIO-WEBHOOK] ✅ Verification code stored in database")
      } catch (dbError) {
        console.error("[TWILIO-WEBHOOK] ❌ Database error:", dbError)
      }
    }

    // Log the webhook for debugging
    await sql`
      CREATE TABLE IF NOT EXISTS sms_webhooks (
        id SERIAL PRIMARY KEY,
        message_sid TEXT,
        from_number TEXT,
        to_number TEXT,
        body TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        processed BOOLEAN DEFAULT FALSE
      )
    `

    await sql`
      INSERT INTO sms_webhooks (message_sid, from_number, to_number, body, status)
      VALUES (${messageSid}, ${from}, ${to}, ${body}, ${messageStatus})
    `

    // If this is an incoming message (not a status update), process the response
    if (body && body.trim()) {
      // Find the most recent MOT reminder sent to this number
      const recentReminder = await sql`
        SELECT vehicle_registration, customer_id
        FROM sms_log
        WHERE to_number = ${from}
        AND message_type = 'mot_reminder'
        ORDER BY sent_at DESC
        LIMIT 1
      `

      const vehicleRegistration = recentReminder.length > 0 ? recentReminder[0].vehicle_registration : null

      // Process the customer response
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/customer-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: from,
          message: body,
          source: 'sms',
          vehicleRegistration
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[TWILIO-WEBHOOK] Response processed:", result)

        // Send appropriate auto-reply
        let autoReply = ""

        if (result.responseType === 'opt_out') {
          autoReply = "You have been unsubscribed from MOT reminders. Thank you."
        } else if (result.responseType === 'sold') {
          autoReply = "Thank you for letting us know. We've updated our records that you no longer own this vehicle."
        } else if (result.responseType === 'add_email') {
          autoReply = "Thank you! We've added your email address to your account. You'll now receive MOT reminders via email too."
        } else if (result.responseType === 'update_phone') {
          autoReply = "Thank you! We've updated your phone number in our records."
        } else if (result.responseType === 'email_request') {
          autoReply = "To add your email, please reply with: EMAIL yourname@email.com (replace with your actual email address)"
        } else if (result.responseType === 'update_contact') {
          autoReply = "Thank you. Please call us on [YOUR_PHONE] to update your contact details, or reply with EMAIL address to add email."
        } else {
          autoReply = "Thank you for your message. We'll review it and get back to you if needed. For urgent matters, please call us."
        }

        // Send auto-reply via Twilio
        if (TwilioService.isConfigured()) {
          const replyResult = await TwilioService.sendAutoReply(from, autoReply)
          console.log(`[TWILIO-WEBHOOK] Auto-reply sent: ${replyResult.success ? 'Success' : 'Failed'}`, replyResult)
        } else {
          console.log("[TWILIO-WEBHOOK] Would send auto-reply (Twilio not configured):", autoReply)
        }
      }
    }

    // Mark webhook as processed
    await sql`
      UPDATE sms_webhooks
      SET processed = TRUE
      WHERE message_sid = ${messageSid}
    `

    // Twilio expects a TwiML response
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response></Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      }
    )

  } catch (error) {
    console.error("[TWILIO-WEBHOOK] Error:", error)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response></Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200
      }
    )
  }
}
