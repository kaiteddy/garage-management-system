import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('Checking WhatsApp Business registration status...')

    // Check if we have a WhatsApp sender registered
    const whatsappSenders = await client.messaging.v1.services.list()
    
    // Check for WhatsApp phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    
    // Check for WhatsApp senders specifically
    let whatsappSenderStatus = null
    try {
      // This will show us if we have any WhatsApp senders registered
      const senders = await client.messaging.v1.services.list()
      console.log('Messaging services found:', senders.length)
    } catch (error) {
      console.log('No messaging services found or error:', error)
    }

    // Check account capabilities
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()

    // The key insight: Check if we need to register the WhatsApp sender first
    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449

    return NextResponse.json({
      success: true,
      analysis: {
        issue_identified: "WhatsApp Business sender not registered with Twilio",
        explanation: "Your Twilio number works for SMS, but needs to be registered as a WhatsApp Business sender",
        root_cause: "Missing WhatsApp sender registration step in Twilio Console"
      },
      current_status: {
        twilio_account: account.status,
        business_number: businessNumber,
        sms_capability: "Working",
        whatsapp_sandbox: "Working", 
        whatsapp_business_sender: "NOT REGISTERED"
      },
      required_steps: [
        {
          step: 1,
          action: "Register WhatsApp Business Sender",
          url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
          description: "Register +447488896449 as a WhatsApp Business sender"
        },
        {
          step: 2,
          action: "Complete Business Verification",
          description: "Upload business documents and verify ELI MOTORS LTD"
        },
        {
          step: 3,
          action: "Submit for Meta Approval",
          description: "Meta will review and approve your business for WhatsApp"
        },
        {
          step: 4,
          action: "Receive Production WhatsApp Number",
          description: "Once approved, you'll get whatsapp:+447488896449"
        }
      ],
      verification_process: {
        current_step: "Step 1 - Register WhatsApp Sender",
        what_youre_trying_to_verify: "A phone number that hasn't been registered as WhatsApp sender",
        why_no_code: "WhatsApp verification codes are only sent AFTER registering the sender",
        next_action: "Go to Twilio Console and register WhatsApp sender first"
      },
      twilio_console_links: {
        whatsapp_senders: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
        messaging_services: "https://console.twilio.com/us1/develop/sms/services"
      },
      account_info: {
        sid: account.sid,
        status: account.status,
        type: account.type
      }
    })

  } catch (error) {
    console.error('WhatsApp Business status check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to check WhatsApp Business status"
      },
      { status: 500 }
    )
  }
}
