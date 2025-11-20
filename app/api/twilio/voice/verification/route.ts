import { NextResponse } from "next/server"
import { TwilioWebhookValidator } from "@/lib/twilio-webhook-validator"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE-VERIFICATION] Handling verification code call")

    // Get form data for call details
    const formData = await request.formData()
    const params: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    const from = params.From
    const to = params.To
    const callSid = params.CallSid

    console.log(`[TWILIO-VOICE-VERIFICATION] Verification call from ${from} to ${to}, SID: ${callSid}`)

    // Special handling for verification codes
    // This provides a clear, slow voice for verification codes
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB" rate="slow">
        Hello, this is a verification code call for ELI MOTORS LTD.
        Please listen carefully and write down the verification code.
    </Say>
    <Pause length="2"/>
    <Gather numDigits="6" action="/api/twilio/voice/verification/capture" timeout="30" finishOnKey="#">
        <Say voice="Polly.Amy" language="en-GB" rate="slow">
            Please enter the 6-digit verification code you received, followed by the hash key.
            If you need to hear this message again, please wait.
        </Say>
    </Gather>
    <Say voice="Polly.Amy" language="en-GB">
        We didn't receive the verification code. Let me connect you to our team for assistance.
    </Say>
    <Dial timeout="45" callerId="+447488896449">
        <Number>${process.env.BUSINESS_OWNER_MOBILE || "+447950250970"}</Number>
    </Dial>
    <Say voice="Polly.Amy" language="en-GB">
        Please leave a message about the verification code you need help with.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" transcribe="true" />
</Response>`

    return TwilioWebhookValidator.createTwiMLResponse(twimlResponse)

  } catch (error) {
    console.error("[TWILIO-VOICE-VERIFICATION] Error:", error)

    // Simple fallback for verification
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB">
        This is ELI MOTORS LTD verification line. Please hold while we connect you.
    </Say>
    <Dial timeout="45">
        <Number>${process.env.BUSINESS_OWNER_MOBILE || "+447950250970"}</Number>
    </Dial>
</Response>`

    return new Response(fallbackTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}
