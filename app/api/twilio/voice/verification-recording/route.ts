import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VERIFICATION-RECORDING] Processing verification recording")

    const formData = await request.formData()
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingSid = formData.get('RecordingSid') as string
    const transcriptionText = formData.get('TranscriptionText') as string
    const from = formData.get('From') as string
    const callSid = formData.get('CallSid') as string

    console.log(`[TWILIO-VERIFICATION-RECORDING] Recording SID: ${recordingSid}`)
    console.log(`[TWILIO-VERIFICATION-RECORDING] Transcription: ${transcriptionText}`)

    // Extract potential verification codes from transcription
    const codeMatches = transcriptionText?.match(/\b\d{6}\b/g) || []
    const potentialCodes = codeMatches.filter(code => code.length === 6)

    console.log(`[TWILIO-VERIFICATION-RECORDING] Potential codes found: ${potentialCodes.join(', ')}`)

    // Store the verification recording
    try {
      await sql`
        INSERT INTO verification_recordings (
          recording_sid,
          recording_url,
          transcription_text,
          potential_codes,
          from_number,
          call_sid,
          created_at
        ) VALUES (
          ${recordingSid},
          ${recordingUrl},
          ${transcriptionText || ''},
          ${JSON.stringify(potentialCodes)},
          ${from},
          ${callSid},
          NOW()
        )
      `
      
      console.log("[TWILIO-VERIFICATION-RECORDING] ✅ Verification recording saved to database")
    } catch (dbError) {
      console.log("[TWILIO-VERIFICATION-RECORDING] Database save failed (table may not exist)")
      console.log("Recording details:", { recordingSid, recordingUrl, transcriptionText, potentialCodes })
    }

    // If we found potential codes, log them prominently
    if (potentialCodes.length > 0) {
      console.log("🔐 VERIFICATION CODES DETECTED:")
      potentialCodes.forEach((code, index) => {
        console.log(`   Code ${index + 1}: ${code}`)
      })
    }

    // Continue with the call flow
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${potentialCodes.length > 0 ? `
    <Say voice="Polly.Amy" language="en-GB" rate="slow">
        Verification code detected: ${potentialCodes[0].split('').join(', ')}.
        This code has been recorded for ELI MOTORS LTD.
    </Say>
    ` : `
    <Say voice="Polly.Amy" language="en-GB">
        Verification call recorded. Please check the recording for your code.
    </Say>
    `}
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })

  } catch (error) {
    console.error("[TWILIO-VERIFICATION-RECORDING] Error:", error)

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Amy" language="en-GB">
        Verification recording processed. Please check your Twilio console for details.
    </Say>
</Response>`

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}
