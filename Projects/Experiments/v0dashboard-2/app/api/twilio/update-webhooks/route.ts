import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[UPDATE-WEBHOOKS] Updating Twilio phone number webhooks...')

    // Get the production webhook URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'https://garagemanager-4cbsv5uqm-kaisarkinnovations.vercel.app'

    const voiceWebhookUrl = `${baseUrl}/api/twilio/voice/smart-routing`
    const smsWebhookUrl = `${baseUrl}/api/sms/webhook`
    const statusCallbackUrl = `${baseUrl}/api/twilio/status-callback`
    const whatsappWebhookUrl = `${baseUrl}/api/whatsapp/webhook`

    // Find the business phone number
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num =>
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    if (!businessNumber) {
      return NextResponse.json({
        success: false,
        error: "Business phone number not found in Twilio account",
        searched_for: process.env.TWILIO_PHONE_NUMBER
      }, { status: 404 })
    }

    console.log(`[UPDATE-WEBHOOKS] Found business number: ${businessNumber.phoneNumber} (${businessNumber.sid})`)
    console.log(`[UPDATE-WEBHOOKS] Base URL: ${baseUrl}`)
    console.log(`[UPDATE-WEBHOOKS] Current voice URL: ${businessNumber.voiceUrl}`)
    console.log(`[UPDATE-WEBHOOKS] New voice URL: ${voiceWebhookUrl}`)
    console.log(`[UPDATE-WEBHOOKS] Current SMS URL: ${businessNumber.smsUrl}`)
    console.log(`[UPDATE-WEBHOOKS] New SMS URL: ${smsWebhookUrl}`)

    // Update the phone number configuration
    const updatedNumber = await client
      .incomingPhoneNumbers(businessNumber.sid)
      .update({
        voiceUrl: voiceWebhookUrl,
        voiceMethod: 'POST',
        smsUrl: smsWebhookUrl,
        smsMethod: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST'
      })

    console.log('[UPDATE-WEBHOOKS] Phone number webhooks updated successfully')

    return NextResponse.json({
      success: true,
      message: "Twilio phone number webhooks updated successfully",
      phone_number: updatedNumber.phoneNumber,
      base_url: baseUrl,
      webhook_urls: {
        voice: voiceWebhookUrl,
        sms: smsWebhookUrl,
        status_callback: statusCallbackUrl,
        whatsapp: whatsappWebhookUrl
      },
      updated_configuration: {
        voice_url: updatedNumber.voiceUrl,
        voice_method: updatedNumber.voiceMethod,
        sms_url: updatedNumber.smsUrl,
        sms_method: updatedNumber.smsMethod,
        status_callback: updatedNumber.statusCallback,
        status_callback_method: updatedNumber.statusCallbackMethod
      },
      previous_configuration: {
        voice_url: businessNumber.voiceUrl,
        sms_url: businessNumber.smsUrl,
        status_callback: businessNumber.statusCallback
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[UPDATE-WEBHOOKS] Error updating webhooks:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to update Twilio webhooks",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Get current webhook configuration
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num =>
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    if (!businessNumber) {
      return NextResponse.json({
        success: false,
        error: "Business phone number not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      phone_number: businessNumber.phoneNumber,
      current_configuration: {
        voice_url: businessNumber.voiceUrl,
        voice_method: businessNumber.voiceMethod,
        sms_url: businessNumber.smsUrl,
        sms_method: businessNumber.smsMethod,
        status_callback: businessNumber.statusCallback
      },
      expected_configuration: {
        voice_url: process.env.TWILIO_VOICE_WEBHOOK_URL,
        sms_url: process.env.TWILIO_SMS_WEBHOOK_URL
      },
      webhook_urls_match: businessNumber.voiceUrl === process.env.TWILIO_VOICE_WEBHOOK_URL,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[UPDATE-WEBHOOKS] Error checking webhooks:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check webhook configuration"
    }, { status: 500 })
  }
}
