import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: { urgency: string } }
) {
  try {
    const urgency = params.urgency
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    console.log(`[SMS-CAMPAIGN-${urgency.toUpperCase()}] 🔍 Getting campaign targets`)

    let whereClause = ''
    let urgencyLabel = ''
    let urgencyIcon = ''

    switch (urgency.toLowerCase()) {
      case 'expired':
        whereClause = 'v.mot_expiry_date < CURRENT_DATE'
        urgencyLabel = 'Expired MOTs'
        urgencyIcon = '🚨'
        break
      case 'critical':
        whereClause = 'v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'7 days\''
        urgencyLabel = 'Critical MOTs (7 days)'
        urgencyIcon = '⚠️'
        break
      case 'due-soon':
        whereClause = 'v.mot_expiry_date > CURRENT_DATE + INTERVAL \'7 days\' AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'30 days\''
        urgencyLabel = 'Due Soon MOTs (30 days)'
        urgencyIcon = '📅'
        break
      case 'upcoming':
        whereClause = 'v.mot_expiry_date > CURRENT_DATE + INTERVAL \'30 days\' AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL \'60 days\''
        urgencyLabel = 'Upcoming MOTs (60 days)'
        urgencyIcon = '📋'
        break
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid urgency level"
        }, { status: 400 })
    }

    // Build search conditions
    let searchCondition = ''
    if (search) {
      searchCondition = `AND (
        v.registration ILIKE '%${search}%' OR
        v.make ILIKE '%${search}%' OR
        v.model ILIKE '%${search}%' OR
        c.first_name ILIKE '%${search}%' OR
        c.last_name ILIKE '%${search}%' OR
        c.phone ILIKE '%${search}%'
      )`
    }

    // Get campaign targets using real MOT history data
    const targetsQuery = `
      SELECT DISTINCT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        COALESCE(v.mot_expiry_date, mh.expiry_date) as mot_expiry_date,
        COALESCE(v.mot_status, 'Unknown') as mot_status,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.phone_verified,
        CASE
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE
            THEN CURRENT_DATE - COALESCE(v.mot_expiry_date, mh.expiry_date)
          ELSE COALESCE(v.mot_expiry_date, mh.expiry_date) - CURRENT_DATE
        END as days_difference,
        CASE
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE THEN 'EXPIRED'
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'UPCOMING'
        END as urgency_level,
        -- Check if SMS already sent recently
        (SELECT COUNT(*) FROM sms_log sl
         WHERE sl.vehicle_registration = v.registration
         AND sl.sent_at > NOW() - INTERVAL '30 days'
         AND sl.message_type = 'mot_reminder') as recent_sms_count,
        -- Get last service date
        (SELECT MAX(doc_date_issued) FROM documents d
         WHERE d.vehicle_registration = v.registration) as last_service_date
      FROM vehicles v
      JOIN customers c ON v.owner_id = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (vehicle_registration)
          vehicle_registration,
          expiry_date,
          test_result
        FROM mot_history
        WHERE expiry_date IS NOT NULL
        ORDER BY vehicle_registration, test_date DESC
      ) mh ON UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(mh.vehicle_registration, ' ', ''))
      WHERE (v.mot_expiry_date IS NOT NULL OR mh.expiry_date IS NOT NULL)
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND (c.opt_out IS NULL OR c.opt_out = FALSE)
      -- Filter out ancient expired MOTs (more than 1 year expired) and impossible future dates
      AND COALESCE(v.mot_expiry_date, mh.expiry_date) >= CURRENT_DATE - INTERVAL '1 year'
      AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '1 year'
      AND (
        CASE
          WHEN '${urgency}' = 'expired' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE
          WHEN '${urgency}' = 'critical' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) >= CURRENT_DATE
                                            AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '7 days'
          WHEN '${urgency}' = 'due-soon' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) > CURRENT_DATE + INTERVAL '7 days'
                                            AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '30 days'
          ELSE COALESCE(v.mot_expiry_date, mh.expiry_date) > CURRENT_DATE + INTERVAL '30 days'
               AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '60 days'
        END
      )
      ${searchCondition}
      ORDER BY
        CASE
          WHEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE
            THEN CURRENT_DATE - COALESCE(v.mot_expiry_date, mh.expiry_date)
          ELSE COALESCE(v.mot_expiry_date, mh.expiry_date) - CURRENT_DATE
        END ASC,
        v.registration
      LIMIT ${limit}
      OFFSET ${offset}
    `
    const targetsResult = await sql.unsafe(targetsQuery)
    const targets = Array.isArray(targetsResult) ? targetsResult : []

    // Get total count for pagination using same logic as main query
    const totalCountQuery = `
      SELECT COUNT(DISTINCT v.registration) as count
      FROM vehicles v
      JOIN customers c ON v.owner_id = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (vehicle_registration)
          vehicle_registration,
          expiry_date,
          test_result
        FROM mot_history
        WHERE expiry_date IS NOT NULL
        ORDER BY vehicle_registration, test_date DESC
      ) mh ON UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(mh.vehicle_registration, ' ', ''))
      WHERE (v.mot_expiry_date IS NOT NULL OR mh.expiry_date IS NOT NULL)
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND (c.opt_out IS NULL OR c.opt_out = FALSE)
      -- Filter out ancient expired MOTs (more than 1 year expired) and impossible future dates
      AND COALESCE(v.mot_expiry_date, mh.expiry_date) >= CURRENT_DATE - INTERVAL '1 year'
      AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '1 year'
      AND (
        CASE
          WHEN '${urgency}' = 'expired' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) < CURRENT_DATE
          WHEN '${urgency}' = 'critical' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) >= CURRENT_DATE
                                            AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '7 days'
          WHEN '${urgency}' = 'due-soon' THEN COALESCE(v.mot_expiry_date, mh.expiry_date) > CURRENT_DATE + INTERVAL '7 days'
                                            AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '30 days'
          ELSE COALESCE(v.mot_expiry_date, mh.expiry_date) > CURRENT_DATE + INTERVAL '30 days'
               AND COALESCE(v.mot_expiry_date, mh.expiry_date) <= CURRENT_DATE + INTERVAL '60 days'
        END
      )
      ${searchCondition}
    `
    const totalCount = await sql.unsafe(totalCountQuery)

    // Calculate estimated costs
    const estimatedCost = targets.length * (urgency === 'expired' ? 0.015 : 0.0075)

    // Generate sample message for this urgency level
    const sampleTarget = targets[0]
    let sampleMessage = ''

    if (sampleTarget) {
      const customerName = `${sampleTarget.first_name || ''} ${sampleTarget.last_name || ''}`.trim() || 'Customer'
      const vehicleInfo = `${sampleTarget.registration} ${sampleTarget.make || ''} ${sampleTarget.model || ''}`.trim()
      const daysText = sampleTarget.days_difference || 0

      switch (urgency.toLowerCase()) {
        case 'expired':
          sampleMessage = `Hi ${customerName}, 🚨 URGENT: Your ${vehicleInfo} MOT expired ${daysText} day${daysText !== 1 ? 's' : ''} ago. Driving without valid MOT is illegal. Book immediately!`
          break
        case 'critical':
          sampleMessage = `Hi ${customerName}, ⚠️ CRITICAL: Your ${vehicleInfo} MOT expires in ${daysText} day${daysText !== 1 ? 's' : ''}. Book your MOT now to avoid penalties.`
          break
        case 'due-soon':
          sampleMessage = `Hi ${customerName}, 📅 Your ${vehicleInfo} MOT expires in ${daysText} days. Book your MOT to stay legal.`
          break
        case 'upcoming':
          sampleMessage = `Hi ${customerName}, 📋 Reminder: Your ${vehicleInfo} MOT expires in ${daysText} days. Consider booking your MOT soon.`
          break
      }

      sampleMessage += `\n\n🔗 Check MOT: https://www.check-mot.service.gov.uk/results?registration=${sampleTarget.registration}`
      sampleMessage += `\n📞 Book with us: Call [YOUR_PHONE]`
      sampleMessage += `\n📧 Email: [YOUR_EMAIL]`

      if (sampleTarget.last_service_date) {
        const lastVisitDate = new Date(sampleTarget.last_service_date).toLocaleDateString()
        sampleMessage += `\n\nlast visit: ${lastVisitDate}`
      }

      sampleMessage += `\n\nReply: SOLD (if no longer yours), EMAIL address (to add email), STOP (opt out)`
    }

    return NextResponse.json({
      success: true,
      campaign: {
        urgency: urgency,
        urgencyLabel: urgencyLabel,
        urgencyIcon: urgencyIcon,
        totalTargets: totalCount && totalCount[0] ? parseInt(totalCount[0].count) : 0,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: totalCount && totalCount[0] ? Math.ceil(parseInt(totalCount[0].count) / limit) : 0,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        averageMessageCost: urgency === 'expired' ? 0.015 : 0.0075,
        sampleMessage: sampleMessage
      },
      targets: targets.map(target => ({
        customerId: target.customer_id,
        customerName: `${target.first_name || ''} ${target.last_name || ''}`.trim(),
        phone: target.phone,
        twilioPhone: target.twilio_phone,
        phoneVerified: target.phone_verified,
        email: target.email,
        registration: target.registration,
        vehicle: `${target.make || ''} ${target.model || ''}`.trim(),
        year: target.year,
        color: target.color,
        motExpiryDate: target.mot_expiry_date,
        motStatus: target.mot_status,
        daysDifference: target.days_difference,
        urgencyLevel: target.urgency_level,
        recentSmsCount: parseInt(target.recent_sms_count),
        lastServiceDate: target.last_service_date,
        estimatedCost: urgency === 'expired' ? 0.015 : 0.0075,
        eligible: target.twilio_phone && target.phone_verified,
        notes: target.recent_sms_count > 0 ? `${target.recent_sms_count} SMS sent in last 30 days` : null
      })),
      pagination: {
        total: totalCount && totalCount[0] ? parseInt(totalCount[0].count) : 0,
        limit: limit,
        offset: offset,
        hasMore: totalCount && totalCount[0] ? offset + limit < parseInt(totalCount[0].count) : false
      },
      filters: {
        search: search,
        eligibleOnly: false,
        excludeRecentSms: false
      }
    })

  } catch (error) {
    console.error(`[SMS-CAMPAIGN-${params.urgency?.toUpperCase()}] ❌ Error:`, error)
    return NextResponse.json({
      success: false,
      error: "Failed to get campaign targets",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { urgency: string } }
) {
  try {
    const urgency = params.urgency
    const { targetIds, dryRun = true, customMessage } = await request.json()

    console.log(`[SMS-CAMPAIGN-${urgency.toUpperCase()}] 🚀 Executing campaign for ${targetIds?.length || 'all'} targets`)

    // If specific targets provided, use them; otherwise get all for this urgency
    let targets = []

    if (targetIds && targetIds.length > 0) {
      // Get specific targets by customer IDs
      const placeholders = targetIds.map(() => '?').join(',')
      targets = await sql.unsafe(`
        SELECT
          v.registration,
          v.make,
          v.model,
          v.mot_expiry_date,
          c.id as customer_id,
          c.first_name,
          c.last_name,
          c.phone,
          c.twilio_phone
        FROM vehicles v
        JOIN customers c ON v.owner_id = c.id
        WHERE c.id = ANY(${targetIds})
        AND c.phone IS NOT NULL
        AND c.phone != ''
      `)
    } else {
      // Get all targets for this urgency level
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/campaigns/${urgency}?limit=1000`)
      const data = await response.json()
      targets = data.targets || []
    }

    // Execute the campaign
    const campaignResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send-mot-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryRun: dryRun,
        limit: targets.length,
        urgencyFilter: urgency,
        customMessage: customMessage,
        targetIds: targetIds
      })
    })

    const campaignResult = await campaignResponse.json()

    return NextResponse.json({
      success: true,
      campaign: {
        urgency: urgency,
        mode: dryRun ? 'DRY_RUN' : 'LIVE_SEND',
        targetsProcessed: targets.length,
        result: campaignResult
      }
    })

  } catch (error) {
    console.error(`[SMS-CAMPAIGN-${params.urgency?.toUpperCase()}] ❌ Error:`, error)
    return NextResponse.json({
      success: false,
      error: "Failed to execute campaign",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
