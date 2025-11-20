import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VERIFY-WITH-VEHICLES] Verifying customer activity based on vehicle connections...")

    // Get comprehensive customer verification based on vehicles and MOT data
    const customerVerification = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        c.email,
        c.phone_verified,
        c.opt_out,
        COUNT(DISTINCT v.registration) as total_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date IS NOT NULL THEN v.registration END) as vehicles_with_mot,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                              THEN v.registration END) as critical_mot_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date < CURRENT_DATE
                              AND v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                              THEN v.registration END) as expired_mot_vehicles,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                              THEN v.registration END) as expiring_mot_vehicles,
        MIN(v.mot_expiry_date) as earliest_mot_expiry,
        MAX(v.mot_expiry_date) as latest_mot_expiry,
        -- Estimate customer activity based on MOT patterns
        CASE
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year' THEN v.registration END) > 0
            THEN 'recent'
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '2 years' THEN v.registration END) > 0
            THEN 'moderate'
          WHEN COUNT(DISTINCT v.registration) > 0
            THEN 'old'
          ELSE 'no_vehicles'
        END as estimated_activity,
        CASE
          WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 'ready'
          WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 'needs_verification'
          WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 'needs_formatting'
          WHEN c.opt_out = TRUE THEN 'opted_out'
          ELSE 'no_phone'
        END as sms_status,
        CASE
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                                    THEN v.registration END) > 0 THEN 'urgent'
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 'has_vehicles'
          ELSE 'no_vehicles'
        END as priority_level,
        -- Vehicle age information
        AVG(v.vehicle_age) as average_vehicle_age,
        COUNT(DISTINCT CASE WHEN v.vehicle_age < 10 THEN v.registration END) as newer_vehicles,
        COUNT(DISTINCT CASE WHEN v.vehicle_age >= 15 THEN v.registration END) as older_vehicles
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone, c.email,
               c.phone_verified, c.opt_out
      ORDER BY
        CASE
          WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                                    AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                                    THEN v.registration END) > 0 THEN 1
          WHEN COUNT(DISTINCT v.registration) > 0 THEN 2
          ELSE 3
        END,
        COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                              AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
                              THEN v.registration END) DESC
    `

    // Get summary statistics
    const summaryStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND c.phone_verified = TRUE AND (c.opt_out = FALSE OR c.opt_out IS NULL) THEN 1 END) as sms_ready,
        COUNT(CASE WHEN c.twilio_phone IS NOT NULL AND (c.phone_verified = FALSE OR c.phone_verified IS NULL) THEN 1 END) as needs_verification,
        COUNT(CASE WHEN c.phone IS NOT NULL AND c.twilio_phone IS NULL THEN 1 END) as needs_formatting,
        COUNT(CASE WHEN c.opt_out = TRUE THEN 1 END) as opted_out,
        COUNT(CASE WHEN c.phone IS NULL THEN 1 END) as no_phone,
        COUNT(CASE WHEN v.registration IS NOT NULL THEN 1 END) as with_vehicles,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
                   AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as with_critical_mots,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as recent_mot_activity,
        COUNT(CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '2 years'
                   AND v.mot_expiry_date < CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as moderate_mot_activity
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.owner_id
    `

    // Get customers ready for immediate SMS (critical MOTs)
    const urgentSmsReady = customerVerification.filter(customer =>
      customer.sms_status === 'ready' &&
      customer.priority_level === 'urgent' &&
      customer.critical_mot_vehicles > 0
    ).slice(0, 20)

    // Get customers needing verification (have critical MOTs but need phone verification)
    const urgentNeedsVerification = customerVerification.filter(customer =>
      customer.sms_status === 'needs_verification' &&
      customer.priority_level === 'urgent' &&
      customer.critical_mot_vehicles > 0
    ).slice(0, 20)

    // Get activity level breakdown (simplified)
    const activityBreakdown = await sql`
      WITH customer_activity AS (
        SELECT
          c.id,
          c.twilio_phone,
          c.phone_verified,
          CASE
            WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year' THEN v.registration END) > 0
              THEN 'recent'
            WHEN COUNT(DISTINCT CASE WHEN v.mot_expiry_date >= CURRENT_DATE - INTERVAL '2 years' THEN v.registration END) > 0
              THEN 'moderate'
            WHEN COUNT(DISTINCT v.registration) > 0
              THEN 'old'
            ELSE 'no_vehicles'
          END as activity_level
        FROM customers c
        LEFT JOIN vehicles v ON c.id = v.owner_id
        GROUP BY c.id, c.twilio_phone, c.phone_verified
      )
      SELECT
        activity_level,
        COUNT(*) as count,
        COUNT(CASE WHEN twilio_phone IS NOT NULL AND phone_verified = TRUE THEN 1 END) as sms_ready_count
      FROM customer_activity
      GROUP BY activity_level
      ORDER BY count DESC
    `

    const stats = summaryStats[0]

    return NextResponse.json({
      success: true,
      verification: {
        totalCustomers: parseInt(stats.total_customers),
        smsReadiness: {
          ready: parseInt(stats.sms_ready),
          needsVerification: parseInt(stats.needs_verification),
          needsFormatting: parseInt(stats.needs_formatting),
          optedOut: parseInt(stats.opted_out),
          noPhone: parseInt(stats.no_phone)
        },
        vehicleConnections: {
          withVehicles: parseInt(stats.with_vehicles),
          withCriticalMots: parseInt(stats.with_critical_mots),
          recentMotActivity: parseInt(stats.recent_mot_activity),
          moderateMotActivity: parseInt(stats.moderate_mot_activity)
        },
        percentages: {
          smsReadyRate: Math.round((parseInt(stats.sms_ready) / parseInt(stats.total_customers)) * 100),
          vehicleConnectionRate: Math.round((parseInt(stats.with_vehicles) / parseInt(stats.total_customers)) * 100),
          criticalMotRate: Math.round((parseInt(stats.with_critical_mots) / parseInt(stats.total_customers)) * 100),
          recentActivityRate: Math.round((parseInt(stats.recent_mot_activity) / parseInt(stats.total_customers)) * 100)
        }
      },
      urgentSmsReady: urgentSmsReady.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.twilio_phone,
        criticalVehicles: customer.critical_mot_vehicles,
        expiredVehicles: customer.expired_mot_vehicles,
        expiringVehicles: customer.expiring_mot_vehicles,
        totalVehicles: customer.total_vehicles,
        averageVehicleAge: customer.average_vehicle_age ? Math.round(customer.average_vehicle_age) : null,
        earliestExpiry: customer.earliest_mot_expiry,
        estimatedActivity: customer.estimated_activity
      })),
      urgentNeedsVerification: urgentNeedsVerification.map(customer => ({
        id: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone,
        twilioPhone: customer.twilio_phone,
        criticalVehicles: customer.critical_mot_vehicles,
        totalVehicles: customer.total_vehicles,
        earliestExpiry: customer.earliest_mot_expiry,
        estimatedActivity: customer.estimated_activity
      })),
      activityBreakdown,
      recommendations: {
        immediateActions: [
          `${urgentSmsReady.length} customers with critical MOTs are ready for immediate SMS`,
          `${urgentNeedsVerification.length} customers with critical MOTs need phone verification`,
          `${parseInt(stats.sms_ready)} total customers are SMS-ready`,
          `${parseInt(stats.recent_mot_activity)} customers show recent MOT activity (last year)`
        ],
        customerVerification: [
          "Customers with recent MOT activity (last 1-2 years) are likely still active",
          "Focus SMS campaigns on customers with critical MOT vehicles first",
          "Customers with multiple vehicles are more likely to be active",
          "Vehicle age can indicate customer engagement (newer vehicles = more active)"
        ],
        twilioStrategy: [
          "Start with urgent customers who have expired MOTs",
          "Send verification SMS to unverified numbers with critical MOTs",
          "Use vehicle age in messages to help customers identify their cars",
          "Track response rates to refine customer activity estimates"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[VERIFY-WITH-VEHICLES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify customers with vehicles",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
