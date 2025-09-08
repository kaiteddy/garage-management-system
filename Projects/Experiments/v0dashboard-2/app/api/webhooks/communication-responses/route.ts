import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

/**
 * Unified Communication Response Webhook
 * POST /api/webhooks/communication-responses
 * 
 * Handles incoming responses from WhatsApp, SMS, and other channels
 * Automatically processes customer responses and triggers appropriate actions
 */
export async function POST(request: Request) {
  try {
    console.log('[WEBHOOK-RESPONSES] 📨 Processing incoming communication response...')
    
    const body = await request.formData()
    
    // Extract common Twilio webhook parameters
    const From = body.get('From')?.toString() || ''
    const To = body.get('To')?.toString() || ''
    const Body = body.get('Body')?.toString() || ''
    const MessageSid = body.get('MessageSid')?.toString() || ''
    const MessageStatus = body.get('MessageStatus')?.toString() || ''
    const AccountSid = body.get('AccountSid')?.toString() || ''

    // Determine communication type
    const isWhatsApp = From.startsWith('whatsapp:') || To.startsWith('whatsapp:')
    const communicationType = isWhatsApp ? 'whatsapp' : 'sms'
    
    // Clean phone number
    const phoneNumber = From.replace('whatsapp:', '').replace('+', '')
    
    console.log(`[WEBHOOK-RESPONSES] 📱 ${communicationType.toUpperCase()} from ${phoneNumber}: "${Body}"`)

    // Verify this is from Twilio (basic security check)
    if (process.env.TWILIO_ACCOUNT_SID && AccountSid !== process.env.TWILIO_ACCOUNT_SID) {
      console.log('[WEBHOOK-RESPONSES] ⚠️ Invalid AccountSid, ignoring webhook')
      return NextResponse.json({ success: false, error: 'Invalid account' }, { status: 403 })
    }

    // Handle status updates vs new messages
    if (MessageStatus && !Body) {
      // This is a delivery status update
      await handleDeliveryStatus(MessageSid, MessageStatus, communicationType)
      return NextResponse.json({ success: true, type: 'status_update' })
    }

    if (!Body || Body.trim() === '') {
      console.log('[WEBHOOK-RESPONSES] ⚠️ Empty message body, ignoring')
      return NextResponse.json({ success: true, type: 'empty_message' })
    }

    // Find customer by phone number
    const customer = await findCustomerByPhone(phoneNumber)
    
    if (!customer) {
      console.log(`[WEBHOOK-RESPONSES] ⚠️ Customer not found for phone ${phoneNumber}`)
      // Still log the response for manual review
      await logUnknownResponse(phoneNumber, Body, communicationType, MessageSid)
      return NextResponse.json({ success: true, type: 'unknown_customer' })
    }

    console.log(`[WEBHOOK-RESPONSES] 👤 Customer found: ${customer.first_name} ${customer.last_name} (ID: ${customer.id})`)

    // Log the incoming response in correspondence history
    const correspondenceId = await logIncomingResponse({
      customerId: customer.id,
      phoneNumber,
      message: Body,
      communicationType,
      messageSid: MessageSid
    })

    // Process the response using automated response system
    const responseResult = await processCustomerResponse({
      customerId: customer.id,
      phoneNumber,
      message: Body,
      communicationType,
      correspondenceId
    })

    // Update correspondence with response processing results
    if (correspondenceId && responseResult.processed) {
      await sql`
        UPDATE customer_correspondence 
        SET 
          responded_at = NOW(),
          status = 'responded',
          updated_at = NOW()
        WHERE id = ${correspondenceId}
      `
    }

    return NextResponse.json({
      success: true,
      type: 'customer_response',
      customer: {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`
      },
      response: responseResult
    })

  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] ❌ Error processing webhook:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process communication response",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function findCustomerByPhone(phoneNumber: string) {
  try {
    // Try multiple phone number formats
    const phoneVariations = [
      phoneNumber,
      `+${phoneNumber}`,
      `44${phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber}`,
      `+44${phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber}`,
      phoneNumber.startsWith('44') ? `0${phoneNumber.substring(2)}` : phoneNumber
    ]

    const customer = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.twilio_phone,
        c.contact_preference,
        c.opt_out,
        
        -- Get most recent vehicle for context
        v.registration,
        v.make,
        v.model,
        v.mot_expiry
        
      FROM customers c
      LEFT JOIN vehicles v ON c.id::text = v.customer_id
      WHERE c.twilio_phone = ANY(${phoneVariations})
         OR c.phone = ANY(${phoneVariations})
      ORDER BY v.mot_expiry DESC NULLS LAST
      LIMIT 1
    `

    return customer.length > 0 ? customer[0] : null
  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error finding customer:', error)
    return null
  }
}

async function logIncomingResponse(data: {
  customerId: string
  phoneNumber: string
  message: string
  communicationType: string
  messageSid: string
}) {
  try {
    const result = await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        communication_type,
        direction,
        content,
        contact_method,
        contact_value,
        message_category,
        status,
        whatsapp_message_id,
        sms_log_id
      ) VALUES (
        ${data.customerId},
        ${data.communicationType},
        'inbound',
        ${data.message},
        'phone_number',
        ${data.phoneNumber},
        'customer_response',
        'received',
        ${data.communicationType === 'whatsapp' ? data.messageSid : null},
        ${data.communicationType === 'sms' ? data.messageSid : null}
      )
      RETURNING id
    `

    console.log(`[WEBHOOK-RESPONSES] ✅ Logged correspondence ${result[0].id}`)
    return result[0].id
  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error logging correspondence:', error)
    return null
  }
}

async function logUnknownResponse(phoneNumber: string, message: string, communicationType: string, messageSid: string) {
  try {
    await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        communication_type,
        direction,
        content,
        contact_method,
        contact_value,
        message_category,
        status,
        requires_response,
        whatsapp_message_id,
        sms_log_id
      ) VALUES (
        'unknown',
        ${communicationType},
        'inbound',
        ${message},
        'phone_number',
        ${phoneNumber},
        'unknown_customer_response',
        'received',
        true,
        ${communicationType === 'whatsapp' ? messageSid : null},
        ${communicationType === 'sms' ? messageSid : null}
      )
    `

    console.log(`[WEBHOOK-RESPONSES] ⚠️ Logged unknown customer response from ${phoneNumber}`)
  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error logging unknown response:', error)
  }
}

async function processCustomerResponse(data: {
  customerId: string
  phoneNumber: string
  message: string
  communicationType: string
  correspondenceId?: string
}) {
  try {
    // Call the automated response system
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/correspondence/automated-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: data.customerId,
        phoneNumber: data.phoneNumber,
        message: data.message,
        communicationType: data.communicationType,
        messageCategory: 'customer_response'
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log(`[WEBHOOK-RESPONSES] 🤖 Automated response processed: ${result.analysis.responseType}`)
      
      // Handle specific response types
      if (result.analysis.escalationRequired) {
        await createEscalationTask(data.customerId, data.message, result.analysis)
      }

      return {
        processed: true,
        responseType: result.analysis.responseType,
        autoResponseSent: result.response.success,
        escalationRequired: result.analysis.escalationRequired,
        detectedIntents: result.analysis.detectedIntents
      }
    } else {
      console.log(`[WEBHOOK-RESPONSES] ⚠️ Automated response failed: ${result.error}`)
      return {
        processed: false,
        error: result.error
      }
    }

  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error processing customer response:', error)
    return {
      processed: false,
      error: error instanceof Error ? error.message : 'Processing error'
    }
  }
}

async function handleDeliveryStatus(messageSid: string, status: string, communicationType: string) {
  try {
    // Update correspondence record with delivery status
    await sql`
      UPDATE customer_correspondence 
      SET 
        delivery_status = ${status},
        read_at = CASE WHEN ${status} = 'read' THEN NOW() ELSE read_at END,
        updated_at = NOW()
      WHERE (
        (communication_type = 'whatsapp' AND whatsapp_message_id = ${messageSid}) OR
        (communication_type = 'sms' AND sms_log_id = ${messageSid})
      )
    `

    // Also update WhatsApp-specific tables if applicable
    if (communicationType === 'whatsapp') {
      await sql`
        UPDATE whatsapp_messages 
        SET 
          status = ${status},
          delivered_at = CASE WHEN ${status} IN ('delivered', 'read') THEN NOW() ELSE delivered_at END,
          read_at = CASE WHEN ${status} = 'read' THEN NOW() ELSE read_at END
        WHERE message_sid = ${messageSid}
      `
    }

    console.log(`[WEBHOOK-RESPONSES] ✅ Updated delivery status: ${messageSid} -> ${status}`)
  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error updating delivery status:', error)
  }
}

async function createEscalationTask(customerId: string, message: string, analysis: any) {
  try {
    await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        communication_type,
        direction,
        subject,
        content,
        message_category,
        urgency_level,
        requires_response,
        assigned_to,
        response_deadline,
        status
      ) VALUES (
        ${customerId},
        'manual_followup',
        'outbound',
        'ESCALATION REQUIRED - Customer Response Needs Attention',
        'Customer message: "${message}"
        
Analysis: ${JSON.stringify(analysis, null, 2)}

This requires manual follow-up from staff.',
        'escalation',
        ${analysis.urgencyLevel || 'high'},
        true,
        'customer_service_team',
        ${analysis.urgencyLevel === 'critical' ? 'NOW() + INTERVAL \'2 hours\'' : 'NOW() + INTERVAL \'24 hours\''},
        'pending'
      )
    `

    console.log(`[WEBHOOK-RESPONSES] 🚨 Created escalation task for customer ${customerId}`)
  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error creating escalation task:', error)
  }
}

// Handle GET requests for webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Twilio webhook verification
    const hubChallenge = searchParams.get('hub.challenge')
    const hubVerifyToken = searchParams.get('hub.verify_token')
    
    if (hubChallenge && hubVerifyToken) {
      // Verify the token matches what we expect
      const expectedToken = process.env.TWILIO_WEBHOOK_VERIFY_TOKEN || 'eli_motors_webhook_2024'
      
      if (hubVerifyToken === expectedToken) {
        console.log('[WEBHOOK-RESPONSES] ✅ Webhook verification successful')
        return new Response(hubChallenge, { status: 200 })
      } else {
        console.log('[WEBHOOK-RESPONSES] ❌ Webhook verification failed - invalid token')
        return new Response('Forbidden', { status: 403 })
      }
    }

    // Return webhook status information
    const stats = await sql`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_responses,
        COUNT(CASE WHEN communication_type = 'whatsapp' THEN 1 END) as whatsapp_responses,
        COUNT(CASE WHEN communication_type = 'sms' THEN 1 END) as sms_responses,
        COUNT(CASE WHEN requires_response = true THEN 1 END) as pending_responses,
        MAX(created_at) as last_response_time
      FROM customer_correspondence
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    return NextResponse.json({
      success: true,
      webhook: {
        status: 'active',
        endpoint: '/api/webhooks/communication-responses',
        supportedTypes: ['whatsapp', 'sms'],
        verificationToken: process.env.TWILIO_WEBHOOK_VERIFY_TOKEN ? 'configured' : 'not_configured'
      },
      recentActivity: stats[0]
    })

  } catch (error) {
    console.error('[WEBHOOK-RESPONSES] Error handling GET request:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process webhook request"
    }, { status: 500 })
  }
}
