import { NextResponse } from "next/server"
import { TwilioWebhookValidator } from "@/lib/twilio-webhook-validator"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE] Incoming call to +447488896449")

    // Get form data for call details
    const formData = await request.formData()
    const params: Record<string, any> = {}

    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    // Validate webhook signature (but don't block in development)
    const signature = request.headers.get('X-Twilio-Signature') || ''
    const { valid } = await TwilioWebhookValidator.validateWebhookRequest(request.clone())

    if (!valid && process.env.NODE_ENV === 'production') {
      console.error('[TWILIO-VOICE] Invalid webhook signature in production')
      return new Response('Forbidden', { status: 403 })
    } else if (!valid) {
      console.warn('[TWILIO-VOICE] Invalid webhook signature (allowing in development)')
    }

    const from = params.From
    const to = params.To
    const callSid = params.CallSid

    console.log(`[TWILIO-VOICE] Call from ${from} to ${to}, SID: ${callSid}`)

    // Generate TwiML response - Direct routing to main business number
    // Using Polly voice for better quality and natural sound
    const mainBusinessNumber = process.env.BUSINESS_OWNER_MOBILE || "+447950250970"

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

    return TwilioWebhookValidator.createTwiMLResponse(twimlResponse)

  } catch (error) {
    console.error("[TWILIO-VOICE] Error handling voice call:", error)

    // Fallback TwiML with better voice and proper routing
    const mainBusinessNumber = process.env.BUSINESS_OWNER_MOBILE || "+447950250970"

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB">
        Hello, you've reached ELI MOTORS LTD. Please hold while we connect you.
    </Say>
    <Dial timeout="45" callerId="+447488896449">
        <Number>${mainBusinessNumber}</Number>
    </Dial>
    <Say voice="Polly.Amy" language="en-GB">
        Please leave a message after the tone.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" />
</Response>`

    return new Response(fallbackTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}
