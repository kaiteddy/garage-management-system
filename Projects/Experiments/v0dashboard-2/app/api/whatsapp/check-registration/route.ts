import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449
    
    console.log('[WHATSAPP-CHECK] Checking if phone number is already registered with WhatsApp...')

    // Check if number is already registered by trying to send a test message
    try {
      const testMessage = await client.messages.create({
        body: 'Test message to check WhatsApp registration status',
        from: `whatsapp:${businessNumber}`,
        to: 'whatsapp:+447843275372'
      })

      return NextResponse.json({
        success: true,
        already_registered: true,
        phone_number: businessNumber,
        test_message_sid: testMessage.sid,
        status: "Phone number is already registered with WhatsApp",
        explanation: "The test message was sent successfully, indicating the number is registered",
        next_steps: [
          "Your number is already working with WhatsApp",
          "No verification needed",
          "You can start sending WhatsApp messages immediately"
        ]
      })

    } catch (error) {
      // If we get error 63110, the number is already registered elsewhere
      if (error.code === 63110) {
        return NextResponse.json({
          success: false,
          already_registered: true,
          phone_number: businessNumber,
          error_code: error.code,
          status: "Number registered with different WhatsApp Business Platform",
          explanation: "Your phone number is already registered with WhatsApp on a different platform",
          solution: [
            "You need to unregister the number from the other platform first",
            "Or disable Two-Factor Authentication on the other platform",
            "Then try registering with Twilio again"
          ],
          troubleshooting: [
            "Check if number is registered in WhatsApp Business app",
            "Check if number is registered with another WhatsApp Business Platform",
            "Contact the other platform to disable 2FA for this number"
          ]
        })
      }

      // Check for other specific WhatsApp errors
      if (error.code === 63016) {
        return NextResponse.json({
          success: false,
          already_registered: false,
          phone_number: businessNumber,
          error_code: error.code,
          status: "Number not registered with WhatsApp",
          explanation: "The number is not registered as a WhatsApp sender",
          next_steps: [
            "Register the number using Senders API",
            "Or register through Twilio Console",
            "Verification codes will be sent during registration"
          ]
        })
      }

      // Generic error handling
      return NextResponse.json({
        success: false,
        already_registered: false,
        phone_number: businessNumber,
        error_code: error.code || 'unknown',
        error_message: error.message,
        status: "Unable to determine registration status",
        possible_issues: [
          "Phone number may not have SMS capabilities",
          "Phone number may be invalid format",
          "Twilio account may not have WhatsApp permissions",
          "Network or API issues"
        ],
        next_steps: [
          "Check phone number format (E.164)",
          "Verify phone number has SMS capabilities",
          "Check Twilio account permissions",
          "Try registration through Twilio Console"
        ]
      })
    }

  } catch (error) {
    console.error('[WHATSAPP-CHECK] Error checking registration:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check WhatsApp registration status",
      details: error instanceof Error ? error.message : 'Unknown error',
      phone_number: process.env.TWILIO_PHONE_NUMBER
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Phone number is required"
      }, { status: 400 })
    }

    // Test if a specific phone number is registered with WhatsApp
    // by opening WhatsApp web link
    const whatsappTestUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=test`
    
    return NextResponse.json({
      success: true,
      phone_number: phoneNumber,
      test_method: "Manual verification required",
      instructions: [
        `Open this URL: ${whatsappTestUrl}`,
        "If WhatsApp opens and shows a chat, the number is registered",
        "If you get an error, the number is not registered with WhatsApp"
      ],
      test_url: whatsappTestUrl
    })

  } catch (error) {
    console.error('[WHATSAPP-CHECK] Error in POST:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check phone number",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
