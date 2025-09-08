import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[SANDBOX-INFO] Fetching actual Twilio sandbox configuration...')

    // Get the actual sandbox configuration from Twilio
    try {
      // Try to get sandbox settings - this API might vary
      const sandbox = await client.messaging.v1.services.list()
      console.log('[SANDBOX-INFO] Messaging services:', sandbox.length)

      // Get account information
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
      
      // Check phone number capabilities
      const phoneNumbers = await client.incomingPhoneNumbers.list()
      const whatsappCapableNumbers = phoneNumbers.filter(num => 
        num.capabilities && (num.capabilities.sms || num.capabilities.mms)
      )

      return NextResponse.json({
        success: true,
        sandbox_investigation: {
          account_status: account.status,
          account_type: account.type,
          messaging_services_count: sandbox.length,
          whatsapp_capable_numbers: whatsappCapableNumbers.length,
          environment_variables: {
            twilio_whatsapp_number: process.env.TWILIO_WHATSAPP_NUMBER,
            twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
            account_sid_set: !!process.env.TWILIO_ACCOUNT_SID,
            auth_token_set: !!process.env.TWILIO_AUTH_TOKEN
          }
        },
        troubleshooting: {
          possible_issues: [
            "Sandbox join code might be different for your account",
            "WhatsApp sandbox might not be enabled",
            "Account might need WhatsApp add-on activation",
            "Join code format might have changed"
          ],
          alternative_approaches: [
            "Use Twilio Console to get exact sandbox join code",
            "Enable WhatsApp in Twilio Console first",
            "Try different join code format",
            "Use SMS-based WhatsApp-style messaging instead"
          ]
        },
        twilio_console_urls: {
          whatsapp_sandbox: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn",
          messaging_services: "https://console.twilio.com/us1/develop/sms/services",
          phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
        },
        recommended_next_steps: [
          "1. Check Twilio Console for WhatsApp sandbox status",
          "2. Get the exact join code from console",
          "3. Verify WhatsApp is enabled for your account",
          "4. Try SMS-based messaging as alternative"
        ]
      })

    } catch (twilioError) {
      console.error('[SANDBOX-INFO] Twilio API error:', twilioError)
      
      return NextResponse.json({
        success: false,
        error: "Could not fetch sandbox configuration",
        details: twilioError instanceof Error ? twilioError.message : 'Unknown Twilio error',
        likely_cause: "WhatsApp sandbox not enabled or configured",
        immediate_solution: {
          option_1: "Enable WhatsApp in Twilio Console",
          option_2: "Use SMS with WhatsApp-style formatting instead",
          option_3: "Contact Twilio support for sandbox access"
        },
        console_url: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
      })
    }

  } catch (error) {
    console.error('[SANDBOX-INFO] General error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to investigate sandbox",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action = 'try_alternative_sms' } = await request.json()
    
    if (action === 'try_alternative_sms') {
      // Send WhatsApp-style message via SMS instead
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )

      const whatsappStyleSMS = await client.messages.create({
        body: `💬 WhatsApp-Style Message via SMS - ELI MOTORS

🚗 This is how your MOT reminders will look!

📋 Vehicle: TEST123
📅 MOT Due: 31/08/2025
⚠️ Status: Due Soon

📞 Book MOT: 0208 203 6449
🌐 www.elimotors.co.uk
📍 Serving Hendon since 1979

✅ SMS delivery working perfectly!
🔄 WhatsApp sandbox troubleshooting in progress

Reply STOP to opt out.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+447843275372'
      })

      return NextResponse.json({
        success: true,
        alternative_working: true,
        message_sid: whatsappStyleSMS.sid,
        delivery_method: 'SMS with WhatsApp-style formatting',
        benefits: [
          "✅ Immediate delivery - no sandbox needed",
          "📱 Professional WhatsApp-style formatting", 
          "💰 Cost-effective messaging",
          "🔄 Reliable fallback system"
        ],
        production_ready: {
          sms_messaging: "Ready now",
          whatsapp_business: "Pending verification",
          voice_calls: "Ready now"
        },
        recommendation: "Use SMS messaging for immediate MOT reminders while resolving WhatsApp sandbox"
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['try_alternative_sms']
    }, { status: 400 })

  } catch (error) {
    console.error('[SANDBOX-INFO] Action error:', error)
    return NextResponse.json({
      success: false,
      error: "Action failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
