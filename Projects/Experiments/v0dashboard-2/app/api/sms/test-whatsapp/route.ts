import { NextRequest, NextResponse } from 'next/server'
import { TwilioService } from '@/lib/twilio-service'

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json()

    console.log('[TEST-WHATSAPP] Testing WhatsApp integration')

    if (!TwilioService.isWhatsAppConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp not configured. Please set TWILIO_WHATSAPP_NUMBER in environment variables.',
        configuration: TwilioService.getConfiguration()
      }, { status: 400 })
    }

    // Send test WhatsApp message directly via Twilio API
    const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    const testMessage = message || '🚗 Test WhatsApp from GarageManager Pro\n\n✅ Integration working!\n📱 87.5% cheaper than SMS\n🔔 Perfect for MOT reminders\n\n📞 Book: +447488896449'
    const testTo = to || '+447843275372'

    const twilioMessage = await twilioClient.messages.create({
      body: testMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${testTo}`
    })

    console.log('[TEST-WHATSAPP] Message sent:', twilioMessage.sid)

    return NextResponse.json({
      success: true,
      message: 'Test WhatsApp message sent successfully',
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      to: testTo,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      channel: 'whatsapp',
      cost: 0.005 // Estimated WhatsApp conversation cost
    })

  } catch (error) {
    console.error('[TEST-WHATSAPP] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test WhatsApp integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
