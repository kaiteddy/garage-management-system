import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { testType = 'sms-to-business-number' } = await request.json()
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449
    
    if (testType === 'sms-to-business-number') {
      console.log('[SMS-TEST] Testing SMS reception capability of business number...')
      
      // Send SMS TO the business number to test if it can receive
      const testSMS = await client.messages.create({
        body: `🧪 SMS RECEPTION TEST - ${new Date().toLocaleTimeString()}

This is a test to verify your business number (${businessNumber}) can receive SMS messages.

✅ If you receive this SMS on your business phone, SMS reception is working.
❌ If you don't receive this, there may be an issue with SMS capabilities.

This test is important for WhatsApp verification codes.`,
        from: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886', // Use sandbox number as sender
        to: businessNumber // Send TO the business number
      })

      return NextResponse.json({
        success: true,
        test_type: 'SMS Reception Test',
        message_sent: true,
        test_details: {
          message_sid: testSMS.sid,
          from: testSMS.from,
          to: testSMS.to,
          status: testSMS.status
        },
        instructions: [
          `Check if you received SMS on ${businessNumber}`,
          "If received: ✅ SMS reception works - ready for WhatsApp verification",
          "If not received: ❌ SMS reception issue - need to fix before WhatsApp",
          "WhatsApp verification codes use the same SMS delivery method"
        ],
        next_steps: [
          "Wait 1-2 minutes for SMS delivery",
          "Check your business phone for the test message",
          "If received, proceed with WhatsApp registration",
          "If not received, check phone number configuration"
        ]
      })
    }

    if (testType === 'sms-from-business-number') {
      console.log('[SMS-TEST] Testing SMS sending capability of business number...')
      
      // Send SMS FROM the business number to test if it can send
      const testSMS = await client.messages.create({
        body: `🧪 SMS SENDING TEST - ${new Date().toLocaleTimeString()}

This is a test from your business number ${businessNumber}.

✅ If you receive this SMS, your business number can send SMS.
📱 This confirms outbound SMS capability is working.

Ready for WhatsApp registration!`,
        from: businessNumber, // Send FROM the business number
        to: '+447843275372' // Send to your test number
      })

      return NextResponse.json({
        success: true,
        test_type: 'SMS Sending Test',
        message_sent: true,
        test_details: {
          message_sid: testSMS.sid,
          from: testSMS.from,
          to: testSMS.to,
          status: testSMS.status
        },
        instructions: [
          "Check if you received SMS on +447843275372",
          "If received: ✅ SMS sending works",
          "If not received: ❌ SMS sending issue",
          "Both sending and receiving needed for WhatsApp"
        ]
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid test type",
      valid_types: ['sms-to-business-number', 'sms-from-business-number']
    }, { status: 400 })

  } catch (error) {
    console.error('[SMS-TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: "SMS test failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      possible_causes: [
        "Phone number doesn't have SMS capabilities",
        "Phone number not properly configured",
        "Twilio account issues",
        "Network connectivity problems"
      ]
    }, { status: 500 })
  }
}
