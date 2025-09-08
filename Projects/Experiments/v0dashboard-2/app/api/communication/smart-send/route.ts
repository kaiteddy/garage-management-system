import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { TwilioService } from "@/lib/twilio-service"
import { EmailService } from "@/lib/email/email-service"

/**
 * Smart Multi-Channel Communication System
 * POST /api/communication/smart-send
 * 
 * Intelligently sends messages via the best available channel with fallback logic:
 * 1. Try WhatsApp (if customer has it and consented)
 * 2. Fallback to SMS (if phone number available)
 * 3. Fallback to Email (if email available)
 * 4. Log failed attempts for manual follow-up
 */
export async function POST(request: Request) {
  try {
    console.log('[SMART-SEND] 🎯 Starting intelligent multi-channel communication...')
    
    const body = await request.json()
    const {
      customerId,
      vehicleRegistration,
      messageType = 'mot_reminder',
      urgencyLevel = 'normal',
      content,
      subject,
      dryRun = false,
      forceChannel = null, // 'whatsapp', 'sms', 'email' to force specific channel
      enableFallback = true
    } = body

    if (!customerId && !vehicleRegistration) {
      return NextResponse.json({
        success: false,
        error: "Either customerId or vehicleRegistration is required"
      }, { status: 400 })
    }

    // Get customer communication preferences and capabilities
    const customerData = await getCustomerCommunicationProfile(customerId, vehicleRegistration)
    
    if (!customerData) {
      return NextResponse.json({
        success: false,
        error: "Customer not found"
      }, { status: 404 })
    }

    console.log(`[SMART-SEND] 📊 Customer profile: ${customerData.first_name} ${customerData.last_name}`)
    console.log(`[SMART-SEND] 📱 Available channels: ${customerData.availableChannels.join(', ')}`)

    // Generate appropriate message content for each channel
    const messageContent = content || generateMessageContent(customerData, messageType, urgencyLevel)
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        customer: {
          name: `${customerData.first_name} ${customerData.last_name}`,
          availableChannels: customerData.availableChannels,
          preferredChannel: customerData.preferredChannel,
          communicationProfile: customerData.communicationProfile
        },
        plannedExecution: await planCommunicationStrategy(customerData, messageType, forceChannel, enableFallback),
        messagePreview: {
          whatsapp: generateWhatsAppMessage(customerData, messageContent, messageType),
          sms: generateSMSMessage(customerData, messageContent, messageType),
          email: {
            subject: subject || generateEmailSubject(customerData, messageType),
            content: generateEmailMessage(customerData, messageContent, messageType)
          }
        }
      })
    }

    // Execute smart communication strategy
    const result = await executeSmartCommunication(
      customerData,
      messageContent,
      messageType,
      urgencyLevel,
      subject,
      forceChannel,
      enableFallback
    )

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('[SMART-SEND] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to send smart communication",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function getCustomerCommunicationProfile(customerId?: string, vehicleRegistration?: string) {
  try {
    let customer
    
    if (customerId) {
      customer = await sql`
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.twilio_phone,
          c.contact_preference,
          c.opt_out,
          c.opt_out_date,
          
          -- Vehicle info if available
          v.registration,
          v.make,
          v.model,
          v.year,
          v.mot_expiry,
          
          -- Consent information
          consent.whatsapp_consent,
          consent.sms_consent,
          consent.email_consent,
          consent.marketing_consent,
          consent.opted_out_at,
          
          -- Communication history
          last_whatsapp.last_whatsapp_sent,
          last_sms.last_sms_sent,
          last_email.last_email_sent,
          
          -- WhatsApp capability detection
          whatsapp_conv.id as has_whatsapp_conversation
          
        FROM customers c
        LEFT JOIN vehicles v ON c.id::text = v.customer_id
        LEFT JOIN customer_consent consent ON c.id::text = consent.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_whatsapp_sent
          FROM customer_correspondence 
          WHERE communication_type = 'whatsapp'
          GROUP BY customer_id
        ) last_whatsapp ON c.id::text = last_whatsapp.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_sms_sent
          FROM customer_correspondence 
          WHERE communication_type = 'sms'
          GROUP BY customer_id
        ) last_sms ON c.id::text = last_sms.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_email_sent
          FROM customer_correspondence 
          WHERE communication_type = 'email'
          GROUP BY customer_id
        ) last_email ON c.id::text = last_email.customer_id
        LEFT JOIN whatsapp_conversations whatsapp_conv ON c.id::text = whatsapp_conv.customer_id
        WHERE c.id = ${customerId}
        LIMIT 1
      `
    } else if (vehicleRegistration) {
      customer = await sql`
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.twilio_phone,
          c.contact_preference,
          c.opt_out,
          c.opt_out_date,
          
          -- Vehicle info
          v.registration,
          v.make,
          v.model,
          v.year,
          v.mot_expiry,
          
          -- Consent information
          consent.whatsapp_consent,
          consent.sms_consent,
          consent.email_consent,
          consent.marketing_consent,
          consent.opted_out_at,
          
          -- Communication history
          last_whatsapp.last_whatsapp_sent,
          last_sms.last_sms_sent,
          last_email.last_email_sent,
          
          -- WhatsApp capability detection
          whatsapp_conv.id as has_whatsapp_conversation
          
        FROM vehicles v
        INNER JOIN customers c ON v.customer_id = c.id::text
        LEFT JOIN customer_consent consent ON c.id::text = consent.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_whatsapp_sent
          FROM customer_correspondence 
          WHERE communication_type = 'whatsapp'
          GROUP BY customer_id
        ) last_whatsapp ON c.id::text = last_whatsapp.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_sms_sent
          FROM customer_correspondence 
          WHERE communication_type = 'sms'
          GROUP BY customer_id
        ) last_sms ON c.id::text = last_sms.customer_id
        LEFT JOIN (
          SELECT customer_id, MAX(sent_at) as last_email_sent
          FROM customer_correspondence 
          WHERE communication_type = 'email'
          GROUP BY customer_id
        ) last_email ON c.id::text = last_email.customer_id
        LEFT JOIN whatsapp_conversations whatsapp_conv ON c.id::text = whatsapp_conv.customer_id
        WHERE v.registration = ${vehicleRegistration}
        LIMIT 1
      `
    }

    if (!customer || customer.length === 0) {
      return null
    }

    const customerData = customer[0]
    
    // Determine available communication channels
    const availableChannels = []
    const communicationProfile = {
      hasWhatsApp: false,
      hasSMS: false,
      hasEmail: false,
      whatsappCapable: false,
      smsCapable: false,
      emailCapable: false
    }

    // Check WhatsApp capability
    if (customerData.twilio_phone && 
        !customerData.opt_out && 
        (customerData.whatsapp_consent !== false) &&
        !customerData.opted_out_at) {
      
      // WhatsApp is available if:
      // 1. They have a phone number
      // 2. They haven't opted out
      // 3. They haven't explicitly refused WhatsApp consent
      // 4. We have WhatsApp configured
      if (process.env.TWILIO_WHATSAPP_NUMBER) {
        availableChannels.push('whatsapp')
        communicationProfile.whatsappCapable = true
        
        // They "have" WhatsApp if we've successfully communicated before
        if (customerData.has_whatsapp_conversation || customerData.last_whatsapp_sent) {
          communicationProfile.hasWhatsApp = true
        }
      }
    }

    // Check SMS capability
    if (customerData.twilio_phone && 
        !customerData.opt_out && 
        (customerData.sms_consent !== false) &&
        !customerData.opted_out_at) {
      
      if (process.env.TWILIO_PHONE_NUMBER) {
        availableChannels.push('sms')
        communicationProfile.smsCapable = true
        communicationProfile.hasSMS = true
      }
    }

    // Check Email capability
    if (customerData.email && 
        customerData.email.includes('@') &&
        !customerData.opt_out && 
        (customerData.email_consent !== false) &&
        !customerData.opted_out_at) {
      
      if (process.env.RESEND_API_KEY) {
        availableChannels.push('email')
        communicationProfile.emailCapable = true
        communicationProfile.hasEmail = true
      }
    }

    // Determine preferred channel based on:
    // 1. Explicit preference
    // 2. Most recent successful communication
    // 3. Channel reliability order: WhatsApp > SMS > Email
    let preferredChannel = 'sms' // Default fallback

    if (customerData.contact_preference && availableChannels.includes(customerData.contact_preference)) {
      preferredChannel = customerData.contact_preference
    } else if (communicationProfile.hasWhatsApp && availableChannels.includes('whatsapp')) {
      preferredChannel = 'whatsapp'
    } else if (communicationProfile.hasSMS && availableChannels.includes('sms')) {
      preferredChannel = 'sms'
    } else if (communicationProfile.hasEmail && availableChannels.includes('email')) {
      preferredChannel = 'email'
    } else if (availableChannels.length > 0) {
      preferredChannel = availableChannels[0]
    }

    return {
      ...customerData,
      availableChannels,
      preferredChannel,
      communicationProfile
    }

  } catch (error) {
    console.error('[SMART-SEND] Error getting customer profile:', error)
    return null
  }
}

async function planCommunicationStrategy(customerData: any, messageType: string, forceChannel?: string, enableFallback = true) {
  const strategy = {
    primaryChannel: forceChannel || customerData.preferredChannel,
    fallbackChannels: [],
    reasoning: [],
    estimatedCost: 0,
    estimatedDeliveryTime: '< 1 minute'
  }

  if (forceChannel) {
    strategy.reasoning.push(`Forced to use ${forceChannel} channel`)
    if (!customerData.availableChannels.includes(forceChannel)) {
      strategy.reasoning.push(`⚠️ Warning: ${forceChannel} may not be available for this customer`)
    }
  } else {
    strategy.reasoning.push(`Primary: ${strategy.primaryChannel} (customer preference/best available)`)
  }

  if (enableFallback && !forceChannel) {
    strategy.fallbackChannels = customerData.availableChannels.filter(
      (channel: string) => channel !== strategy.primaryChannel
    )
    
    if (strategy.fallbackChannels.length > 0) {
      strategy.reasoning.push(`Fallback: ${strategy.fallbackChannels.join(' → ')}`)
    }
  }

  // Estimate costs
  const costs = { whatsapp: 0.005, sms: 0.04, email: 0.001 }
  strategy.estimatedCost = costs[strategy.primaryChannel as keyof typeof costs] || 0

  return strategy
}

async function executeSmartCommunication(
  customerData: any,
  messageContent: string,
  messageType: string,
  urgencyLevel: string,
  subject?: string,
  forceChannel?: string,
  enableFallback = true
) {
  const executionLog = {
    customerId: customerData.id,
    customerName: `${customerData.first_name} ${customerData.last_name}`,
    attempts: [],
    finalResult: null,
    totalCost: 0,
    executionTime: Date.now()
  }

  const channelsToTry = forceChannel 
    ? [forceChannel]
    : [customerData.preferredChannel, ...customerData.availableChannels.filter(c => c !== customerData.preferredChannel)]

  for (const channel of channelsToTry) {
    if (!customerData.availableChannels.includes(channel)) {
      executionLog.attempts.push({
        channel,
        status: 'skipped',
        reason: 'Channel not available for customer'
      })
      continue
    }

    try {
      console.log(`[SMART-SEND] 📤 Attempting ${channel} for customer ${customerData.id}`)
      
      let result
      let cost = 0

      switch (channel) {
        case 'whatsapp':
          const whatsappMessage = generateWhatsAppMessage(customerData, messageContent, messageType)
          result = await WhatsAppService.sendWhatsAppMessage({
            to: customerData.twilio_phone,
            content: whatsappMessage,
            customerId: customerData.id,
            vehicleRegistration: customerData.registration,
            messageType
          })
          cost = result.cost || 0.005
          break

        case 'sms':
          const smsMessage = generateSMSMessage(customerData, messageContent, messageType)
          result = await TwilioService.sendMessage({
            to: customerData.twilio_phone,
            body: smsMessage,
            customerId: customerData.id,
            vehicleRegistration: customerData.registration,
            messageType,
            urgencyLevel,
            channel: 'sms'
          })
          cost = result.cost || 0.04
          break

        case 'email':
          const emailService = new EmailService()
          const emailSubject = subject || generateEmailSubject(customerData, messageType)
          const emailMessage = generateEmailMessage(customerData, messageContent, messageType)
          
          result = await emailService.sendEmail({
            to: customerData.email,
            subject: emailSubject,
            html: emailMessage,
            text: messageContent
          })
          cost = 0.001
          break

        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }

      executionLog.attempts.push({
        channel,
        status: result.success ? 'success' : 'failed',
        cost,
        messageId: result.messageSid || result.messageId,
        error: result.error,
        timestamp: new Date().toISOString()
      })

      if (result.success) {
        // Log successful communication
        await logCorrespondence({
          customerId: customerData.id,
          vehicleRegistration: customerData.registration,
          communicationType: channel,
          direction: 'outbound',
          subject: subject || `${messageType} - ${customerData.registration}`,
          content: channel === 'email' ? emailMessage : (channel === 'whatsapp' ? whatsappMessage : smsMessage),
          contactMethod: channel === 'email' ? 'email_address' : 'phone_number',
          contactValue: channel === 'email' ? customerData.email : customerData.twilio_phone,
          messageCategory: messageType,
          urgencyLevel,
          cost,
          whatsappMessageId: channel === 'whatsapp' ? result.conversationId : null,
          smsLogId: channel === 'sms' ? result.logId : null,
          emailId: channel === 'email' ? result.messageId : null
        })

        executionLog.finalResult = {
          success: true,
          channel,
          cost,
          messageId: result.messageSid || result.messageId
        }
        executionLog.totalCost = cost
        break
      }

      // If this attempt failed and fallback is disabled, stop here
      if (!enableFallback) {
        break
      }

    } catch (error) {
      console.error(`[SMART-SEND] Error with ${channel}:`, error)
      
      executionLog.attempts.push({
        channel,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })

      if (!enableFallback) {
        break
      }
    }
  }

  // If all attempts failed, log for manual follow-up
  if (!executionLog.finalResult) {
    await logFailedCommunication(customerData, messageType, executionLog.attempts)
    
    executionLog.finalResult = {
      success: false,
      error: 'All communication channels failed',
      requiresManualFollowUp: true
    }
  }

  executionLog.executionTime = Date.now() - executionLog.executionTime

  return executionLog
}

function generateMessageContent(customerData: any, messageType: string, urgencyLevel: string): string {
  const customerName = customerData.first_name || 'Valued Customer'
  const vehicle = `${customerData.registration} ${customerData.make} ${customerData.model}`.trim()
  
  switch (messageType) {
    case 'mot_reminder':
      const daysUntilExpiry = customerData.mot_expiry 
        ? Math.ceil((new Date(customerData.mot_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0

      if (daysUntilExpiry < 0) {
        return `URGENT: ${customerName}, your vehicle ${vehicle} MOT expired ${Math.abs(daysUntilExpiry)} days ago. Please book immediately.`
      } else if (daysUntilExpiry <= 7) {
        return `${customerName}, your vehicle ${vehicle} MOT expires in ${daysUntilExpiry} days. Please book soon.`
      } else {
        return `${customerName}, your vehicle ${vehicle} MOT expires in ${daysUntilExpiry} days. Book your test today.`
      }

    case 'service_reminder':
      return `${customerName}, it's time for your vehicle ${vehicle} service. Contact us to book.`

    case 'appointment_confirmation':
      return `${customerName}, this confirms your appointment for ${vehicle}. We look forward to seeing you.`

    default:
      return `Hello ${customerName}, we have an update regarding your vehicle ${vehicle}.`
  }
}

function generateWhatsAppMessage(customerData: any, content: string, messageType: string): string {
  const emoji = messageType === 'mot_reminder' ? '🚗' : '🔧'
  
  return `${emoji} *ELI MOTORS LTD*

${content}

📞 Call: [Your Phone Number]
📧 Email: [Your Email]
📍 [Your Address]

Reply STOP to opt out.`
}

function generateSMSMessage(customerData: any, content: string, messageType: string): string {
  return `ELI MOTORS: ${content}

Call [Your Phone Number] to book.

Reply STOP to opt out.`
}

function generateEmailSubject(customerData: any, messageType: string): string {
  const vehicle = `${customerData.registration} ${customerData.make} ${customerData.model}`.trim()
  
  switch (messageType) {
    case 'mot_reminder':
      return `MOT Reminder - ${vehicle} - ELI MOTORS LTD`
    case 'service_reminder':
      return `Service Reminder - ${vehicle} - ELI MOTORS LTD`
    case 'appointment_confirmation':
      return `Appointment Confirmation - ${vehicle} - ELI MOTORS LTD`
    default:
      return `Vehicle Update - ${vehicle} - ELI MOTORS LTD`
  }
}

function generateEmailMessage(customerData: any, content: string, messageType: string): string {
  const customerName = customerData.first_name || 'Valued Customer'
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c5aa0;">ELI MOTORS LTD</h2>
          
          <p>Dear ${customerName},</p>
          
          <p>${content}</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p><strong>Phone:</strong> [Your Phone Number]<br>
            <strong>Email:</strong> [Your Email]<br>
            <strong>Address:</strong> [Your Address]</p>
          </div>
          
          <p>Thank you for choosing ELI MOTORS LTD.</p>
          
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            If you no longer wish to receive these communications, please contact us directly.
          </p>
        </div>
      </body>
    </html>
  `
}

async function logCorrespondence(data: any) {
  try {
    await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        vehicle_registration,
        communication_type,
        direction,
        subject,
        content,
        contact_method,
        contact_value,
        message_category,
        urgency_level,
        whatsapp_message_id,
        sms_log_id,
        email_id,
        cost,
        status
      ) VALUES (
        ${data.customerId},
        ${data.vehicleRegistration || null},
        ${data.communicationType},
        ${data.direction},
        ${data.subject || null},
        ${data.content},
        ${data.contactMethod},
        ${data.contactValue},
        ${data.messageCategory},
        ${data.urgencyLevel},
        ${data.whatsappMessageId || null},
        ${data.smsLogId || null},
        ${data.emailId || null},
        ${data.cost || 0},
        'sent'
      )
    `
  } catch (error) {
    console.error('[SMART-SEND] Error logging correspondence:', error)
  }
}

async function logFailedCommunication(customerData: any, messageType: string, attempts: any[]) {
  try {
    await sql`
      INSERT INTO customer_correspondence (
        customer_id,
        vehicle_registration,
        communication_type,
        direction,
        subject,
        content,
        message_category,
        status,
        requires_response
      ) VALUES (
        ${customerData.id},
        ${customerData.registration || null},
        'manual_followup',
        'outbound',
        'FAILED COMMUNICATION - Manual Follow-up Required',
        'All automated communication channels failed. Attempts: ${JSON.stringify(attempts)}',
        ${messageType},
        'failed',
        true
      )
    `
    
    console.log(`[SMART-SEND] ⚠️ Logged failed communication for manual follow-up: Customer ${customerData.id}`)
  } catch (error) {
    console.error('[SMART-SEND] Error logging failed communication:', error)
  }
}

export async function GET() {
  try {
    // Get smart communication statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_communications,
        COUNT(CASE WHEN communication_type = 'whatsapp' THEN 1 END) as whatsapp_count,
        COUNT(CASE WHEN communication_type = 'sms' THEN 1 END) as sms_count,
        COUNT(CASE WHEN communication_type = 'email' THEN 1 END) as email_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN requires_response = true THEN 1 END) as manual_followup_required,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost_per_message
      FROM customer_correspondence
      WHERE created_at > NOW() - INTERVAL '30 days'
    `

    const channelEffectiveness = await sql`
      SELECT 
        communication_type,
        COUNT(*) as attempts,
        COUNT(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 END) as successful,
        ROUND(
          (COUNT(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 END)::float / COUNT(*)::float) * 100, 
          2
        ) as success_rate,
        SUM(cost) as total_cost
      FROM customer_correspondence
      WHERE created_at > NOW() - INTERVAL '30 days'
        AND direction = 'outbound'
      GROUP BY communication_type
      ORDER BY success_rate DESC
    `

    return NextResponse.json({
      success: true,
      statistics: stats[0],
      channelEffectiveness,
      systemCapabilities: {
        whatsappEnabled: !!process.env.TWILIO_WHATSAPP_NUMBER,
        smsEnabled: !!process.env.TWILIO_PHONE_NUMBER,
        emailEnabled: !!process.env.RESEND_API_KEY,
        fallbackEnabled: true,
        smartRoutingEnabled: true
      }
    })

  } catch (error) {
    console.error('[SMART-SEND] Error getting statistics:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get smart communication statistics"
    }, { status: 500 })
  }
}
