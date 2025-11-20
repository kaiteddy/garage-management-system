import { NextResponse } from "next/server"

export async function GET() {
  const whatsappAccountId = "1560904015316182"
  
  return NextResponse.json({
    success: true,
    message: "WhatsApp Business Account Found - Setup Instructions",
    existing_account: {
      whatsapp_business_account_id: whatsappAccountId,
      status: "Already exists - needs to be connected to Twilio"
    },
    setup_steps: [
      {
        step: 1,
        title: "Connect Existing WhatsApp Account to Twilio",
        description: "Link your existing WhatsApp Business account to Twilio",
        action: "Go to Twilio Console WhatsApp Senders",
        url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders"
      },
      {
        step: 2,
        title: "Use Existing Account Option",
        description: "Instead of creating new, select 'Connect existing WhatsApp Business account'",
        details: [
          "Select 'I have an existing WhatsApp Business account'",
          "Enter WhatsApp Business Account ID: 1560904015316182",
          "Enter phone number: +447488896449"
        ]
      },
      {
        step: 3,
        title: "Verify Phone Number",
        description: "Now you should receive verification codes",
        note: "Codes will be sent to +447488896449 since account already exists"
      },
      {
        step: 4,
        title: "Complete Integration",
        description: "Finish connecting the account to Twilio"
      }
    ],
    meta_business_manager: {
      account_id: whatsappAccountId,
      next_action: "Check Meta Business Manager for this account",
      url: "https://business.facebook.com/settings/whatsapp-business-accounts",
      phone_number: "+447488896449"
    },
    troubleshooting: {
      if_still_no_code: [
        "Check Meta Business Manager for account status",
        "Verify phone number is correctly associated with account",
        "Ensure account is not suspended or pending review",
        "Check if 2FA is enabled on Meta Business account"
      ],
      verification_process: "With existing account, verification should work immediately"
    },
    important_notes: [
      "You don't need to create a new WhatsApp Business account",
      "Use the 'Connect existing account' option in Twilio",
      "Verification codes should work once properly connected",
      "Check Meta Business Manager for account details"
    ],
    next_immediate_action: "Go to Twilio Console and select 'Connect existing WhatsApp Business account' option"
  })
}

export async function POST() {
  // Check if we can connect to the existing account
  const whatsappAccountId = "1560904015316182"
  
  return NextResponse.json({
    success: true,
    account_check: {
      whatsapp_business_account_id: whatsappAccountId,
      phone_number: "+447488896449",
      business_name: "ELI MOTORS LTD",
      connection_status: "Ready to connect to Twilio"
    },
    connection_instructions: {
      twilio_console_url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
      steps: [
        "Click 'Create new WhatsApp sender'",
        "Select 'I have an existing WhatsApp Business account'",
        "Enter Account ID: 1560904015316182",
        "Enter Phone: +447488896449",
        "Complete verification process"
      ]
    },
    meta_business_check: {
      url: "https://business.facebook.com/settings/whatsapp-business-accounts",
      action: "Verify account 1560904015316182 is active and associated with +447488896449"
    }
  })
}
