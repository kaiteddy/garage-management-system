import { NextResponse } from "next/server"
import twilio from "twilio"
import { TwilioService } from "@/lib/twilio-service"

export async function POST(request: Request) {
  try {
    const { 
      testType = 'comprehensive', // 'comprehensive', 'sms', 'voice', 'whatsapp-sandbox', 'business-verification'
      phoneNumber = '+447843275372' // Your test number
    } = await request.json()
    
    console.log(`[WHATSAPP-SYSTEM-TEST] Running ${testType} test`)

    if (testType === 'comprehensive') {
      return await runComprehensiveTest(phoneNumber)
    }

    if (testType === 'sms') {
      return await testSMSCapability(phoneNumber)
    }

    if (testType === 'voice') {
      return await testVoiceCapability(phoneNumber)
    }

    if (testType === 'whatsapp-sandbox') {
      return await testWhatsAppSandbox(phoneNumber)
    }

    if (testType === 'business-verification') {
      return await testBusinessVerification()
    }

    return NextResponse.json({
      success: false,
      error: "Invalid test type",
      valid_types: ['comprehensive', 'sms', 'voice', 'whatsapp-sandbox', 'business-verification']
    }, { status: 400 })

  } catch (error) {
    console.error('[WHATSAPP-SYSTEM-TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: "System test failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function runComprehensiveTest(phoneNumber: string) {
  console.log('[COMPREHENSIVE-TEST] Running full WhatsApp system test...')
  
  const results = {
    timestamp: new Date().toISOString(),
    test_phone: phoneNumber,
    business_number: process.env.TWILIO_PHONE_NUMBER,
    tests: {
      configuration: { status: 'pending', details: null },
      sms_capability: { status: 'pending', details: null },
      voice_capability: { status: 'pending', details: null },
      whatsapp_sandbox: { status: 'pending', details: null },
      business_verification: { status: 'pending', details: null }
    },
    overall_status: 'running',
    recommendations: []
  }

  try {
    // Test 1: Configuration Check
    console.log('[TEST-1] Checking Twilio configuration...')
    const configTest = await testConfiguration()
    results.tests.configuration = configTest

    // Test 2: SMS Capability
    console.log('[TEST-2] Testing SMS capability...')
    const smsTest = await testSMSCapability(phoneNumber)
    results.tests.sms_capability = smsTest

    // Test 3: Voice Capability  
    console.log('[TEST-3] Testing voice capability...')
    const voiceTest = await testVoiceCapability(phoneNumber)
    results.tests.voice_capability = voiceTest

    // Test 4: WhatsApp Sandbox
    console.log('[TEST-4] Testing WhatsApp sandbox...')
    const sandboxTest = await testWhatsAppSandbox(phoneNumber)
    results.tests.whatsapp_sandbox = sandboxTest

    // Test 5: Business Verification Status
    console.log('[TEST-5] Checking business verification...')
    const businessTest = await testBusinessVerification()
    results.tests.business_verification = businessTest

    // Determine overall status
    const allTests = Object.values(results.tests)
    const passedTests = allTests.filter(test => test.status === 'passed').length
    const failedTests = allTests.filter(test => test.status === 'failed').length

    if (failedTests === 0) {
      results.overall_status = 'all_systems_ready'
      results.recommendations = [
        "✅ All systems working correctly",
        "🚀 Ready for production WhatsApp messaging",
        "📱 Can send MOT reminders via WhatsApp"
      ]
    } else if (passedTests >= 3) {
      results.overall_status = 'mostly_working'
      results.recommendations = [
        "⚠️ Most systems working, some issues to resolve",
        "📞 SMS and voice working - can use as fallback",
        "🔧 Complete WhatsApp business verification for full functionality"
      ]
    } else {
      results.overall_status = 'needs_attention'
      results.recommendations = [
        "❌ Multiple system issues detected",
        "🔧 Check Twilio configuration and credentials",
        "📞 Contact Twilio support if issues persist"
      ]
    }

    return NextResponse.json({
      success: true,
      comprehensive_test_results: results,
      summary: {
        total_tests: allTests.length,
        passed: passedTests,
        failed: failedTests,
        overall_status: results.overall_status
      },
      next_actions: generateNextActions(results),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[COMPREHENSIVE-TEST] Test suite failed:', error)
    return NextResponse.json({
      success: false,
      error: "Comprehensive test failed",
      partial_results: results,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testConfiguration() {
  try {
    const config = TwilioService.getConfiguration()
    
    const requiredFields = [
      'accountSid',
      'authToken', 
      'phoneNumber'
    ]

    const missingFields = requiredFields.filter(field => 
      !config[field] || config[field] === 'NOT_SET'
    )

    if (missingFields.length > 0) {
      return {
        status: 'failed',
        details: {
          error: 'Missing required configuration',
          missing_fields: missingFields,
          current_config: config
        }
      }
    }

    return {
      status: 'passed',
      details: {
        message: 'Twilio configuration complete',
        config: config,
        sms_ready: config.smsConfigured,
        whatsapp_ready: config.whatsappConfigured
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: {
        error: 'Configuration check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function testSMSCapability(phoneNumber: string) {
  try {
    const testMessage = `🔧 SMS Test from ELI MOTORS
    
✅ Your Twilio SMS is working correctly!
📱 Business Number: ${process.env.TWILIO_PHONE_NUMBER}
🕐 Test Time: ${new Date().toLocaleString('en-GB')}

This confirms SMS capability for MOT reminders.`

    const result = await TwilioService.sendSMS({
      to: phoneNumber,
      body: testMessage,
      messageType: 'test',
      urgencyLevel: 'low'
    })

    if (result.success) {
      return {
        status: 'passed',
        details: {
          message: 'SMS sent successfully',
          message_sid: result.messageSid,
          cost: result.cost,
          business_number: process.env.TWILIO_PHONE_NUMBER
        }
      }
    } else {
      return {
        status: 'failed',
        details: {
          error: 'SMS send failed',
          message: result.error
        }
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: {
        error: 'SMS test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function testVoiceCapability(phoneNumber: string) {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const voiceCall = await client.calls.create({
      twiml: `
        <Response>
          <Say voice="alice" language="en-GB">
            Hello, this is a test call from ELI MOTORS WhatsApp system.
            Your Twilio voice capability is working correctly.
            Business number ${process.env.TWILIO_PHONE_NUMBER} is ready for voice verification.
            Thank you for testing.
          </Say>
        </Response>
      `,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })

    return {
      status: 'passed',
      details: {
        message: 'Voice call initiated successfully',
        call_sid: voiceCall.sid,
        status: voiceCall.status,
        business_number: process.env.TWILIO_PHONE_NUMBER
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: {
        error: 'Voice test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function testWhatsAppSandbox(phoneNumber: string) {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const whatsappMessage = await client.messages.create({
      body: `🚗 WhatsApp Sandbox Test - ELI MOTORS

✅ WhatsApp sandbox is working!
📱 This confirms WhatsApp capability
🔧 Business verification pending

Next: Complete business verification for production WhatsApp.`,
      from: process.env.TWILIO_WHATSAPP_NUMBER, // Sandbox number
      to: `whatsapp:${phoneNumber}`
    })

    return {
      status: 'passed',
      details: {
        message: 'WhatsApp sandbox message sent',
        message_sid: whatsappMessage.sid,
        sandbox_number: process.env.TWILIO_WHATSAPP_NUMBER,
        production_ready: false
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: {
        error: 'WhatsApp sandbox test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        note: 'Sandbox may require joining first'
      }
    }
  }
}

async function testBusinessVerification() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Check account status
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
    
    // Check phone number capabilities
    const phoneNumbers = await client.incomingPhoneNumbers.list()
    const businessNumber = phoneNumbers.find(num => 
      num.phoneNumber === process.env.TWILIO_PHONE_NUMBER
    )

    // Check messaging services (WhatsApp senders would be here)
    const messagingServices = await client.messaging.v1.services.list()

    const verificationStatus = {
      account_status: account.status,
      business_number_found: !!businessNumber,
      messaging_services: messagingServices.length,
      whatsapp_business_ready: false // Will be true when verification complete
    }

    // Determine verification status
    if (messagingServices.length > 0 && businessNumber) {
      return {
        status: 'passed',
        details: {
          message: 'Business verification appears complete',
          verification_status: verificationStatus,
          ready_for_production: true
        }
      }
    } else {
      return {
        status: 'pending',
        details: {
          message: 'Business verification in progress or not started',
          verification_status: verificationStatus,
          required_steps: [
            "Register WhatsApp sender in Twilio Console",
            "Complete business verification documents",
            "Wait for Meta approval"
          ],
          console_url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders"
        }
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: {
        error: 'Business verification check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

function generateNextActions(results: any) {
  const actions = []

  if (results.tests.configuration.status === 'failed') {
    actions.push("🔧 Fix Twilio configuration - check environment variables")
  }

  if (results.tests.sms_capability.status === 'passed') {
    actions.push("✅ SMS working - can use for immediate MOT reminders")
  }

  if (results.tests.voice_capability.status === 'passed') {
    actions.push("📞 Voice working - can use for WhatsApp verification")
  }

  if (results.tests.whatsapp_sandbox.status === 'passed') {
    actions.push("📱 WhatsApp sandbox working - ready for business verification")
  }

  if (results.tests.business_verification.status === 'pending') {
    actions.push("🏢 Complete WhatsApp business verification in Twilio Console")
  }

  if (results.tests.business_verification.status === 'passed') {
    actions.push("🚀 WhatsApp Business ready - can send production messages")
  }

  return actions
}
