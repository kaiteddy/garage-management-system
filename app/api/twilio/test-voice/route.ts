import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Generate test TwiML to verify voice webhook is working
    const testTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-GB">
        This is a test of the ELI MOTORS LTD voice system. 
        If you can hear this message, your webhook is configured correctly.
        Thank you for calling ELI MOTORS LTD.
    </Say>
</Response>`

    return new Response(testTwiML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST() {
  // Handle actual voice webhook
  return GET()
}
