import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import twilio from "twilio"

export async function POST(request: Request) {
  try {
    const { 
      reminderType = 'mot_expiry',
      dryRun = true,
      batchSize = 50,
      delayBetweenBatches = 60000, // 1 minute
      useWhatsApp = true,
      fallbackToSMS = true
    } = await request.json()

    console.log('[BULK-REMINDERS] Starting bulk reminder process...')
    console.log(`[BULK-REMINDERS] Dry run: ${dryRun}, Batch size: ${batchSize}`)

    // Get all customers needing MOT reminders
    const customersNeedingReminders = await sql`
      SELECT DISTINCT
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone_number,
        c.email,
        v.id as vehicle_id,
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        v.mot_due_date,
        CASE 
          WHEN v.mot_expiry_date <= CURRENT_DATE THEN 'EXPIRED'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'FUTURE'
        END as urgency_level,
        (v.mot_expiry_date - CURRENT_DATE) as days_until_expiry
      FROM customers c
      JOIN vehicles v ON c.id = v.customer_id
      WHERE v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        AND c.phone_number IS NOT NULL
        AND c.phone_number != ''
      ORDER BY v.mot_expiry_date ASC, urgency_level DESC
    `

    console.log(`[BULK-REMINDERS] Found ${customersNeedingReminders.length} customers needing reminders`)

    // Calculate costs
    const costEstimate = {
      total_messages: customersNeedingReminders.length,
      whatsapp_cost: customersNeedingReminders.length * 0.005, // £0.005 per WhatsApp
      sms_cost: customersNeedingReminders.length * 0.05, // £0.05 per SMS
      savings_with_whatsapp: (customersNeedingReminders.length * 0.05) - (customersNeedingReminders.length * 0.005)
    }

    if (dryRun) {
      // Return analysis without sending
      return NextResponse.json({
        success: true,
        dry_run: true,
        analysis: {
          total_customers: customersNeedingReminders.length,
          urgency_breakdown: {
            expired: customersNeedingReminders.filter(c => c.urgency_level === 'EXPIRED').length,
            critical: customersNeedingReminders.filter(c => c.urgency_level === 'CRITICAL').length,
            due_soon: customersNeedingReminders.filter(c => c.urgency_level === 'DUE_SOON').length,
            future: customersNeedingReminders.filter(c => c.urgency_level === 'FUTURE').length
          },
          cost_estimate: costEstimate,
          batch_info: {
            total_batches: Math.ceil(customersNeedingReminders.length / batchSize),
            estimated_duration_minutes: Math.ceil(customersNeedingReminders.length / batchSize) * (delayBetweenBatches / 60000),
            messages_per_batch: batchSize
          }
        },
        sample_customers: customersNeedingReminders.slice(0, 5).map(c => ({
          name: `${c.first_name} ${c.last_name}`,
          phone: c.phone_number,
          vehicle: `${c.make} ${c.model} (${c.registration})`,
          mot_expiry: c.mot_expiry_date,
          urgency: c.urgency_level,
          days_until_expiry: c.days_until_expiry
        })),
        next_steps: [
          "Review the analysis above",
          "Confirm batch size and timing",
          "Set dryRun: false to start sending",
          "Monitor progress via status endpoint"
        ]
      })
    }

    // If not dry run, start sending reminders
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    let sentCount = 0
    let failedCount = 0
    const results = []

    // Process in batches
    for (let i = 0; i < customersNeedingReminders.length; i += batchSize) {
      const batch = customersNeedingReminders.slice(i, i + batchSize)
      console.log(`[BULK-REMINDERS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customersNeedingReminders.length / batchSize)}`)

      for (const customer of batch) {
        try {
          const message = generateReminderMessage(customer)
          
          let messageSent = false
          let messageResult = null

          // Try WhatsApp first if enabled
          if (useWhatsApp) {
            try {
              messageResult = await client.messages.create({
                body: message,
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:${customer.phone_number}`
              })
              messageSent = true
              console.log(`[BULK-REMINDERS] WhatsApp sent to ${customer.phone_number}`)
            } catch (whatsappError) {
              console.log(`[BULK-REMINDERS] WhatsApp failed for ${customer.phone_number}, trying SMS...`)
            }
          }

          // Fallback to SMS if WhatsApp failed or not enabled
          if (!messageSent && fallbackToSMS) {
            try {
              messageResult = await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: customer.phone_number
              })
              messageSent = true
              console.log(`[BULK-REMINDERS] SMS sent to ${customer.phone_number}`)
            } catch (smsError) {
              console.error(`[BULK-REMINDERS] Both WhatsApp and SMS failed for ${customer.phone_number}`)
            }
          }

          if (messageSent) {
            sentCount++
            results.push({
              customer_id: customer.customer_id,
              phone: customer.phone_number,
              vehicle: customer.registration,
              status: 'sent',
              message_sid: messageResult?.sid,
              method: messageResult?.from?.includes('whatsapp') ? 'whatsapp' : 'sms'
            })

            // Log to database
            await sql`
              INSERT INTO reminder_log (
                customer_id,
                vehicle_id,
                reminder_type,
                message_content,
                phone_number,
                status,
                message_sid,
                delivery_method,
                sent_at
              ) VALUES (
                ${customer.customer_id},
                ${customer.vehicle_id},
                ${reminderType},
                ${message},
                ${customer.phone_number},
                'sent',
                ${messageResult?.sid},
                ${messageResult?.from?.includes('whatsapp') ? 'whatsapp' : 'sms'},
                NOW()
              )
            `
          } else {
            failedCount++
            results.push({
              customer_id: customer.customer_id,
              phone: customer.phone_number,
              vehicle: customer.registration,
              status: 'failed'
            })
          }

        } catch (error) {
          console.error(`[BULK-REMINDERS] Error processing ${customer.phone_number}:`, error)
          failedCount++
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < customersNeedingReminders.length) {
        console.log(`[BULK-REMINDERS] Waiting ${delayBetweenBatches / 1000} seconds before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    return NextResponse.json({
      success: true,
      bulk_reminder_complete: true,
      summary: {
        total_processed: customersNeedingReminders.length,
        sent_successfully: sentCount,
        failed: failedCount,
        success_rate: `${((sentCount / customersNeedingReminders.length) * 100).toFixed(1)}%`
      },
      cost_analysis: {
        estimated_cost: useWhatsApp ? costEstimate.whatsapp_cost : costEstimate.sms_cost,
        method_used: useWhatsApp ? 'WhatsApp (with SMS fallback)' : 'SMS only',
        savings_vs_sms_only: useWhatsApp ? costEstimate.savings_with_whatsapp : 0
      },
      results: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[BULK-REMINDERS] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process bulk reminders",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateReminderMessage(customer: any): string {
  const urgencyEmoji = {
    'EXPIRED': '🚨',
    'CRITICAL': '⚠️',
    'DUE_SOON': '📅',
    'FUTURE': '🔔'
  }

  const urgencyText = {
    'EXPIRED': 'EXPIRED - Driving without valid MOT is illegal',
    'CRITICAL': `EXPIRES IN ${customer.days_until_expiry} DAYS`,
    'DUE_SOON': `Due in ${customer.days_until_expiry} days`,
    'FUTURE': 'Upcoming renewal'
  }

  return `${urgencyEmoji[customer.urgency_level]} *ELI MOTORS LTD* - MOT Reminder

Hi ${customer.first_name},

Your ${customer.make} ${customer.model} (${customer.registration}) MOT ${urgencyText[customer.urgency_level]}.

${customer.urgency_level === 'EXPIRED' ? '⚠️ *BOOK IMMEDIATELY* ⚠️' : '📅 Book your MOT test today'}

📞 Call: *0208 203 6449*
🌐 Visit: www.elimotors.co.uk

*Serving Hendon since 1979* ✨

Reply STOP to opt out.`
}

export async function GET() {
  try {
    // Get current reminder statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_due,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND v.mot_expiry_date > CURRENT_DATE THEN 1 END) as critical,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND v.mot_expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as due_soon
      FROM customers c
      JOIN vehicles v ON c.id = v.customer_id
      WHERE v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        AND c.phone_number IS NOT NULL
        AND c.phone_number != ''
    `

    return NextResponse.json({
      success: true,
      current_stats: stats[0],
      cost_estimates: {
        whatsapp_total: (stats[0].total_due * 0.005).toFixed(2),
        sms_total: (stats[0].total_due * 0.05).toFixed(2),
        savings_with_whatsapp: ((stats[0].total_due * 0.05) - (stats[0].total_due * 0.005)).toFixed(2)
      },
      recommended_approach: "Use WhatsApp Business API for 90% cost savings",
      batch_recommendations: {
        batch_size: 50,
        delay_between_batches: "1 minute",
        estimated_duration: `${Math.ceil(stats[0].total_due / 50)} minutes`
      }
    })

  } catch (error) {
    console.error('[BULK-REMINDERS] Error getting stats:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get reminder statistics"
    }, { status: 500 })
  }
}
