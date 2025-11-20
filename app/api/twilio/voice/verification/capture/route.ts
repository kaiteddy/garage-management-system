import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE-VERIFICATION-CAPTURE] Processing verification code")

    const formData = await request.formData()
    const digits = formData.get('Digits') as string
    const from = formData.get('From') as string
    const callSid = formData.get('CallSid') as string

    console.log(`[TWILIO-VOICE-VERIFICATION-CAPTURE] Received code: ${digits} from ${from}`)

    // Store the verification code in database for reference
    try {
      await sql`
        INSERT INTO verification_codes (
          phone_number,
          verification_code,
          call_sid,
          received_at,
          source
        ) VALUES (
          ${from},
          ${digits},
          ${callSid},
          NOW(),
          'voice_call'
        )
        ON CONFLICT (phone_number) 
        DO UPDATE SET 
          verification_code = ${digits},
          call_sid = ${callSid},
          received_at = NOW()
      `
    } catch (dbError) {
      console.log("[TWILIO-VOICE-VERIFICATION-CAPTURE] Database storage failed (table may not exist)")
    }

    // Confirm the code back to the caller
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB" rate="slow">
        Thank you. You entered the code: ${digits.split('').join(', ')}.
        This verification code has been recorded for ELI MOTORS LTD.
    </Say>
    <Pause length="1"/>
    <Say voice="Polly.Amy" language="en-GB">
        If this code is correct, you can now use it for your verification process.
        If you need to speak to someone about this verification, please hold.
    </Say>
    <Dial timeout="30" callerId="+447488896449">
        <Number>${process.env.BUSINESS_OWNER_MOBILE || "+447950250970"}</Number>
    </Dial>
    <Say voice="Polly.Amy" language="en-GB">
        Thank you for calling ELI MOTORS LTD. Your verification code ${digits} has been recorded.
        Goodbye.
    </Say>
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })

  } catch (error) {
    console.error("[TWILIO-VOICE-VERIFICATION-CAPTURE] Error:", error)

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB">
        Sorry, there was an error processing your verification code.
        Please hold while we connect you to our team.
    </Say>
    <Dial timeout="30">
        <Number>${process.env.BUSINESS_OWNER_MOBILE || "+447950250970"}</Number>
    </Dial>
</Response>`

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}
