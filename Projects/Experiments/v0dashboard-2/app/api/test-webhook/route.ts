import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hubChallenge = searchParams.get('hub.challenge')
  const hubVerifyToken = searchParams.get('hub.verify_token')
  
  console.log(`[TEST-WEBHOOK] Challenge: ${hubChallenge}, Token: ${hubVerifyToken}`)
  
  if (hubChallenge && hubVerifyToken === 'whatsapp_verify_2024_elimotors') {
    console.log('[TEST-WEBHOOK] ✅ Token matches, returning challenge')
    return new Response(hubChallenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  console.log('[TEST-WEBHOOK] ❌ Token mismatch or missing challenge')
  return new Response('Test webhook - token mismatch', { status: 403 })
}
