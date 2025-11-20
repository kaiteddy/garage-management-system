import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[UPDATE-WEBHOOKS] Updating Twilio phone number webhooks...')

    // Get the current ngrok URL from environment
    const currentWebhookUrl = process.env.TWILIO_VOICE_WEBHOOK_URL || 'https://garage-manager.eu.ngrok.io/api/twilio/voice'
    const smsWebhookUrl = process.env.TWILIO_SMS_WEBHOOK_URL || 'https://garage-manager.eu.ngrok.io/api/sms/webhook'
    
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
    console.log(`[UPDATE-WEBHOOKS] Current voice URL: ${businessNumber.voiceUrl}`)
    console.log(`[UPDATE-WEBHOOKS] New voice URL: ${currentWebhookUrl}`)

    // Update the phone number configuration
    const updatedNumber = await client
      .incomingPhoneNumbers(businessNumber.sid)
      .update({
        voiceUrl: currentWebhookUrl,
        voiceMethod: 'POST',
        smsUrl: smsWebhookUrl,
        smsMethod: 'POST',
        statusCallback: `${currentWebhookUrl}/status`,
        statusCallbackMethod: 'POST'
      })

    console.log('[UPDATE-WEBHOOKS] Phone number webhooks updated successfully')

    return NextResponse.json({
      success: true,
      message: "Twilio phone number webhooks updated successfully",
      phone_number: updatedNumber.phoneNumber,
      updated_configuration: {
        voice_url: updatedNumber.voiceUrl,
        voice_method: updatedNumber.voiceMethod,
        sms_url: updatedNumber.smsUrl,
        sms_method: updatedNumber.smsMethod,
        status_callback: updatedNumber.statusCallback
      },
      previous_configuration: {
        voice_url: businessNumber.voiceUrl,
        sms_url: businessNumber.smsUrl
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
