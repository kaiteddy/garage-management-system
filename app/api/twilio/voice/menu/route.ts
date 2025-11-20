import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[TWILIO-VOICE-MENU] Processing menu selection")
    
    const formData = await request.formData()
    const digits = formData.get('Digits') as string
    const from = formData.get('From') as string
    const callSid = formData.get('CallSid') as string
    
    console.log(`[TWILIO-VOICE-MENU] Caller ${from} pressed ${digits}`)
    
    let twimlResponse = ''
    
    switch (digits) {
      case '1': // MOT reminder inquiry
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Thank you for calling about your MOT reminder. 
        You'll be connected to our MOT booking team now.
        Please have your vehicle registration number ready.
    </Say>
    <Dial timeout="30">
        <!-- Replace with your MOT booking line -->
        <Number>+447488896449</Number>
    </Dial>
    <Say voice="alice" language="en-GB">
        Our MOT team is currently busy. Please leave your name, phone number, 
        vehicle registration, and preferred appointment time after the tone.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" />
    <Say voice="alice" language="en-GB">
        Thank you. ELI MOTORS LTD will call you back within 2 hours during business hours.
    </Say>
</Response>`
        break
        
      case '2': // MOT bookings
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Thank you for choosing ELI MOTORS LTD for your MOT test.
        You'll be connected to our booking team now.
    </Say>
    <Dial timeout="30">
        <!-- Replace with your booking line -->
        <Number>+447488896449</Number>
    </Dial>
    <Say voice="alice" language="en-GB">
        Our booking team is currently busy. Please leave your name, phone number, 
        vehicle registration, and preferred appointment time after the tone.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" />
    <Say voice="alice" language="en-GB">
        Thank you. We'll call you back to confirm your MOT appointment.
    </Say>
</Response>`
        break
        
      case '3': // Service inquiries
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Thank you for your service inquiry. 
        You'll be connected to our service team now.
    </Say>
    <Dial timeout="30">
        <!-- Replace with your service line -->
        <Number>+447488896449</Number>
    </Dial>
    <Say voice="alice" language="en-GB">
        Our service team is currently busy. Please leave your name, phone number, 
        and details about your service requirements after the tone.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" />
    <Say voice="alice" language="en-GB">
        Thank you. ELI MOTORS LTD will call you back to discuss your service needs.
    </Say>
</Response>`
        break
        
      case '0': // Speak to someone immediately
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Connecting you to ELI MOTORS LTD now.
    </Say>
    <Dial timeout="45">
        <!-- Replace with your main business number -->
        <Number>+447488896449</Number>
    </Dial>
    <Say voice="alice" language="en-GB">
        Sorry, no one is available right now. Please leave a detailed message 
        and we'll call you back as soon as possible.
    </Say>
    <Record maxLength="180" action="/api/twilio/voice/recording" />
    <Say voice="alice" language="en-GB">
        Thank you for calling ELI MOTORS LTD. We'll call you back soon.
    </Say>
</Response>`
        break
        
      default: // Invalid selection
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Sorry, that's not a valid selection. Let me connect you to our team.
    </Say>
    <Dial timeout="30">
        <Number>+447488896449</Number>
    </Dial>
    <Say voice="alice" language="en-GB">
        Please leave a message after the tone.
    </Say>
    <Record maxLength="120" action="/api/twilio/voice/recording" />
</Response>`
        break
    }
    
    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })

  } catch (error) {
    console.error("[TWILIO-VOICE-MENU] Error processing menu:", error)
    
    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        Connecting you to ELI MOTORS LTD.
    </Say>
    <Dial>+447488896449</Dial>
</Response>`

    return new Response(fallbackTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  }
}
