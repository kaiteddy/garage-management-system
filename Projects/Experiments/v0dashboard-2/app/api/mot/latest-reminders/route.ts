import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[LATEST-REMINDERS] Getting latest MOT reminders with fresh data...')

    // Get vehicles with critical MOT status using the latest data
    const criticalVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.mot_expiry_date,
        v.mot_status,
        v.mot_last_checked,
        v.owner_id,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.city,
        c.postcode,
        CASE
          WHEN v.mot_expiry_date IS NULL THEN 'unknown'
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'critical'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
          ELSE 'ok'
        END as urgency_level,
        CASE
          WHEN v.mot_expiry_date IS NULL THEN NULL
          WHEN v.mot_expiry_date < CURRENT_DATE THEN (CURRENT_DATE - v.mot_expiry_date)
          ELSE NULL
        END as days_overdue,
        CASE
          WHEN v.mot_expiry_date IS NULL THEN NULL
          WHEN v.mot_expiry_date >= CURRENT_DATE THEN (v.mot_expiry_date - CURRENT_DATE)
          ELSE NULL
        END as days_until_due
      FROM vehicles v
      LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
      WHERE (
        v.mot_expiry_date IS NULL
        OR v.mot_expiry_date < CURRENT_DATE
        OR v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      )
      ORDER BY
        CASE
          WHEN v.mot_expiry_date IS NULL THEN 3
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 1
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 2
          ELSE 4
        END,
        v.mot_expiry_date ASC NULLS LAST
      LIMIT 100
    `

    // Get summary statistics
    const summary = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_mot_data,
        COUNT(CASE WHEN mot_expiry_date IS NULL THEN 1 END) as vehicles_without_mot_data,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_mots,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as critical_mots,
        COUNT(CASE WHEN mot_expiry_date > CURRENT_DATE + INTERVAL '14 days' AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_soon_mots,
        COUNT(CASE WHEN mot_last_checked IS NOT NULL THEN 1 END) as recently_checked,
        COUNT(CASE WHEN mot_last_checked IS NULL THEN 1 END) as never_checked
      FROM vehicles
    `

    // Get recent MOT processing activity
    const recentActivity = await sql`
      SELECT
        COUNT(CASE WHEN mot_last_checked >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as checked_today,
        COUNT(CASE WHEN mot_last_checked >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as checked_this_week,
        MAX(mot_last_checked) as last_check_time
      FROM vehicles
      WHERE mot_last_checked IS NOT NULL
    `

    console.log(`[LATEST-REMINDERS] Found ${criticalVehicles.length} vehicles needing attention`)

    // Categorize vehicles by urgency
    const categorized = {
      expired: criticalVehicles.filter(v => v.urgency_level === 'expired'),
      critical: criticalVehicles.filter(v => v.urgency_level === 'critical'),
      due_soon: criticalVehicles.filter(v => v.urgency_level === 'due_soon'),
      unknown: criticalVehicles.filter(v => v.urgency_level === 'unknown')
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_vehicles: parseInt(summary[0].total_vehicles),
        vehicles_with_mot_data: parseInt(summary[0].vehicles_with_mot_data),
        vehicles_without_mot_data: parseInt(summary[0].vehicles_without_mot_data),
        expired_mots: parseInt(summary[0].expired_mots),
        critical_mots: parseInt(summary[0].critical_mots),
        due_soon_mots: parseInt(summary[0].due_soon_mots),
        recently_checked: parseInt(summary[0].recently_checked),
        never_checked: parseInt(summary[0].never_checked),
        coverage_percentage: Math.round((parseInt(summary[0].recently_checked) / parseInt(summary[0].total_vehicles)) * 100)
      },
      activity: {
        checked_today: parseInt(recentActivity[0].checked_today),
        checked_this_week: parseInt(recentActivity[0].checked_this_week),
        last_check_time: recentActivity[0].last_check_time
      },
      reminders: {
        total_needing_attention: criticalVehicles.length,
        expired: {
          count: categorized.expired.length,
          vehicles: categorized.expired.slice(0, 10) // Top 10 most urgent
        },
        critical: {
          count: categorized.critical.length,
          vehicles: categorized.critical.slice(0, 10) // Top 10 most urgent
        },
        due_soon: {
          count: categorized.due_soon.length,
          vehicles: categorized.due_soon.slice(0, 10) // Top 10 most urgent
        },
        unknown: {
          count: categorized.unknown.length,
          vehicles: categorized.unknown.slice(0, 5) // Top 5 unknown
        }
      },
      recommendations: [
        {
          priority: 'HIGH',
          action: 'Send immediate reminders to expired MOT vehicles',
          count: categorized.expired.length,
          endpoint: '/api/sms/send-mot-reminders?urgency=expired'
        },
        {
          priority: 'MEDIUM',
          action: 'Send critical reminders to vehicles due within 14 days',
          count: categorized.critical.length,
          endpoint: '/api/sms/send-mot-reminders?urgency=critical'
        },
        {
          priority: 'LOW',
          action: 'Send advance reminders to vehicles due within 30 days',
          count: categorized.due_soon.length,
          endpoint: '/api/sms/send-mot-reminders?urgency=due_soon'
        },
        {
          priority: 'INFO',
          action: 'Update MOT data for vehicles with unknown status',
          count: categorized.unknown.length,
          endpoint: '/api/vehicles/bulk-update-mot-history'
        }
      ]
    })

  } catch (error) {
    console.error('[LATEST-REMINDERS] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to get latest MOT reminders",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
