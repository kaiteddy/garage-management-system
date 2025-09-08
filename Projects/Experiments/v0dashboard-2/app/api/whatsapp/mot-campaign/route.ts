import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

/**
 * WhatsApp MOT Campaign Manager for ELI MOTORS LTD
 * POST /api/whatsapp/mot-campaign - Send MOT reminders via WhatsApp using approved template
 * GET /api/whatsapp/mot-campaign - Preview MOT campaign with different urgency levels
 */

interface MOTCampaignData {
  customer_id: string
  first_name: string
  last_name: string
  phone_number: string
  vehicle_id: string
  registration: string
  make: string
  model: string
  mot_expiry_date: string
  urgency_level: 'EXPIRED' | 'CRITICAL' | 'DUE_SOON'
  days_until_expiry: number
}

const TEMPLATE_SID = "HXb5b62575e6e4ff6129ad7c8efe1f983e" // Verified working template

function formatMOTMessage(data: MOTCampaignData): { variable1: string; variable2: string } {
  const vehicle = `${data.make} ${data.model} ${data.registration}`.trim()
  const expiryDate = new Date(data.mot_expiry_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long'
  })

  let urgencyText = ""
  switch (data.urgency_level) {
    case 'EXPIRED':
      urgencyText = `MOT EXPIRED ${Math.abs(data.days_until_expiry)} days ago`
      break
    case 'CRITICAL':
      if (data.days_until_expiry === 0) {
        urgencyText = "MOT expires TODAY!"
      } else if (data.days_until_expiry === 1) {
        urgencyText = "MOT expires TOMORROW!"
      } else {
        urgencyText = `MOT expires in ${data.days_until_expiry} days`
      }
      break
    case 'DUE_SOON':
      urgencyText = `MOT expires ${expiryDate} (${data.days_until_expiry} days)`
      break
  }

  return {
    variable1: vehicle,
    variable2: urgencyText
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const urgencyFilter = searchParams.get('urgency') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log('[MOT-CAMPAIGN] Getting MOT campaign preview...', { urgencyFilter, limit })

    // Get MOT reminders based on urgency
    let whereClause = ''
    if (urgencyFilter === 'expired') {
      whereClause = 'AND v.mot_expiry_date < CURRENT_DATE'
    } else if (urgencyFilter === 'critical') {
      whereClause = 'AND v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'7 days\''
    } else if (urgencyFilter === 'due_soon') {
      whereClause = 'AND v.mot_expiry_date > CURRENT_DATE + INTERVAL \'7 days\' AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'30 days\''
    } else {
      whereClause = 'AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'60 days\''
    }

    let motCampaign

    if (urgencyFilter === 'expired') {
      motCampaign = await sql`
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
      motCampaign = await sql`
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
      motCampaign = await sql`
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

    // Format messages for preview
    const campaignPreview = motCampaign.map(reminder => {
      const { variable1, variable2 } = formatMOTMessage(reminder as MOTCampaignData)
      
      return {
        ...reminder,
        template_variables: { "1": variable1, "2": variable2 },
        expected_message: `Your appointment is coming up on ${variable1} at ${variable2}...`,
        estimated_cost: 0.005,
        urgency_emoji: reminder.urgency_level === 'EXPIRED' ? '🚨' : 
                      reminder.urgency_level === 'CRITICAL' ? '⚠️' : '📅'
      }
    })

    // Calculate campaign statistics
    const stats = {
      total_customers: motCampaign.length,
      expired: motCampaign.filter(r => r.urgency_level === 'EXPIRED').length,
      critical: motCampaign.filter(r => r.urgency_level === 'CRITICAL').length,
      due_soon: motCampaign.filter(r => r.urgency_level === 'DUE_SOON').length,
      estimated_cost: motCampaign.length * 0.005,
      potential_sms_cost: motCampaign.length * 0.04,
      savings: motCampaign.length * (0.04 - 0.005)
    }

    return NextResponse.json({
      success: true,
      campaign_stats: stats,
      template_info: {
        template_sid: TEMPLATE_SID,
        template_name: "Appointment Reminder (Multi-purpose)",
        status: "APPROVED",
        cost_per_message: "£0.005"
      },
      campaign_preview: campaignPreview,
      ready_to_send: true
    })

  } catch (error) {
    console.error('[MOT-CAMPAIGN] Error:', error)
    
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
      urgencyFilter = 'critical',
      limit = 10,
      testMode = false,
      specificCustomerIds = []
    } = body

    console.log('[MOT-CAMPAIGN] Starting MOT campaign...', { urgencyFilter, limit, testMode })

    // Get campaign data (reuse GET logic)
    const getResponse = await fetch(`${request.url}?urgency=${urgencyFilter}&limit=${limit}`)
    const campaignData = await getResponse.json()

    if (!campaignData.success) {
      throw new Error('Failed to get campaign data')
    }

    let customersToContact = campaignData.campaign_preview

    // Filter by specific customer IDs if provided
    if (specificCustomerIds.length > 0) {
      customersToContact = customersToContact.filter(c => 
        specificCustomerIds.includes(c.customer_id)
      )
    }

    const results = []
    let sentCount = 0
    let failedCount = 0

    for (const customer of customersToContact) {
      try {
        const customerName = `${customer.first_name} ${customer.last_name}`.trim() || 'Customer'

        if (testMode) {
          // Test mode - don't actually send
          results.push({
            customer_id: customer.customer_id,
            customer_name: customerName,
            registration: customer.registration,
            phone: customer.phone_number,
            urgency: customer.urgency_level,
            status: 'test_mode',
            template_variables: customer.template_variables,
            expected_message: customer.expected_message
          })
          sentCount++
        } else {
          // Send actual WhatsApp template message
          const templateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customer.phone_number,
              templateSid: TEMPLATE_SID,
              templateVariables: customer.template_variables,
              messageType: `mot_reminder_${customer.urgency_level.toLowerCase()}`,
              customerName: customerName
            })
          })

          const result = await templateResponse.json()

          if (result.success) {
            // Log successful MOT reminder
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
                ${customer.customer_id},
                ${customer.phone_number},
                ${customer.registration},
                'mot_reminder_whatsapp',
                ${customer.expected_message},
                ${customer.urgency_level.toLowerCase()},
                ${result.cost || 0.005},
                NOW(),
                'sent',
                ${result.message_sid}
              )
            `

            results.push({
              customer_id: customer.customer_id,
              customer_name: customerName,
              registration: customer.registration,
              phone: customer.phone_number,
              urgency: customer.urgency_level,
              status: 'sent',
              message_sid: result.message_sid,
              cost: result.cost,
              template_variables: customer.template_variables
            })
            sentCount++
          } else {
            throw new Error(result.error || 'Failed to send template')
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        console.error(`[MOT-CAMPAIGN] Error sending to ${customer.registration}:`, error)
        
        results.push({
          customer_id: customer.customer_id,
          customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
          registration: customer.registration,
          phone: customer.phone_number,
          urgency: customer.urgency_level,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `MOT campaign completed: ${sentCount} sent, ${failedCount} failed`,
      campaign_summary: {
        total_processed: customersToContact.length,
        sent: sentCount,
        failed: failedCount,
        test_mode: testMode,
        total_cost: sentCount * 0.005,
        template_used: TEMPLATE_SID
      },
      results
    })

  } catch (error) {
    console.error('[MOT-CAMPAIGN] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
