import { NextResponse } from "next/server"
import { TwilioService } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const { phoneNumber, testMessage = "Test SMS from ELI MOTORS LTD - GarageManager Pro system test" } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Phone number is required"
      }, { status: 400 })
    }

    console.log(`[SMS-TEST] 📱 Testing SMS to ${phoneNumber}`)

    // Format phone number to E.164 if needed
    let formattedNumber = phoneNumber.trim()
    if (formattedNumber.startsWith('07')) {
      formattedNumber = '+44' + formattedNumber.substring(1)
    } else if (formattedNumber.startsWith('447')) {
      formattedNumber = '+' + formattedNumber
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+44' + formattedNumber
    }

    console.log(`[SMS-TEST] 📞 Formatted number: ${formattedNumber}`)

    // Send test SMS
    const result = await TwilioService.sendSMS({
      to: formattedNumber,
      body: testMessage,
      messageType: 'test',
      urgencyLevel: 'low'
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test SMS sent successfully",
        details: {
          to: formattedNumber,
          message_sid: result.messageSid,
          channel: result.channel,
          cost: result.cost || 0.04,
          test_message: testMessage
        },
        next_steps: [
          "Check your phone for the test message",
          "If not received, check Twilio console for delivery status",
          "Verify phone number format and carrier compatibility"
        ]
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to send test SMS",
        details: {
          to: formattedNumber,
          error_message: result.error,
          channel: result.channel
        },
        troubleshooting: [
          "Check Twilio account balance",
          "Verify phone number is valid and can receive SMS",
          "Check Twilio console for detailed error logs",
          "Ensure phone number format is correct (+44...)"
        ]
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[SMS-TEST] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test SMS",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
