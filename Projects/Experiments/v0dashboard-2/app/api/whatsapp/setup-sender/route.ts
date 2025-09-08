import { NextResponse } from "next/server"
import twilio from 'twilio'

/**
 * WhatsApp Sender Setup and Verification
 * GET /api/whatsapp/setup-sender - Check current WhatsApp sender status
 * POST /api/whatsapp/setup-sender - Setup or verify WhatsApp sender
 */
export async function GET() {
  try {
    console.log('[WHATSAPP-SETUP] 📱 Checking WhatsApp sender configuration...')
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials not configured",
        setup: {
          status: 'not_configured',
          steps: [
            'Set TWILIO_ACCOUNT_SID environment variable',
            'Set TWILIO_AUTH_TOKEN environment variable',
            'Set TWILIO_WHATSAPP_NUMBER environment variable'
          ]
        }
      })
    }

    const client = twilio(accountSid, authToken)
    
    // Check WhatsApp senders
    const senders = await client.messaging.v1.services.list()
    const whatsappSenders = []

    // Get WhatsApp phone numbers
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list()
      const whatsappNumbers = phoneNumbers.filter(num => 
        num.phoneNumber.includes('whatsapp') || 
        num.friendlyName?.toLowerCase().includes('whatsapp')
      )

      for (const number of whatsappNumbers) {
        whatsappSenders.push({
          sid: number.sid,
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          capabilities: number.capabilities,
          status: 'active'
        })
      }
    } catch (error) {
      console.log('[WHATSAPP-SETUP] Could not fetch phone numbers:', error.message)
    }

    // Check if using sandbox
    const isSandbox = whatsappNumber?.includes('+14155238886')
    const isConfigured = !!whatsappNumber

    let sandboxInfo = null
    if (isSandbox) {
      try {
        // Get sandbox info
        sandboxInfo = {
          number: '+14155238886',
          status: 'active',
          joinCode: 'join <your-sandbox-name>',
          note: 'Sandbox is for testing only. Customers must join before receiving messages.'
        }
      } catch (error) {
        console.log('[WHATSAPP-SETUP] Could not get sandbox info:', error.message)
      }
    }

    // Check messaging services
    let messagingServices = []
    try {
      const services = await client.messaging.v1.services.list()
      messagingServices = services.map(service => ({
        sid: service.sid,
        friendlyName: service.friendlyName,
        status: service.status,
        inboundRequestUrl: service.inboundRequestUrl,
        statusCallback: service.statusCallback
      }))
    } catch (error) {
      console.log('[WHATSAPP-SETUP] Could not fetch messaging services:', error.message)
    }

    const setupStatus = {
      configured: isConfigured,
      sandbox: isSandbox,
      production: isConfigured && !isSandbox,
      whatsappNumber: whatsappNumber || 'Not configured',
      senders: whatsappSenders,
      messagingServices,
      sandboxInfo
    }

    return NextResponse.json({
      success: true,
      setup: setupStatus,
      recommendations: generateSetupRecommendations(setupStatus),
      nextSteps: generateNextSteps(setupStatus)
    })

  } catch (error) {
    console.error('[WHATSAPP-SETUP] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check WhatsApp setup",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log('[WHATSAPP-SETUP] 🔧 Setting up WhatsApp sender...')
    
    const body = await request.json()
    const {
      action = 'verify', // 'verify', 'setup_sandbox', 'setup_production'
      phoneNumber,
      friendlyName = 'ELI MOTORS WhatsApp'
    } = body

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: "Twilio credentials not configured"
      }, { status: 400 })
    }

    const client = twilio(accountSid, authToken)
    let result = {}

    switch (action) {
      case 'verify':
        result = await verifyWhatsAppSetup(client)
        break
        
      case 'setup_sandbox':
        result = await setupSandbox(client)
        break
        
      case 'setup_production':
        result = await setupProduction(client, phoneNumber, friendlyName)
        break
        
      case 'test_send':
        result = await testWhatsAppSend(client, phoneNumber || process.env.TWILIO_WHATSAPP_NUMBER)
        break
        
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action"
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      result
    })

  } catch (error) {
    console.error('[WHATSAPP-SETUP] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to setup WhatsApp",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function verifyWhatsAppSetup(client: any) {
  try {
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
    
    if (!whatsappNumber) {
      return {
        status: 'not_configured',
        message: 'TWILIO_WHATSAPP_NUMBER not set'
      }
    }

    // Test sending a message to verify setup
    const testMessage = await client.messages.create({
      body: '🧪 WhatsApp setup verification test',
      from: whatsappNumber,
      to: 'whatsapp:+447488896449' // Your test number
    })

    return {
      status: 'verified',
      message: 'WhatsApp sender is working correctly',
      testMessageSid: testMessage.sid,
      whatsappNumber
    }

  } catch (error) {
    return {
      status: 'failed',
      message: 'WhatsApp verification failed',
      error: error.message,
      troubleshooting: [
        'Check if TWILIO_WHATSAPP_NUMBER is correct',
        'Verify WhatsApp sender is approved in Twilio Console',
        'Ensure test number has joined sandbox (if using sandbox)',
        'Check Twilio account balance'
      ]
    }
  }
}

async function setupSandbox(client: any) {
  try {
    // The sandbox is automatically available, just need to configure
    const sandboxNumber = 'whatsapp:+14155238886'
    
    return {
      status: 'configured',
      message: 'WhatsApp sandbox is ready',
      sandboxNumber,
      instructions: [
        'Set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886 in environment variables',
        'To test, send "join <your-sandbox-name>" to +1 415 523 8886 from your WhatsApp',
        'Your sandbox name can be found in Twilio Console > Messaging > Try it out > WhatsApp',
        'Sandbox is for testing only - use production for live customers'
      ],
      nextSteps: [
        'Update environment variable',
        'Test with your phone number',
        'Apply for production WhatsApp Business API when ready'
      ]
    }

  } catch (error) {
    return {
      status: 'failed',
      message: 'Failed to setup sandbox',
      error: error.message
    }
  }
}

async function setupProduction(client: any, phoneNumber: string, friendlyName: string) {
  try {
    if (!phoneNumber) {
      return {
        status: 'failed',
        message: 'Phone number required for production setup'
      }
    }

    // Check if phone number exists and is WhatsApp enabled
    const numbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    })

    if (numbers.length === 0) {
      return {
        status: 'failed',
        message: 'Phone number not found in Twilio account',
        instructions: [
          'Purchase a WhatsApp-enabled phone number from Twilio Console',
          'Go to Phone Numbers > Manage > Buy a number',
          'Filter by WhatsApp capability',
          'Purchase and configure the number'
        ]
      }
    }

    const number = numbers[0]
    
    // Check WhatsApp capability
    if (!number.capabilities.sms) {
      return {
        status: 'warning',
        message: 'Phone number may not support WhatsApp',
        details: number.capabilities
      }
    }

    return {
      status: 'configured',
      message: 'Production WhatsApp number is configured',
      phoneNumber: number.phoneNumber,
      capabilities: number.capabilities,
      instructions: [
        `Set TWILIO_WHATSAPP_NUMBER=whatsapp:${phoneNumber} in environment variables`,
        'Apply for WhatsApp Business API approval through Twilio',
        'Complete Meta Business verification process',
        'Configure message templates for production use'
      ],
      approvalProcess: {
        step1: 'Submit WhatsApp Business API application in Twilio Console',
        step2: 'Complete Meta Business Manager verification',
        step3: 'Wait for approval (can take several days)',
        step4: 'Configure approved message templates',
        step5: 'Test with approved phone numbers'
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      message: 'Failed to setup production WhatsApp',
      error: error.message
    }
  }
}

async function testWhatsAppSend(client: any, whatsappNumber: string) {
  try {
    if (!whatsappNumber) {
      return {
        status: 'failed',
        message: 'WhatsApp number not configured'
      }
    }

    const testMessage = await client.messages.create({
      body: `🧪 WhatsApp Test Message from ELI MOTORS LTD\n\nTime: ${new Date().toLocaleString()}\nThis is a system test to verify WhatsApp functionality.`,
      from: whatsappNumber,
      to: 'whatsapp:+447488896449' // Your test number
    })

    return {
      status: 'sent',
      message: 'Test message sent successfully',
      messageSid: testMessage.sid,
      to: 'whatsapp:+447488896449',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    return {
      status: 'failed',
      message: 'Failed to send test message',
      error: error.message
    }
  }
}

function generateSetupRecommendations(setup: any): string[] {
  const recommendations = []

  if (!setup.configured) {
    recommendations.push('🔧 Configure TWILIO_WHATSAPP_NUMBER environment variable')
    recommendations.push('📱 Start with sandbox for testing, then apply for production')
  }

  if (setup.sandbox) {
    recommendations.push('🧪 Currently using sandbox - good for testing')
    recommendations.push('🚀 Consider applying for production WhatsApp Business API')
    recommendations.push('👥 Remember: customers must join sandbox before receiving messages')
  }

  if (setup.production) {
    recommendations.push('✅ Production WhatsApp configured')
    recommendations.push('📋 Ensure message templates are approved')
    recommendations.push('💼 Verify Meta Business Manager setup')
  }

  if (setup.senders.length === 0) {
    recommendations.push('📞 No WhatsApp senders found - check Twilio Console')
  }

  recommendations.push('🔗 Configure webhooks for message delivery status')
  recommendations.push('📊 Monitor usage and costs in Twilio Console')

  return recommendations
}

function generateNextSteps(setup: any): string[] {
  const steps = []

  if (!setup.configured) {
    steps.push('1. Set up WhatsApp sandbox for testing')
    steps.push('2. Configure environment variables')
    steps.push('3. Test with your phone number')
    steps.push('4. Apply for production when ready')
  } else if (setup.sandbox) {
    steps.push('1. Test current sandbox setup')
    steps.push('2. Join sandbox from your WhatsApp')
    steps.push('3. Send test messages')
    steps.push('4. Apply for production approval')
  } else if (setup.production) {
    steps.push('1. Verify production setup')
    steps.push('2. Test with approved numbers')
    steps.push('3. Configure message templates')
    steps.push('4. Launch customer communications')
  }

  return steps
}
