import { NextResponse } from "next/server"

/**
 * Twilio Webhook Guard
 *
 * GET /api/maintenance/twilio-webhook-guard
 * - Returns current base URL and the expected Twilio/WhatsApp webhook URL paths so you can verify
 *   they remain stable across deployments. Useful to quickly confirm WhatsApp config won’t break.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 'http://localhost:3000'

  const endpoints = {
    whatsapp: `${baseUrl}/api/whatsapp/webhook`,
    sms: `${baseUrl}/api/sms/webhook`,
    voice: `${baseUrl}/api/twilio/voice/smart-routing`,
    statusCallback: `${baseUrl}/api/twilio/status-callback`
  }

  return NextResponse.json({
    success: true,
    baseUrl,
    endpoints,
    note: "Keep NEXT_PUBLIC_APP_URL set to your stable custom domain so these URLs don’t change on each Vercel deployment."
  })
}

