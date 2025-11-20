import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFICATION-CODES] 🔍 Checking for verification codes...")

    // Get all verification codes from the last hour
    const codes = await sql`
      SELECT 
        id,
        phone_number,
        from_number,
        verification_code,
        message_body,
        message_sid,
        received_at,
        used
      FROM verification_codes 
      WHERE received_at > NOW() - INTERVAL '1 hour'
      ORDER BY received_at DESC
    `

    // Also check recent SMS webhooks for any verification patterns
    const recentSMS = await sql`
      SELECT 
        message_sid,
        from_number,
        to_number,
        body,
        status,
        created_at
      FROM sms_webhooks 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      AND body ~ '\\d{6}'
      ORDER BY created_at DESC
    `

    console.log(`[VERIFICATION-CODES] Found ${codes.length} verification codes and ${recentSMS.length} potential SMS codes`)

    return NextResponse.json({
      success: true,
      verification_codes: codes.map(code => ({
        id: code.id,
        phone_number: code.phone_number,
        from_number: code.from_number,
        verification_code: code.verification_code,
        message_body: code.message_body,
        received_at: code.received_at,
        used: code.used,
        time_ago: getTimeAgo(new Date(code.received_at))
      })),
      recent_sms_with_codes: recentSMS.map(sms => ({
        message_sid: sms.message_sid,
        from_number: sms.from_number,
        to_number: sms.to_number,
        body: sms.body,
        status: sms.status,
        created_at: sms.created_at,
        time_ago: getTimeAgo(new Date(sms.created_at)),
        potential_codes: extractCodes(sms.body)
      })),
      summary: {
        total_verification_codes: codes.length,
        unused_codes: codes.filter(c => !c.used).length,
        recent_sms_count: recentSMS.length,
        latest_code: codes.length > 0 ? codes[0].verification_code : null,
        latest_code_time: codes.length > 0 ? codes[0].received_at : null
      },
      instructions: {
        facebook_verification: "If you see a 6-digit code above, use it in Facebook WhatsApp verification",
        webhook_status: "Webhook is active and monitoring for verification codes",
        next_steps: [
          "Check the codes above",
          "Enter the latest code in Facebook",
          "If no codes, update Twilio webhook URL to: https://garage-manager.eu.ngrok.io/api/sms/webhook"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFICATION-CODES] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve verification codes",
      details: error.message
    }, { status: 500 })
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minutes ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} days ago`
}

function extractCodes(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\b\d{6}\b/g)
  return matches || []
}
