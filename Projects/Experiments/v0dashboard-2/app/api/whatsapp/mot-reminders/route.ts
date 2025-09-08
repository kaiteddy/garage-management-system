import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { TwilioService } from "@/lib/twilio-service"

/**
 * WhatsApp MOT Reminder System for ELI MOTORS LTD
 * POST /api/whatsapp/mot-reminders - Send MOT reminders via WhatsApp
 * GET /api/whatsapp/mot-reminders - Get MOT reminder status and preview
 */

interface MOTReminderData {
  customer_id: string
  first_name: string
  last_name: string
  phone_number: string
  vehicle_id: string
  registration: string
  make: string
  model: string
  mot_expiry_date: string
  urgency_level: 'EXPIRED' | 'CRITICAL' | 'DUE_SOON' | 'FUTURE'
  days_until_expiry: number
}

const GARAGE_INFO = {
  name: "ELI MOTORS LTD",
  phone: "0208 203 6449",
  established: "1979",
  location: "Hendon",
  website: "https://garage-manager.eu.ngrok.io/mot-check"
}

function generateMOTMessage(data: MOTReminderData): { message: string; urgencyEmoji: string } {
  const customerName = `${data.first_name} ${data.last_name}`.trim() || "Customer"
  const vehicle = `${data.make} ${data.model}`.trim()
  const registration = data.registration
  const expiryDate = new Date(data.mot_expiry_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  let urgencyEmoji = "📅"
  let statusMessage = ""
  let urgencyText = ""

  switch (data.urgency_level) {
    case 'EXPIRED':
      urgencyEmoji = "🚨"
      statusMessage = "Your vehicle MOT has EXPIRED!"
      urgencyText = `EXPIRED ${Math.abs(data.days_until_expiry)} days ago`
      break
    case 'CRITICAL':
      urgencyEmoji = "⚠️"
      statusMessage = "Your vehicle MOT expires very soon!"
      urgencyText = `${data.days_until_expiry} days left`
      break
    case 'DUE_SOON':
      urgencyEmoji = "📅"
      statusMessage = "Your vehicle MOT expires soon!"
      urgencyText = `${data.days_until_expiry} days left`
      break
    default:
      urgencyEmoji = "📅"
      statusMessage = "Your vehicle MOT expires soon!"
      urgencyText = `${data.days_until_expiry} days left`
  }

  // Create professional message matching your format
  const message = `🚗 ${GARAGE_INFO.name} - MOT Reminder

${urgencyEmoji} ${statusMessage}

🔍 Vehicle: ${vehicle}
📍 Registration: ${registration}
⏰ MOT Due: ${expiryDate}

📞 Book now: ${GARAGE_INFO.phone}
🌐 Check MOT: ${GARAGE_INFO.website}

📱 Reply STOP to opt out
🔧 ${GARAGE_INFO.name} - Serving ${GARAGE_INFO.location} since ${GARAGE_INFO.established}`

  return { message, urgencyEmoji }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const urgencyFilter = searchParams.get('urgency') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const preview = searchParams.get('preview') === 'true'

    console.log('[WHATSAPP-MOT] Getting MOT reminders...', { urgencyFilter, limit, preview })

    // Get customers needing MOT reminders based on urgency filter
    let motReminders

    if (urgencyFilter === 'expired') {
      motReminders = await sql`
        SELECT
          c.id as customer_id,
          c.first_name,
          c.last_name,
          COALESCE(c.twilio_phone, c.phone) as phone_number,
          v.registration as vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          'EXPIRED' as urgency_level,
          (CURRENT_DATE - v.mot_expiry_date) as days_until_expiry
        FROM customers c
        JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
        WHERE v.mot_expiry_date IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) != ''
          AND (c.opt_out = FALSE OR c.opt_out IS NULL)
          AND v.mot_expiry_date < CURRENT_DATE
        ORDER BY v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    } else if (urgencyFilter === 'critical') {
      motReminders = await sql`
        SELECT
          c.id as customer_id,
          c.first_name,
          c.last_name,
          COALESCE(c.twilio_phone, c.phone) as phone_number,
          v.registration as vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          'CRITICAL' as urgency_level,
          (v.mot_expiry_date - CURRENT_DATE) as days_until_expiry
        FROM customers c
        JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
        WHERE v.mot_expiry_date IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) != ''
          AND (c.opt_out = FALSE OR c.opt_out IS NULL)
          AND v.mot_expiry_date >= CURRENT_DATE
          AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    } else {
      // All upcoming MOT reminders
      motReminders = await sql`
        SELECT
          c.id as customer_id,
          c.first_name,
          c.last_name,
          COALESCE(c.twilio_phone, c.phone) as phone_number,
          v.registration as vehicle_id,
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
            ELSE 'FUTURE'
          END as urgency_level,
          (v.mot_expiry_date - CURRENT_DATE) as days_until_expiry
        FROM customers c
        JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
        WHERE v.mot_expiry_date IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) IS NOT NULL
          AND COALESCE(c.twilio_phone, c.phone) != ''
          AND (c.opt_out = FALSE OR c.opt_out IS NULL)
          AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        ORDER BY
          CASE
            WHEN v.mot_expiry_date < CURRENT_DATE THEN 1
            WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
            ELSE 3
          END,
          v.mot_expiry_date ASC
        LIMIT ${limit}
      `
    }

    // Generate message previews if requested
    const remindersWithPreviews = motReminders.map(reminder => {
      const { message, urgencyEmoji } = generateMOTMessage(reminder as MOTReminderData)

      return {
        ...reminder,
        urgency_emoji: urgencyEmoji,
        message_preview: preview ? message : undefined,
        estimated_cost: 0.005, // WhatsApp cost
        fallback_cost: 0.04    // SMS fallback cost
      }
    })

    // Calculate summary statistics
    const summary = {
      total_reminders: motReminders.length,
      expired: motReminders.filter(r => r.urgency_level === 'EXPIRED').length,
      critical: motReminders.filter(r => r.urgency_level === 'CRITICAL').length,
      due_soon: motReminders.filter(r => r.urgency_level === 'DUE_SOON').length,
      estimated_whatsapp_cost: motReminders.length * 0.005,
      estimated_sms_cost: motReminders.length * 0.04,
      potential_savings: motReminders.length * (0.04 - 0.005)
    }

    return NextResponse.json({
      success: true,
      summary,
      reminders: remindersWithPreviews,
      whatsapp_configured: TwilioService.isWhatsAppConfigured(),
      garage_info: GARAGE_INFO
    })

  } catch (error) {
    console.error('[WHATSAPP-MOT] Error getting reminders:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      urgencyFilter = 'all',
      limit = 10,
      testMode = false,
      specificCustomerIds = [],
      useTemplate = true
    } = body

    console.log('[WHATSAPP-MOT] Sending MOT reminders...', { urgencyFilter, limit, testMode })

    // Get reminders to send (reuse GET logic)
    const getResponse = await fetch(`${request.url}?urgency=${urgencyFilter}&limit=${limit}&preview=true`)
    const reminderData = await getResponse.json()

    if (!reminderData.success) {
      throw new Error('Failed to get reminder data')
    }

    let remindersToSend = reminderData.reminders

    // Filter by specific customer IDs if provided
    if (specificCustomerIds.length > 0) {
      remindersToSend = remindersToSend.filter(r =>
        specificCustomerIds.includes(r.customer_id)
      )
    }

    const results = []
    let sentCount = 0
    let failedCount = 0

    for (const reminder of remindersToSend) {
      try {
        const { message } = generateMOTMessage(reminder as MOTReminderData)

        if (testMode) {
          // Test mode - don't actually send
          results.push({
            customer_id: reminder.customer_id,
            registration: reminder.registration,
            customer_name: `${reminder.first_name} ${reminder.last_name}`.trim(),
            phone: reminder.phone_number,
            urgency: reminder.urgency_level,
            status: 'test_mode',
            message_preview: message.substring(0, 100) + '...'
          })
          sentCount++
        } else {
          // Send WhatsApp message using approved template
          const customerName = `${reminder.first_name} ${reminder.last_name}`.trim()
          const motExpiryDate = new Date(reminder.mot_expiry_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          const daysRemaining = Math.abs(reminder.days_until_expiry).toString()

          const result = await TwilioService.sendWhatsAppTemplate({
            to: reminder.phone_number,
            customerName,
            vehicleRegistration: reminder.registration,
            motExpiryDate,
            daysRemaining,
            customerId: reminder.customer_id,
            messageType: 'mot_reminder',
            urgencyLevel: reminder.urgency_level.toLowerCase()
          })

          if (result.success) {
            // Log successful reminder
            await sql`
              INSERT INTO sms_log (
                customer_id,
                phone_number,
                vehicle_registration,
                message_type,
                message_content,
                urgency_level,
                estimated_cost,
                sent_at,
                status,
                twilio_sid
              ) VALUES (
                ${reminder.customer_id},
                ${reminder.phone_number},
                ${reminder.registration},
                'mot_reminder_whatsapp_template',
                ${'WhatsApp Template: MOT Reminder from Eli Motors Ltd'},
                ${reminder.urgency_level.toLowerCase()},
                ${result.cost || 0.005},
                NOW(),
                'sent',
                ${result.messageSid}
              )
            `

            results.push({
              customer_id: reminder.customer_id,
              registration: reminder.registration,
              customer_name: `${reminder.first_name} ${reminder.last_name}`.trim(),
              phone: reminder.phone_number,
              urgency: reminder.urgency_level,
              status: 'sent',
              channel: result.channel,
              message_sid: result.messageSid,
              cost: result.cost
            })
            sentCount++
          } else {
            throw new Error(result.error || 'Failed to send message')
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`[WHATSAPP-MOT] Error sending to ${reminder.registration}:`, error)

        results.push({
          customer_id: reminder.customer_id,
          registration: reminder.registration,
          customer_name: `${reminder.first_name} ${reminder.last_name}`.trim(),
          phone: reminder.phone_number,
          urgency: reminder.urgency_level,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `MOT reminders processed: ${sentCount} sent, ${failedCount} failed`,
      summary: {
        total_processed: remindersToSend.length,
        sent: sentCount,
        failed: failedCount,
        test_mode: testMode
      },
      results
    })

  } catch (error) {
    console.error('[WHATSAPP-MOT] Error sending reminders:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
