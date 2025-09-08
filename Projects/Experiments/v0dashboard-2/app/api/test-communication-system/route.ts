import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService } from "@/lib/twilio-service"
import { WhatsAppService } from "@/lib/whatsapp-service"
import twilio from 'twilio'

/**
 * Comprehensive Communication System Testing
 * POST /api/test-communication-system
 * 
 * Tests all communication channels and configurations
 */
export async function POST(request: Request) {
  try {
    console.log('[COMM-TEST] 🧪 Starting comprehensive communication system test...')
    
    const body = await request.json()
    const {
      testType = 'full', // 'full', 'config', 'sms', 'whatsapp', 'database'
      testPhoneNumber = '+447488896449', // Your own number for testing
      dryRun = true
    } = body

    const testResults = {
      timestamp: new Date().toISOString(),
      testType,
      dryRun,
      results: {
        configuration: null,
        database: null,
        sms: null,
        whatsapp: null,
        smartSend: null,
        webhooks: null
      },
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0,
        totalTests: 0
      },
      recommendations: []
    }

    // Test 1: Configuration Check
    if (testType === 'full' || testType === 'config') {
      console.log('[COMM-TEST] 🔧 Testing configuration...')
      testResults.results.configuration = await testConfiguration()
      testResults.summary.totalTests++
      if (testResults.results.configuration.status === 'passed') {
        testResults.summary.passed++
      } else {
        testResults.summary.failed++
      }
    }

    // Test 2: Database Connectivity
    if (testType === 'full' || testType === 'database') {
      console.log('[COMM-TEST] 🗄️ Testing database...')
      testResults.results.database = await testDatabase()
      testResults.summary.totalTests++
      if (testResults.results.database.status === 'passed') {
        testResults.summary.passed++
      } else {
        testResults.summary.failed++
      }
    }

    // Test 3: SMS Functionality
    if (testType === 'full' || testType === 'sms') {
      console.log('[COMM-TEST] 📱 Testing SMS...')
      testResults.results.sms = await testSMS(testPhoneNumber, dryRun)
      testResults.summary.totalTests++
      if (testResults.results.sms.status === 'passed') {
        testResults.summary.passed++
      } else if (testResults.results.sms.status === 'warning') {
        testResults.summary.warnings++
      } else {
        testResults.summary.failed++
      }
    }

    // Test 4: WhatsApp Functionality
    if (testType === 'full' || testType === 'whatsapp') {
      console.log('[COMM-TEST] 💬 Testing WhatsApp...')
      testResults.results.whatsapp = await testWhatsApp(testPhoneNumber, dryRun)
      testResults.summary.totalTests++
      if (testResults.results.whatsapp.status === 'passed') {
        testResults.summary.passed++
      } else if (testResults.results.whatsapp.status === 'warning') {
        testResults.summary.warnings++
      } else {
        testResults.summary.failed++
      }
    }

    // Test 5: Smart Send System
    if (testType === 'full') {
      console.log('[COMM-TEST] 🎯 Testing smart send system...')
      testResults.results.smartSend = await testSmartSend(testPhoneNumber, true) // Always dry run for smart send
      testResults.summary.totalTests++
      if (testResults.results.smartSend.status === 'passed') {
        testResults.summary.passed++
      } else {
        testResults.summary.failed++
      }
    }

    // Test 6: Webhook Configuration
    if (testType === 'full') {
      console.log('[COMM-TEST] 🔗 Testing webhook configuration...')
      testResults.results.webhooks = await testWebhooks()
      testResults.summary.totalTests++
      if (testResults.results.webhooks.status === 'passed') {
        testResults.summary.passed++
      } else if (testResults.results.webhooks.status === 'warning') {
        testResults.summary.warnings++
      } else {
        testResults.summary.failed++
      }
    }

    // Generate recommendations
    testResults.recommendations = generateRecommendations(testResults.results)

    console.log(`[COMM-TEST] ✅ Test completed: ${testResults.summary.passed}/${testResults.summary.totalTests} passed`)

    return NextResponse.json({
      success: true,
      testResults
    })

  } catch (error) {
    console.error('[COMM-TEST] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to run communication system test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function testConfiguration() {
  try {
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      databaseUrl: process.env.DATABASE_URL,
      resendApiKey: process.env.RESEND_API_KEY
    }

    const issues = []
    const details = {}

    // Check Twilio configuration
    if (!config.accountSid) issues.push('TWILIO_ACCOUNT_SID missing')
    if (!config.authToken) issues.push('TWILIO_AUTH_TOKEN missing')
    if (!config.phoneNumber) issues.push('TWILIO_PHONE_NUMBER missing')
    
    details.twilio = {
      accountSid: config.accountSid ? `${config.accountSid.substring(0, 8)}...` : 'NOT_SET',
      authToken: config.authToken ? 'CONFIGURED' : 'NOT_SET',
      phoneNumber: config.phoneNumber || 'NOT_SET',
      whatsappNumber: config.whatsappNumber || 'NOT_SET'
    }

    // Test Twilio connection
    if (config.accountSid && config.authToken) {
      try {
        const client = twilio(config.accountSid, config.authToken)
        const account = await client.api.accounts(config.accountSid).fetch()
        details.twilioConnection = {
          status: 'Connected',
          accountName: account.friendlyName,
          accountStatus: account.status
        }
      } catch (error) {
        issues.push(`Twilio connection failed: ${error.message}`)
        details.twilioConnection = {
          status: 'Failed',
          error: error.message
        }
      }
    }

    // Check database
    if (!config.databaseUrl) {
      issues.push('DATABASE_URL missing')
    } else {
      details.database = 'CONFIGURED'
    }

    // Check email
    details.email = {
      resendApiKey: config.resendApiKey ? 'CONFIGURED' : 'NOT_SET'
    }

    return {
      status: issues.length === 0 ? 'passed' : 'failed',
      issues,
      details
    }

  } catch (error) {
    return {
      status: 'failed',
      issues: [`Configuration test error: ${error.message}`],
      details: { error: error.message }
    }
  }
}

async function testDatabase() {
  try {
    // Test basic database connectivity
    const testQuery = await sql`SELECT 1 as test`
    
    // Test customer table
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers LIMIT 1`
    
    // Test vehicles table
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles LIMIT 1`
    
    // Test correspondence table (if exists)
    let correspondenceExists = false
    try {
      await sql`SELECT 1 FROM customer_correspondence LIMIT 1`
      correspondenceExists = true
    } catch (error) {
      // Table might not exist yet
    }

    return {
      status: 'passed',
      details: {
        connectivity: 'Connected',
        customers: customerCount[0].count,
        vehicles: vehicleCount[0].count,
        correspondenceTable: correspondenceExists ? 'Exists' : 'Not created yet'
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: { error: error.message }
    }
  }
}

async function testSMS(testPhoneNumber: string, dryRun: boolean) {
  try {
    const config = TwilioService.getConfiguration()
    
    if (!config.smsConfigured) {
      return {
        status: 'failed',
        details: {
          error: 'SMS not configured',
          config
        }
      }
    }

    if (dryRun) {
      return {
        status: 'passed',
        details: {
          message: 'SMS configuration valid (dry run)',
          config,
          testMessage: `Test SMS from ELI MOTORS LTD - ${new Date().toISOString()}`
        }
      }
    }

    // Send actual test SMS
    const result = await TwilioService.sendMessage({
      to: testPhoneNumber,
      body: `🧪 TEST SMS from ELI MOTORS LTD - ${new Date().toLocaleTimeString()}`,
      customerId: 'test',
      messageType: 'system_test',
      urgencyLevel: 'normal',
      channel: 'sms'
    })

    return {
      status: result.success ? 'passed' : 'failed',
      details: {
        result,
        testPhoneNumber,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: { error: error.message }
    }
  }
}

async function testWhatsApp(testPhoneNumber: string, dryRun: boolean) {
  try {
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
    
    if (!whatsappNumber) {
      return {
        status: 'failed',
        details: {
          error: 'WhatsApp number not configured',
          recommendation: 'Set TWILIO_WHATSAPP_NUMBER environment variable'
        }
      }
    }

    const isSandbox = whatsappNumber.includes('+14155238886')
    
    if (dryRun) {
      return {
        status: isSandbox ? 'warning' : 'passed',
        details: {
          message: 'WhatsApp configuration valid (dry run)',
          whatsappNumber,
          mode: isSandbox ? 'Sandbox' : 'Production',
          testMessage: `🧪 TEST WhatsApp from ELI MOTORS LTD - ${new Date().toISOString()}`,
          sandboxWarning: isSandbox ? 'Using sandbox - requires "join <sandbox-name>" first' : null
        }
      }
    }

    // Send actual test WhatsApp
    const result = await WhatsAppService.sendWhatsAppMessage({
      to: testPhoneNumber,
      content: `🧪 TEST WhatsApp from ELI MOTORS LTD\n\nThis is a system test message.\nTime: ${new Date().toLocaleTimeString()}`,
      customerId: 'test',
      messageType: 'system_test'
    })

    return {
      status: result.success ? 'passed' : (isSandbox ? 'warning' : 'failed'),
      details: {
        result,
        testPhoneNumber,
        mode: isSandbox ? 'Sandbox' : 'Production',
        timestamp: new Date().toISOString(),
        sandboxNote: isSandbox ? 'If failed, ensure you\'ve joined the sandbox first' : null
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: { error: error.message }
    }
  }
}

async function testSmartSend(testPhoneNumber: string, dryRun: boolean) {
  try {
    // Create a test customer record temporarily
    const testCustomer = {
      id: 'test-customer',
      first_name: 'Test',
      last_name: 'Customer',
      email: 'test@elimotors.com',
      twilio_phone: testPhoneNumber,
      registration: 'TEST123'
    }

    // Test smart send logic (always dry run for testing)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/communication/smart-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'test-customer',
        messageType: 'system_test',
        content: 'This is a smart send system test',
        dryRun: true // Always dry run for testing
      })
    })

    if (!response.ok) {
      throw new Error(`Smart send API returned ${response.status}`)
    }

    const result = await response.json()

    return {
      status: result.success ? 'passed' : 'failed',
      details: {
        result,
        testCustomer,
        apiResponse: result
      }
    }

  } catch (error) {
    return {
      status: 'failed',
      details: { error: error.message }
    }
  }
}

async function testWebhooks() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhooks = {
      sms: `${baseUrl}/api/webhooks/communication-responses`,
      whatsapp: `${baseUrl}/api/whatsapp/webhook`,
      voice: `${baseUrl}/api/voice/webhook`
    }

    const issues = []
    const details = { webhooks }

    // Check if webhooks are accessible
    for (const [type, url] of Object.entries(webhooks)) {
      try {
        const response = await fetch(url, { method: 'GET' })
        details[`${type}Status`] = response.ok ? 'Accessible' : `HTTP ${response.status}`
      } catch (error) {
        details[`${type}Status`] = 'Not accessible'
        issues.push(`${type} webhook not accessible`)
      }
    }

    // Check Twilio webhook configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER

    if (accountSid && authToken && phoneNumber) {
      try {
        const client = twilio(accountSid, authToken)
        const numbers = await client.incomingPhoneNumbers.list({
          phoneNumber: phoneNumber
        })

        if (numbers.length > 0) {
          const number = numbers[0]
          details.twilioWebhooks = {
            smsUrl: number.smsUrl || 'Not configured',
            voiceUrl: number.voiceUrl || 'Not configured',
            statusCallback: number.statusCallback || 'Not configured'
          }

          if (!number.smsUrl) issues.push('SMS webhook not configured in Twilio')
          if (!number.voiceUrl) issues.push('Voice webhook not configured in Twilio')
        } else {
          issues.push('Phone number not found in Twilio account')
        }
      } catch (error) {
        issues.push(`Failed to check Twilio webhook config: ${error.message}`)
      }
    }

    return {
      status: issues.length === 0 ? 'passed' : 'warning',
      issues,
      details
    }

  } catch (error) {
    return {
      status: 'failed',
      details: { error: error.message }
    }
  }
}

function generateRecommendations(results: any): string[] {
  const recommendations = []

  // Configuration recommendations
  if (results.configuration?.status === 'failed') {
    recommendations.push('🔧 Complete Twilio configuration in environment variables')
    recommendations.push('📱 Verify Twilio account credentials and phone number')
  }

  // WhatsApp recommendations
  if (results.whatsapp?.details?.mode === 'Sandbox') {
    recommendations.push('📱 Consider upgrading to WhatsApp Business API for production')
    recommendations.push('💬 For sandbox testing, ensure customers join with "join <sandbox-name>"')
  }

  // Webhook recommendations
  if (results.webhooks?.status !== 'passed') {
    recommendations.push('🔗 Configure webhooks in Twilio Console for real-time message handling')
    recommendations.push('🌐 Ensure webhook URLs are publicly accessible (use ngrok for local testing)')
  }

  // Database recommendations
  if (results.database?.details?.correspondenceTable === 'Not created yet') {
    recommendations.push('🗄️ Run database migration to create correspondence tracking tables')
  }

  // General recommendations
  recommendations.push('🧪 Test with your own phone number first')
  recommendations.push('📊 Monitor costs and success rates in the communications dashboard')
  recommendations.push('🔒 Ensure HTTPS for all webhook URLs in production')

  return recommendations
}

export async function GET() {
  try {
    // Return test configuration and available test types
    return NextResponse.json({
      success: true,
      availableTests: {
        full: 'Complete system test (recommended)',
        config: 'Configuration and credentials only',
        sms: 'SMS functionality test',
        whatsapp: 'WhatsApp functionality test',
        database: 'Database connectivity test'
      },
      testEndpoint: '/api/test-communication-system',
      sampleRequest: {
        testType: 'full',
        testPhoneNumber: '+447488896449',
        dryRun: true
      },
      currentConfiguration: {
        twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        smsConfigured: !!process.env.TWILIO_PHONE_NUMBER,
        whatsappConfigured: !!process.env.TWILIO_WHATSAPP_NUMBER,
        databaseConfigured: !!process.env.DATABASE_URL,
        emailConfigured: !!process.env.RESEND_API_KEY
      }
    })

  } catch (error) {
    console.error('[COMM-TEST] Error getting test info:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get test information"
    }, { status: 500 })
  }
}
