import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { WhatsAppService } from "@/lib/whatsapp-service"
import { TwilioService } from "@/lib/twilio-service"

/**
 * WhatsApp MOT Reminder System
 * POST /api/whatsapp/send-reminders
 * 
 * Sends WhatsApp reminders with full correspondence tracking
 */
export async function POST(request: Request) {
  try {
    console.log('[WHATSAPP-REMINDERS] 🚀 Starting WhatsApp reminder campaign...')
    
    const body = await request.json()
    const { 
      reminderType = 'mot_critical',
      dryRun = true,
      limit = 10,
      urgencyLevel = 'high',
      includeVehicleDetails = true
    } = body

    // Get customers eligible for WhatsApp reminders
    const eligibleCustomers = await getEligibleCustomers(reminderType, limit)
    
    console.log(`[WHATSAPP-REMINDERS] 📊 Found ${eligibleCustomers.length} eligible customers`)

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        eligibleCustomers: eligibleCustomers.length,
        estimatedCost: eligibleCustomers.length * 0.005, // WhatsApp conversation cost
        preview: eligibleCustomers.slice(0, 3).map(customer => ({
          customer: `${customer.first_name} ${customer.last_name}`,
          phone: customer.twilio_phone,
          vehicle: `${customer.registration} - ${customer.make} ${customer.model}`,
          motExpiry: customer.mot_expiry,
          daysUntilExpiry: customer.days_until_expiry,
          messagePreview: generateReminderMessage(customer, reminderType, urgencyLevel)
        }))
      })
    }

    // Send actual reminders
    const results = await sendWhatsAppReminders(eligibleCustomers, reminderType, urgencyLevel)
    
    return NextResponse.json({
      success: true,
      campaign: {
        type: reminderType,
        totalCustomers: eligibleCustomers.length,
        sent: results.sent,
        failed: results.failed,
        totalCost: results.totalCost,
        processingTime: results.processingTime
      },
      results: results.details
    })

  } catch (error) {
    console.error('[WHATSAPP-REMINDERS] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to send WhatsApp reminders",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function getEligibleCustomers(reminderType: string, limit: number) {
  let whereClause = ''
  
  switch (reminderType) {
    case 'mot_critical':
      whereClause = `AND v.mot_expiry < CURRENT_DATE`
      break
    case 'mot_due_soon':
      whereClause = `AND v.mot_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
      break
    case 'mot_upcoming':
      whereClause = `AND v.mot_expiry BETWEEN CURRENT_DATE + INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '60 days'`
      break
    default:
      whereClause = `AND v.mot_expiry <= CURRENT_DATE + INTERVAL '30 days'`
  }

  const customers = await sql`
    SELECT DISTINCT
      c.id as customer_id,
      c.first_name,
      c.last_name,
      c.email,
      c.twilio_phone,
      c.contact_preference,
      v.id as vehicle_id,
      v.registration,
      v.make,
      v.model,
      v.year,
      v.mot_expiry,
      v.mot_expiry - CURRENT_DATE as days_until_expiry,
      -- Check consent
      COALESCE(consent.whatsapp_consent, false) as whatsapp_consent,
      COALESCE(consent.opted_out_at IS NULL, true) as not_opted_out,
      -- Check recent communications
      last_comm.last_whatsapp_sent
    FROM customers c
    INNER JOIN vehicles v ON c.id::text = v.customer_id
    LEFT JOIN customer_consent consent ON c.id::text = consent.customer_id
    LEFT JOIN (
      SELECT 
        customer_id,
        MAX(sent_at) as last_whatsapp_sent
      FROM customer_correspondence 
      WHERE communication_type = 'whatsapp' 
        AND message_category = 'mot_reminder'
        AND sent_at > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY customer_id
    ) last_comm ON c.id::text = last_comm.customer_id
    WHERE c.twilio_phone IS NOT NULL
      AND c.twilio_phone != ''
      AND c.opt_out = false
      AND v.mot_expiry IS NOT NULL
      ${whereClause}
      AND last_comm.last_whatsapp_sent IS NULL -- Don't send if sent in last 7 days
      AND (consent.whatsapp_consent = true OR consent.whatsapp_consent IS NULL) -- Implied consent if no record
    ORDER BY v.mot_expiry ASC, c.last_name ASC
    LIMIT ${limit}
  `

  return customers
}

function generateReminderMessage(customer: any, reminderType: string, urgencyLevel: string): string {
  const customerName = customer.first_name || 'Valued Customer'
  const vehicle = `${customer.registration} ${customer.make} ${customer.model}`.trim()
  const daysUntilExpiry = customer.days_until_expiry
  
  let urgencyText = ''
  let actionText = ''
  
  if (daysUntilExpiry < 0) {
    urgencyText = '🚨 *URGENT - MOT EXPIRED*'
    actionText = 'Your vehicle is currently not road legal. Please book immediately.'
  } else if (daysUntilExpiry <= 7) {
    urgencyText = '⚠️ *MOT EXPIRES SOON*'
    actionText = 'Please book your MOT test as soon as possible.'
  } else if (daysUntilExpiry <= 30) {
    urgencyText = '📅 *MOT Due Soon*'
    actionText = 'Book your MOT test to avoid any inconvenience.'
  } else {
    urgencyText = '📋 *MOT Reminder*'
    actionText = 'Plan ahead and book your MOT test.'
  }

  const message = `${urgencyText}

Hello ${customerName},

Your vehicle ${vehicle} ${daysUntilExpiry < 0 ? 'expired' : 'expires'} ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ${daysUntilExpiry < 0 ? 'ago' : 'from now'}.

${actionText}

🔧 *ELI MOTORS LTD*
📞 Call: [Your Phone Number]
📧 Email: [Your Email]
📍 [Your Address]

Book online or call us today!

Reply STOP to opt out of reminders.`

  return message
}

async function sendWhatsAppReminders(customers: any[], reminderType: string, urgencyLevel: string) {
  const startTime = Date.now()
  let sent = 0
  let failed = 0
  let totalCost = 0
  const details: any[] = []

  for (const customer of customers) {
    try {
      const message = generateReminderMessage(customer, reminderType, urgencyLevel)
      
      // Send WhatsApp message
      const result = await WhatsAppService.sendWhatsAppMessage({
        to: customer.twilio_phone,
        content: message,
        customerId: customer.customer_id,
        vehicleRegistration: customer.registration,
        messageType: reminderType
      })

      if (result.success) {
        // Log in unified correspondence history
        await logCorrespondence({
          customerId: customer.customer_id,
          vehicleRegistration: customer.registration,
          communicationType: 'whatsapp',
          direction: 'outbound',
          subject: `MOT Reminder - ${customer.registration}`,
          content: message,
          contactMethod: 'phone_number',
          contactValue: customer.twilio_phone,
          messageCategory: 'mot_reminder',
          urgencyLevel: urgencyLevel,
          whatsappMessageId: result.conversationId,
          cost: result.cost || 0.005,
          requiresResponse: urgencyLevel === 'critical'
        })

        sent++
        totalCost += result.cost || 0.005
        
        details.push({
          customer: `${customer.first_name} ${customer.last_name}`,
          phone: customer.twilio_phone,
          vehicle: customer.registration,
          status: 'sent',
          messageSid: result.messageSid,
          cost: result.cost || 0.005
        })
      } else {
        failed++
        details.push({
          customer: `${customer.first_name} ${customer.last_name}`,
          phone: customer.twilio_phone,
          vehicle: customer.registration,
          status: 'failed',
          error: result.error
        })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      failed++
      console.error(`[WHATSAPP-REMINDERS] Error sending to ${customer.twilio_phone}:`, error)
      
      details.push({
        customer: `${customer.first_name} ${customer.last_name}`,
        phone: customer.twilio_phone,
        vehicle: customer.registration,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    sent,
    failed,
    totalCost: Math.round(totalCost * 100) / 100,
    processingTime: Date.now() - startTime,
    details
  }
}

async function logCorrespondence(data: {
  customerId: string
  vehicleRegistration?: string
  communicationType: string
  direction: string
  subject?: string
  content: string
  contactMethod: string
  contactValue: string
  messageCategory: string
  urgencyLevel: string
  whatsappMessageId?: string
  smsLogId?: number
  emailId?: string
  cost?: number
  requiresResponse?: boolean
}) {
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
        requires_response,
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
        ${data.requiresResponse || false},
        'sent'
      )
    `
    
    console.log(`[CORRESPONDENCE] ✅ Logged ${data.communicationType} communication for customer ${data.customerId}`)
  } catch (error) {
    console.error('[CORRESPONDENCE] ❌ Failed to log correspondence:', error)
  }
}

export async function GET() {
  try {
    // Get WhatsApp reminder statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN conversation_type = 'mot_reminder' THEN 1 END) as mot_conversations,
        AVG(message_count) as avg_messages_per_conversation
      FROM whatsapp_conversations
    `

    const recentMessages = await sql`
      SELECT 
        wm.id,
        wm.direction,
        wm.content,
        wm.sent_at,
        wm.status,
        wc.phone_number,
        wc.customer_id
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
      WHERE wm.sent_at > NOW() - INTERVAL '24 hours'
      ORDER BY wm.sent_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      statistics: stats[0],
      recentMessages,
      systemStatus: {
        whatsappConfigured: !!process.env.TWILIO_WHATSAPP_NUMBER,
        twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID,
        databaseReady: true
      }
    })

  } catch (error) {
    console.error('[WHATSAPP-REMINDERS] ❌ Error getting stats:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get WhatsApp statistics"
    }, { status: 500 })
  }
}
