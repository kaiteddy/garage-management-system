import { NextResponse } from "next/server"

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
