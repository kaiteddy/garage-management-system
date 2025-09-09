import { NextResponse } from "next/server"

/**
 * Twilio Status Callback Webhook
 * POST /api/webhooks/status-callback
 * 
 * Handles status updates for SMS and voice messages from Twilio
 */
export async function POST(request: Request) {
  try {
    console.log('[STATUS-CALLBACK] 📊 Received status callback')
    
    const formData = await request.formData()
    const statusData = Object.fromEntries(formData.entries())
    
    console.log('[STATUS-CALLBACK] Status data:', {
      MessageSid: statusData.MessageSid,
      MessageStatus: statusData.MessageStatus,
      To: statusData.To,
      From: statusData.From,
      ErrorCode: statusData.ErrorCode,
      ErrorMessage: statusData.ErrorMessage
    })

    // Log the status update
    const logEntry = {
      timestamp: new Date().toISOString(),
      messageSid: statusData.MessageSid,
      status: statusData.MessageStatus,
      to: statusData.To,
      from: statusData.From,
      errorCode: statusData.ErrorCode,
      errorMessage: statusData.ErrorMessage,
      type: 'status_callback'
    }

    // Here you could store this in your database if needed
    // await storeStatusUpdate(logEntry)

    // Handle different status types
    switch (statusData.MessageStatus) {
      case 'delivered':
        console.log('[STATUS-CALLBACK] ✅ Message delivered successfully')
        break
      case 'failed':
        console.log('[STATUS-CALLBACK] ❌ Message failed:', statusData.ErrorMessage)
        break
      case 'undelivered':
        console.log('[STATUS-CALLBACK] ⚠️ Message undelivered:', statusData.ErrorMessage)
        break
      case 'sent':
        console.log('[STATUS-CALLBACK] 📤 Message sent')
        break
      case 'queued':
        console.log('[STATUS-CALLBACK] ⏳ Message queued')
        break
      default:
        console.log('[STATUS-CALLBACK] 📋 Status update:', statusData.MessageStatus)
    }

    return NextResponse.json({
      success: true,
      message: "Status callback processed",
      status: statusData.MessageStatus
    })

  } catch (error) {
    console.error('[STATUS-CALLBACK] ❌ Error processing status callback:', error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to process status callback",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Handle GET requests for testing
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Status Callback Webhook",
    status: "active",
    description: "Handles status updates for SMS and voice messages",
    timestamp: new Date().toISOString()
  })
}
