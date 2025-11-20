import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE-RECORDING] Processing voicemail recording")
    
    const formData = await request.formData()
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingSid = formData.get('RecordingSid') as string
    const recordingDuration = formData.get('RecordingDuration') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callSid = formData.get('CallSid') as string
    
    console.log(`[TWILIO-VOICE-RECORDING] Voicemail from ${from}, duration: ${recordingDuration}s`)
    
    // Log the voicemail in database
    try {
      await sql`
        INSERT INTO voicemail_log (
          call_sid,
          recording_sid,
          from_number,
          to_number,
          recording_url,
          duration_seconds,
          received_at,
          status
        ) VALUES (
          ${callSid},
          ${recordingSid},
          ${from},
          ${to},
          ${recordingUrl},
          ${parseInt(recordingDuration) || 0},
          NOW(),
          'new'
        )
      `
      console.log("[TWILIO-VOICE-RECORDING] Voicemail logged to database")
    } catch (dbError) {
      console.error("[TWILIO-VOICE-RECORDING] Database error:", dbError)
      // Continue even if database logging fails
    }
    
    // Send notification (you could integrate with email/SMS here)
    console.log(`[TWILIO-VOICE-RECORDING] New voicemail notification needed for ${from}`)
    
    // Return TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Thank you for your message. ELI MOTORS LTD will call you back as soon as possible during business hours.
        Have a great day!
    </Say>
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })

  } catch (error) {
    console.error("[TWILIO-VOICE-RECORDING] Error processing recording:", error)
    
    // Simple acknowledgment TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Thank you for calling ELI MOTORS LTD. Goodbye.
    </Say>
</Response>`

    return new Response(fallbackTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}

// Create voicemail log table
export async function initializeVoicemailLog() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS voicemail_log (
        id SERIAL PRIMARY KEY,
        call_sid TEXT UNIQUE NOT NULL,
        recording_sid TEXT UNIQUE NOT NULL,
        from_number TEXT NOT NULL,
        to_number TEXT NOT NULL,
        recording_url TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        received_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'new',
        transcription TEXT,
        customer_id TEXT,
        follow_up_notes TEXT,
        processed_at TIMESTAMP,
        processed_by TEXT
      )
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_voicemail_log_from_number ON voicemail_log(from_number)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_voicemail_log_status ON voicemail_log(status)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_voicemail_log_received_at ON voicemail_log(received_at)
    `
    
    console.log("[VOICEMAIL-DB] Voicemail log table initialized")
    return { success: true }
  } catch (error) {
    console.error("[VOICEMAIL-DB] Error initializing voicemail log:", error)
    return { success: false, error: error.message }
  }
}
