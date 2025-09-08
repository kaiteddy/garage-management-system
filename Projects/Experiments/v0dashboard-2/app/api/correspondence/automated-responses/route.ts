import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { TwilioService } from "@/lib/twilio-service"
import { EmailService } from "@/lib/email/email-service"

/**
 * Automated Response Management System
 * POST /api/correspondence/automated-responses
 * 
 * Processes incoming customer communications and sends automated responses
 */
export async function POST(request: Request) {
  try {
    console.log('[AUTO-RESPONSE] 🤖 Processing automated response...')
    
    const body = await request.json()
    const {
      customerId,
      phoneNumber,
      emailAddress,
      message,
      communicationType, // 'whatsapp', 'sms', 'email'
      messageCategory = 'general'
    } = body

    // Validate input
    if (!message || !communicationType) {
      return NextResponse.json({
        success: false,
        error: "Message and communication type are required"
      }, { status: 400 })
    }

    // Log the incoming message in correspondence history
    await logIncomingCorrespondence({
      customerId,
      phoneNumber,
      emailAddress,
      message,
      communicationType,
      messageCategory
    })

    // Analyze message and determine response
    const analysis = await analyzeMessage(message, communicationType)
    
    // Check if automated response is needed
    if (analysis.requiresResponse) {
      const response = await generateAutomatedResponse(analysis, {
        customerId,
        phoneNumber,
        emailAddress,
        communicationType,
        originalMessage: message
      })

      if (response.success) {
        // Log the outgoing automated response
        await logOutgoingCorrespondence({
          customerId,
          phoneNumber,
          emailAddress,
          message: response.message,
          communicationType,
          messageCategory: 'auto_response',
          autoResponseType: analysis.responseType,
          cost: response.cost
        })
      }

      return NextResponse.json({
        success: true,
        analysis,
        response,
        correspondenceLogged: true
      })
    }

    return NextResponse.json({
      success: true,
      analysis,
      response: { success: false, reason: "No automated response required" },
      correspondenceLogged: true
    })

  } catch (error) {
    console.error('[AUTO-RESPONSE] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process automated response",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function analyzeMessage(message: string, communicationType: string) {
  const lowerMessage = message.toLowerCase().trim()
  
  // Opt-out detection
  const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove me', 'no more', 'cancel']
  const isOptOut = optOutKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Vehicle sold detection
  const soldKeywords = ['sold', 'no longer own', 'not my car', 'wrong number', 'sold the car']
  const isVehicleSold = soldKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Contact update detection
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const phonePattern = /(\+44|0)[0-9\s-]{10,}/
  const hasEmail = emailPattern.test(message)
  const hasPhone = phonePattern.test(message)
  
  // Booking request detection
  const bookingKeywords = ['book', 'appointment', 'mot test', 'service', 'when can', 'available']
  const isBookingRequest = bookingKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Question detection
  const questionKeywords = ['?', 'how much', 'what time', 'when', 'where', 'how long']
  const isQuestion = questionKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Complaint detection
  const complaintKeywords = ['unhappy', 'complaint', 'poor service', 'disappointed', 'terrible']
  const isComplaint = complaintKeywords.some(keyword => lowerMessage.includes(keyword))

  let responseType = 'acknowledgment'
  let requiresResponse = true
  let escalationRequired = false
  let urgencyLevel = 'normal'

  if (isOptOut) {
    responseType = 'opt_out_confirmation'
    urgencyLevel = 'high'
  } else if (isVehicleSold) {
    responseType = 'vehicle_sold_confirmation'
    urgencyLevel = 'high'
  } else if (hasEmail || hasPhone) {
    responseType = 'contact_update_confirmation'
    urgencyLevel = 'normal'
  } else if (isBookingRequest) {
    responseType = 'booking_information'
    urgencyLevel = 'high'
    escalationRequired = true
  } else if (isComplaint) {
    responseType = 'complaint_acknowledgment'
    urgencyLevel = 'critical'
    escalationRequired = true
  } else if (isQuestion) {
    responseType = 'information_request'
    urgencyLevel = 'normal'
    escalationRequired = true
  } else {
    responseType = 'general_acknowledgment'
    requiresResponse = false // Don't auto-respond to general messages
  }

  return {
    requiresResponse,
    responseType,
    escalationRequired,
    urgencyLevel,
    detectedIntents: {
      isOptOut,
      isVehicleSold,
      hasContactUpdate: hasEmail || hasPhone,
      isBookingRequest,
      isQuestion,
      isComplaint,
      extractedEmail: hasEmail ? message.match(emailPattern)?.[0] : null,
      extractedPhone: hasPhone ? message.match(phonePattern)?.[0] : null
    }
  }
}

async function generateAutomatedResponse(analysis: any, context: any) {
  const { responseType } = analysis
  const { customerId, phoneNumber, emailAddress, communicationType, originalMessage } = context
  
  // Get customer info for personalization
  let customerName = 'Valued Customer'
  if (customerId) {
    try {
      const customer = await sql`
        SELECT first_name, last_name FROM customers WHERE id = ${customerId}
      `
      if (customer.length > 0) {
        customerName = customer[0].first_name || 'Valued Customer'
      }
    } catch (error) {
      console.log('[AUTO-RESPONSE] Could not fetch customer name')
    }
  }

  let responseMessage = ''
  let shouldSend = true

  switch (responseType) {
    case 'opt_out_confirmation':
      responseMessage = `Hello ${customerName},

We've received your request to stop receiving messages. You have been removed from our communication list.

If you need to contact us in the future, please call us directly.

Thank you,
ELI MOTORS LTD`
      
      // Process opt-out
      await processOptOut(customerId, phoneNumber, emailAddress, communicationType)
      break

    case 'vehicle_sold_confirmation':
      responseMessage = `Hello ${customerName},

Thank you for letting us know. We've updated our records to reflect that you no longer own this vehicle.

If you have a new vehicle that needs servicing, we'd be happy to help!

Best regards,
ELI MOTORS LTD`
      
      // Process vehicle sold
      await processVehicleSold(customerId, originalMessage)
      break

    case 'contact_update_confirmation':
      responseMessage = `Hello ${customerName},

Thank you for providing your updated contact information. We've noted this and will update our records.

A member of our team will review and confirm the changes shortly.

Best regards,
ELI MOTORS LTD`
      
      // Process contact update
      await processContactUpdate(customerId, analysis.detectedIntents)
      break

    case 'booking_information':
      responseMessage = `Hello ${customerName},

Thank you for your interest in booking with us!

📞 To book your MOT or service, please call us at: [Your Phone Number]
🕒 Opening hours: Monday-Friday 9AM-5PM
📧 Or email us at: [Your Email]

We'll be happy to find a convenient time for you.

Best regards,
ELI MOTORS LTD`
      break

    case 'complaint_acknowledgment':
      responseMessage = `Hello ${customerName},

Thank you for bringing this to our attention. We take all feedback seriously and want to resolve any concerns you may have.

A senior member of our team will contact you within 24 hours to discuss this further.

We appreciate your patience.

Best regards,
ELI MOTORS LTD`
      break

    case 'information_request':
      responseMessage = `Hello ${customerName},

Thank you for your message. We've received your inquiry and a member of our team will get back to you with the information you need.

For urgent matters, please call us at: [Your Phone Number]

Best regards,
ELI MOTORS LTD`
      break

    default:
      shouldSend = false
      break
  }

  if (!shouldSend) {
    return { success: false, reason: "No response template for this type" }
  }

  // Check business hours
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const isBusinessHours = day >= 1 && day <= 5 && hour >= 9 && hour <= 17

  if (!isBusinessHours && responseType !== 'opt_out_confirmation') {
    // Delay response until business hours for non-critical messages
    return { 
      success: false, 
      reason: "Response scheduled for business hours",
      scheduled: true 
    }
  }

  // Send the response
  try {
    let result
    let cost = 0

    switch (communicationType) {
      case 'whatsapp':
        result = await WhatsAppService.sendWhatsAppMessage({
          to: phoneNumber,
          content: responseMessage,
          customerId,
          messageType: 'auto_response'
        })
        cost = result.cost || 0.005
        break

      case 'sms':
        result = await TwilioService.sendAutoReply(phoneNumber, responseMessage)
        cost = result.cost || 0.04
        break

      case 'email':
        const emailService = new EmailService()
        result = await emailService.sendEmail({
          to: emailAddress,
          subject: `Re: Your Message - ELI MOTORS LTD`,
          text: responseMessage
        })
        cost = 0.001 // Minimal email cost
        break

      default:
        return { success: false, reason: "Unsupported communication type" }
    }

    return {
      success: result.success,
      message: responseMessage,
      cost,
      messageId: result.messageSid || result.messageId,
      error: result.error
    }

  } catch (error) {
    console.error('[AUTO-RESPONSE] Error sending response:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

async function logIncomingCorrespondence(data: any) {
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
        requires_response
      ) VALUES (
        ${data.customerId || 'unknown'},
        ${data.communicationType},
        'inbound',
        ${data.message},
        ${data.phoneNumber ? 'phone_number' : 'email_address'},
        ${data.phoneNumber || data.emailAddress},
        ${data.messageCategory},
        'received',
        true
      )
    `
  } catch (error) {
    console.error('[CORRESPONDENCE] Error logging incoming message:', error)
  }
}

async function logOutgoingCorrespondence(data: any) {
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
        auto_response_sent,
        auto_response_type,
        cost,
        status
      ) VALUES (
        ${data.customerId || 'unknown'},
        ${data.communicationType},
        'outbound',
        ${data.message},
        ${data.phoneNumber ? 'phone_number' : 'email_address'},
        ${data.phoneNumber || data.emailAddress},
        ${data.messageCategory},
        true,
        ${data.autoResponseType},
        ${data.cost || 0},
        'sent'
      )
    `
  } catch (error) {
    console.error('[CORRESPONDENCE] Error logging outgoing message:', error)
  }
}

async function processOptOut(customerId: string, phoneNumber: string, emailAddress: string, communicationType: string) {
  try {
    if (customerId) {
      await sql`
        UPDATE customers 
        SET opt_out = true, opt_out_date = CURRENT_DATE 
        WHERE id = ${customerId}
      `
    }

    // Update consent records
    await sql`
      INSERT INTO customer_consent (
        customer_id, 
        phone_number, 
        whatsapp_consent, 
        sms_consent, 
        email_consent,
        opted_out_at,
        opt_out_method
      ) VALUES (
        ${customerId || 'unknown'},
        ${phoneNumber || emailAddress},
        ${communicationType === 'whatsapp' ? false : null},
        ${communicationType === 'sms' ? false : null},
        ${communicationType === 'email' ? false : null},
        NOW(),
        ${communicationType}
      )
      ON CONFLICT (customer_id, phone_number) 
      DO UPDATE SET
        whatsapp_consent = CASE WHEN ${communicationType} = 'whatsapp' THEN false ELSE whatsapp_consent END,
        sms_consent = CASE WHEN ${communicationType} = 'sms' THEN false ELSE sms_consent END,
        email_consent = CASE WHEN ${communicationType} = 'email' THEN false ELSE email_consent END,
        opted_out_at = NOW(),
        opt_out_method = ${communicationType}
    `

    console.log(`[AUTO-RESPONSE] ✅ Processed opt-out for customer ${customerId}`)
  } catch (error) {
    console.error('[AUTO-RESPONSE] Error processing opt-out:', error)
  }
}

async function processVehicleSold(customerId: string, message: string) {
  try {
    // Mark vehicles as sold/inactive for this customer
    if (customerId) {
      await sql`
        UPDATE vehicles 
        SET status = 'sold', 
            notes = CONCAT(COALESCE(notes, ''), ' - Customer reported sold via ', ${message.substring(0, 100)})
        WHERE customer_id = ${customerId}
      `
    }

    console.log(`[AUTO-RESPONSE] ✅ Processed vehicle sold for customer ${customerId}`)
  } catch (error) {
    console.error('[AUTO-RESPONSE] Error processing vehicle sold:', error)
  }
}

async function processContactUpdate(customerId: string, detectedIntents: any) {
  try {
    if (customerId && (detectedIntents.extractedEmail || detectedIntents.extractedPhone)) {
      const updates: string[] = []
      const values: any[] = []

      if (detectedIntents.extractedEmail) {
        updates.push('email = $' + (values.length + 1))
        values.push(detectedIntents.extractedEmail)
      }

      if (detectedIntents.extractedPhone) {
        updates.push('phone = $' + (values.length + 1))
        values.push(detectedIntents.extractedPhone)
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()')
        values.push(customerId)

        await sql.unsafe(`
          UPDATE customers 
          SET ${updates.join(', ')}
          WHERE id = $${values.length}
        `, values)
      }
    }

    console.log(`[AUTO-RESPONSE] ✅ Processed contact update for customer ${customerId}`)
  } catch (error) {
    console.error('[AUTO-RESPONSE] Error processing contact update:', error)
  }
}

export async function GET() {
  try {
    // Get automated response statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN auto_response_sent = true THEN 1 END) as automated_responses,
        COUNT(CASE WHEN requires_response = true AND auto_response_sent = false THEN 1 END) as pending_responses,
        COUNT(CASE WHEN communication_type = 'whatsapp' THEN 1 END) as whatsapp_messages,
        COUNT(CASE WHEN communication_type = 'sms' THEN 1 END) as sms_messages,
        COUNT(CASE WHEN communication_type = 'email' THEN 1 END) as email_messages
      FROM customer_correspondence
      WHERE created_at > NOW() - INTERVAL '30 days'
    `

    const recentResponses = await sql`
      SELECT 
        id,
        customer_id,
        communication_type,
        direction,
        message_category,
        auto_response_type,
        created_at,
        status
      FROM customer_correspondence
      WHERE auto_response_sent = true
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      statistics: stats[0],
      recentResponses,
      systemStatus: {
        automatedResponsesEnabled: true,
        businessHours: {
          start: '09:00',
          end: '17:00',
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        }
      }
    })

  } catch (error) {
    console.error('[AUTO-RESPONSE] Error getting statistics:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get automated response statistics"
    }, { status: 500 })
  }
}
