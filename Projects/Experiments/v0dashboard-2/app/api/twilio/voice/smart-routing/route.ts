import { NextResponse } from "next/server"
import { TwilioWebhookValidator } from "@/lib/twilio-webhook-validator"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE-SMART] Smart routing for incoming call")

    // Get form data for call details
    const formData = await request.formData()
    const params: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    const from = params.From
    const to = params.To
    const callSid = params.CallSid

    console.log(`[TWILIO-VOICE-SMART] Call from ${from} to ${to}, SID: ${callSid}`)

    // Check if this might be a verification call from Meta/WhatsApp
    const isVerificationCall = await detectVerificationCall(from, params)
    
    if (isVerificationCall) {
      console.log("[TWILIO-VOICE-SMART] 🔐 Detected verification call - using special handling")
      return handleVerificationCall(params)
    } else {
      console.log("[TWILIO-VOICE-SMART] 📞 Regular customer call - using standard routing")
      return handleRegularCall(params)
    }

  } catch (error) {
    console.error("[TWILIO-VOICE-SMART] Error:", error)
    return handleRegularCall({})
  }
}

async function detectVerificationCall(from: string, params: any): Promise<boolean> {
  // Common patterns for verification calls
  const verificationPatterns = [
    // Meta/Facebook numbers (common patterns)
    /^\+1650/, // Facebook/Meta California numbers
    /^\+1415/, // San Francisco area
    /^\+1844/, // Toll-free numbers often used for verification
    /^\+1855/, // Toll-free
    /^\+1866/, // Toll-free
    /^\+1877/, // Toll-free
    /^\+1888/, // Toll-free
    // International verification services
    /^\+44800/, // UK toll-free
    /^\+353/, // Ireland (where Meta has offices)
    /^\+49/, // Germany (verification services)
  ]

  // Check if the calling number matches verification patterns
  const matchesPattern = verificationPatterns.some(pattern => pattern.test(from))
  
  // Check if we recently requested WhatsApp verification
  try {
    const recentVerificationRequest = await sql`
      SELECT * FROM whatsapp_verification_requests 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    if (recentVerificationRequest.length > 0) {
      console.log("[TWILIO-VOICE-SMART] Recent verification request found")
      return true
    }
  } catch (dbError) {
    console.log("[TWILIO-VOICE-SMART] No verification request table (normal)")
  }

  return matchesPattern
}

function handleVerificationCall(params: any): Response {
  const mainBusinessNumber = process.env.BUSINESS_OWNER_MOBILE || "+447950250970"
  
  // Special TwiML for verification calls
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB" rate="slow">
        This is ELI MOTORS LTD verification line. 
        This call may contain a verification code for WhatsApp Business.
        Recording this call for your convenience.
    </Say>
    <Record maxLength="300" action="/api/twilio/voice/verification-recording" transcribe="true" />
    <Say voice="Polly.Amy" language="en-GB">
        The verification call has been recorded. 
        Now connecting you to receive the code directly.
    </Say>
    <Dial timeout="60" callerId="+447488896449" record="record-from-answer">
        <Number>${mainBusinessNumber}</Number>
    </Dial>
    <Say voice="Polly.Amy" language="en-GB">
        Verification call completed. The code has been recorded for ELI MOTORS LTD.
        Check your verification recordings for the code.
    </Say>
</Response>`

  return new Response(twimlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml'
    }
  })
}

function handleRegularCall(params: any): Response {
  const mainBusinessNumber = process.env.BUSINESS_OWNER_MOBILE || "+447950250970"
  
  // Standard TwiML for regular customer calls
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB">
        Hello, you've reached ELI MOTORS LTD, Hendon's trusted MOT centre since 1979.
        Please hold while we connect you to our team.
    </Say>
    <Dial timeout="45" callerId="+447488896449">
        <Number>${mainBusinessNumber}</Number>
    </Dial>
    <Say voice="Polly.Amy" language="en-GB">
        Sorry, our team is currently busy helping other customers. 
        Please leave your name, phone number, and a brief message after the tone, 
        and we'll call you back as soon as possible.
    </Say>
    <Record maxLength="180" action="/api/twilio/voice/recording" transcribe="true" />
    <Say voice="Polly.Amy" language="en-GB">
        Thank you for calling ELI MOTORS LTD. We'll be in touch soon. Goodbye.
    </Say>
</Response>`

  return new Response(twimlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml'
    }
  })
}
