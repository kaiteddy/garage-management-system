import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET() {
  const businessInfo = {
    // Business Details for WhatsApp Registration
    business_name: "ELI MOTORS LTD",
    phone_number: "+447488896449",
    display_name: "ELI MOTORS LTD",
    business_category: "Automotive Services",
    business_description: "MOT testing, vehicle servicing, and automotive maintenance services. Serving Hendon since 1979.",
    website: "https://www.elimotors.co.uk",

    // Business Address (you'll need to fill in actual address)
    address: {
      street: "[Your actual street address]",
      city: "Hendon",
      postcode: "[Your postcode]",
      country: "United Kingdom"
    },

    // Use Case Description for Meta
    use_case: `ELI MOTORS LTD is a UK-based automotive service centre specializing in MOT testing, vehicle servicing, and automotive maintenance. We provide essential vehicle safety testing and maintenance services to ensure customer vehicles meet UK road safety standards.

Our WhatsApp Business API will be used exclusively for:
1. MOT expiry reminders to customers (critical for road safety compliance)
2. Service appointment confirmations
3. Customer service communications
4. Vehicle status updates

All communications will be service-related and comply with UK data protection regulations. We expect approximately 500-1000 messages per month to our local UK customer base.`,

    // Required Documents Checklist
    required_documents: [
      "UK Companies House registration certificate",
      "Business registration number",
      "Proof of business address (utility bill or bank statement)",
      "Director/owner identification",
      "Business website (www.elimotors.co.uk)",
      "Photos of business premises (optional but helpful)"
    ],

    // Message Templates to Submit
    message_templates: [
      {
        name: "MOT Reminder",
        category: "UTILITY",
        language: "en_GB",
        text: "🚗 MOT Reminder - ELI MOTORS LTD\n\nHi {{1}}, Your {{2}} ({{3}}) MOT expires in {{4}} days on {{5}}.\n\nPlease book your MOT test:\n📞 Call: 0208 203 6449\n💬 Reply to this message\n\nServing Hendon since 1979\n\nReply STOP to opt out."
      },
      {
        name: "Appointment Confirmation",
        category: "UTILITY",
        language: "en_GB",
        text: "✅ Appointment Confirmed - ELI MOTORS LTD\n\nHi {{1}}, Your {{2}} appointment is confirmed for:\n📅 {{3}} at {{4}}\n\nLocation: [Your address]\n📞 Call: 0208 203 6449\n\nReply STOP to opt out."
      }
    ]
  }

  return NextResponse.json({
    success: true,
    message: "WhatsApp Business Registration Information for ELI MOTORS LTD",
    registration_steps: [
      {
        step: 1,
        title: "Register WhatsApp Sender in Twilio",
        url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        action: "Click 'Create new WhatsApp sender' and fill in business details below"
      },
      {
        step: 2,
        title: "Create Meta Business Manager Account",
        url: "https://business.facebook.com/",
        action: "Create business account and verify business information"
      },
      {
        step: 3,
        title: "Submit for Meta Approval",
        action: "Upload documents and wait 1-3 business days for approval"
      },
      {
        step: 4,
        title: "Receive Production WhatsApp Number",
        action: "Once approved, you'll get whatsapp:+447488896449"
      }
    ],
    business_information: businessInfo,
    important_notes: [
      "You MUST register the WhatsApp sender BEFORE trying to verify the number",
      "Verification codes are only sent AFTER successful sender registration",
      "The sandbox (whatsapp:+14155238886) works independently of business registration",
      "Business approval typically takes 1-3 business days",
      "Make sure all business documents are legitimate and up-to-date"
    ],
    next_action: "Go to Twilio Console and register +447488896449 as WhatsApp sender using the business information above"
  })
}

export async function POST(request: Request) {
  try {
    const { action = 'register' } = await request.json()

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const businessNumber = process.env.TWILIO_PHONE_NUMBER // +447488896449

    if (action === 'register') {
      console.log('[WHATSAPP-REGISTER] Registering WhatsApp sender via Senders API...')

      // Register WhatsApp sender using Senders API
      const sender = await client.messaging.v2.channels.senders.create({
        senderId: `whatsapp:${businessNumber}`,
        profile: {
          name: 'ELI MOTORS',
          about: 'Professional automotive services in Hendon since 1979. MOT testing, servicing, repairs & diagnostics.',
          address: '123 High Street, Hendon, London NW4 1AB',
          emails: ['info@elimotors.co.uk'],
          websites: ['https://www.elimotors.co.uk'],
          vertical: 'Other',
          logoUrl: 'https://v0dashboard.vercel.app/logo.png',
          description: 'ELI MOTORS - Your trusted automotive service center'
        },
        webhook: {
          callbackUrl: 'https://v0dashboard.vercel.app/api/sms/webhook',
          callbackMethod: 'POST'
        }
      })

      return NextResponse.json({
        success: true,
        registration_initiated: true,
        sender_details: {
          sid: sender.sid,
          sender_id: sender.senderId,
          status: sender.status,
          phone_number: businessNumber
        },
        next_steps: [
          "Registration initiated - status will be 'CREATING' initially",
          "Wait 2-5 minutes for Meta to process the registration",
          "Check status using the 'check' action",
          "Once status is 'ONLINE', WhatsApp is ready to use"
        ],
        important_notes: [
          "Twilio will handle SMS verification automatically",
          "Your business number will be verified with Meta",
          "No manual OTP entry required for Twilio SMS numbers",
          "This creates a WhatsApp Business Account (WABA) automatically"
        ]
      })
    }

    if (action === 'check') {
      console.log('[WHATSAPP-REGISTER] Checking WhatsApp sender status...')

      // List all senders to find our WhatsApp sender
      const senders = await client.messaging.v2.channels.senders.list({
        limit: 20
      })

      const whatsappSender = senders.find(sender =>
        sender.senderId === `whatsapp:${businessNumber}`
      )

      if (!whatsappSender) {
        return NextResponse.json({
          success: false,
          error: "WhatsApp sender not found",
          suggestion: "Register the sender first using action: 'register'"
        })
      }

      // Get detailed sender information
      const senderDetails = await client.messaging.v2.channels.senders(whatsappSender.sid).fetch()

      return NextResponse.json({
        success: true,
        sender_status: {
          sid: senderDetails.sid,
          sender_id: senderDetails.senderId,
          status: senderDetails.status,
          phone_number: businessNumber,
          waba_id: senderDetails.configuration?.wabaId || 'Not available',
          profile: senderDetails.profile,
          properties: senderDetails.properties
        },
        status_meaning: {
          CREATING: "Registration in progress - wait a few minutes",
          OFFLINE: "Registration failed or pending - check requirements",
          ONLINE: "✅ Ready to send/receive WhatsApp messages!",
          SUSPENDED: "Suspended by Meta - contact support"
        },
        ready_to_use: senderDetails.status === 'ONLINE'
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      valid_actions: ['register', 'check']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-REGISTER] Error:', error)
    return NextResponse.json({
      success: false,
      error: "WhatsApp sender registration failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
