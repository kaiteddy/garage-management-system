import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json()
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    console.log('[WHATSAPP-REGISTER] Attempting to register business number:', phoneNumber)

    // Check if the phone number is already registered
    try {
      const existingNumbers = await client.incomingPhoneNumbers.list()
      const businessNumber = existingNumbers.find(num => num.phoneNumber === phoneNumber)
      
      if (!businessNumber) {
        return NextResponse.json({
          success: false,
          error: "Phone number not found in your Twilio account",
          suggestion: "Please ensure the number is purchased and active in your Twilio account"
        }, { status: 400 })
      }

      console.log('[WHATSAPP-REGISTER] Phone number found in account:', businessNumber.sid)

    } catch (error) {
      console.error('[WHATSAPP-REGISTER] Error checking phone numbers:', error)
      return NextResponse.json({
        success: false,
        error: "Failed to verify phone number in account"
      }, { status: 500 })
    }

    // Try to register as WhatsApp sender
    try {
      // Note: This is a conceptual approach - actual WhatsApp Business registration
      // requires going through Twilio Console UI for document upload and verification
      
      const registrationInfo = {
        phoneNumber: phoneNumber,
        businessName: "ELI MOTORS LTD",
        displayName: "ELI MOTORS LTD",
        category: "AUTOMOTIVE",
        description: "Professional MOT testing and vehicle servicing. Serving Hendon since 1979.",
        website: "https://www.elimotors.co.uk",
        country: "GB",
        businessType: "LIMITED_COMPANY"
      }

      // For now, we'll return the information needed for manual registration
      return NextResponse.json({
        success: true,
        message: "Business registration information prepared",
        registration_info: registrationInfo,
        next_steps: {
          step_1: {
            action: "Go to Twilio Console",
            url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
            description: "Click 'Register a WhatsApp Sender'"
          },
          step_2: {
            action: "Enter Business Information",
            data: registrationInfo,
            description: "Use the information provided above"
          },
          step_3: {
            action: "Upload Documents",
            required_documents: [
              "Business Registration Certificate (Companies House)",
              "Proof of Business Address",
              "Government-issued ID (Director)",
              "Business License (if applicable)"
            ]
          },
          step_4: {
            action: "Submit for Review",
            description: "Meta will review your application (1-3 business days)"
          }
        },
        current_status: {
          twilio_account: "Active",
          phone_number: phoneNumber,
          whatsapp_status: "Not Registered",
          required_action: "Manual registration via Twilio Console"
        }
      })

    } catch (error) {
      console.error('[WHATSAPP-REGISTER] Registration error:', error)
      return NextResponse.json({
        success: false,
        error: "Failed to prepare registration information",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[WHATSAPP-REGISTER] General error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process registration request"
    }, { status: 500 })
  }
}

// Get current registration status
export async function GET() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Check WhatsApp senders
    const messagingServices = await client.messaging.v1.services.list()
    
    // Check phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num => 
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    return NextResponse.json({
      success: true,
      status: {
        business_number: process.env.TWILIO_PHONE_NUMBER,
        number_active: !!businessNumber,
        messaging_services: messagingServices.length,
        whatsapp_registered: false, // This would need to be checked via specific API
        sandbox_available: true,
        sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER
      },
      registration_links: {
        twilio_console: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders",
        phone_numbers: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
        messaging_services: "https://console.twilio.com/us1/develop/sms/services"
      },
      business_info: {
        name: "ELI MOTORS LTD",
        phone: process.env.TWILIO_PHONE_NUMBER,
        established: 1979,
        category: "Automotive Services",
        description: "Professional MOT testing and vehicle servicing. Serving Hendon since 1979."
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-STATUS] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check registration status"
    }, { status: 500 })
  }
}
