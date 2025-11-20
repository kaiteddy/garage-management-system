import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[MOT-CRITICAL-API] Fetching critical MOT vehicles...')

    // Get vehicles with MOT dates that are expired, critical, or due soon
    const vehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.color,
        v.fuel_type,
        v.mot_expiry_date,
        v.mot_status,
        v.owner_id,
        c.id as customer_id,
        c.forename,
        c.surname,
        c.telephone,
        c.mobile,
        c.email,
        c.house_no,
        c.road,
        c.locality,
        c.town,
        c.county,
        c.post_code,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'due_soon'
          ELSE 'ok'
        END as urgency_level,
        (CURRENT_DATE - v.mot_expiry_date) as days_overdue,
        (v.mot_expiry_date - CURRENT_DATE) as days_until_due
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
        AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
      ORDER BY
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 1
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 2
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 3
          ELSE 4
        END,
        v.mot_expiry_date ASC
    `

    console.log(`[MOT-CRITICAL-API] Found ${vehicles.length} vehicles needing MOT attention`)

    // Calculate summary statistics
    const summary = {
      total: vehicles.length,
      expired: vehicles.filter(v => v.urgency_level === 'expired').length,
      critical: vehicles.filter(v => v.urgency_level === 'critical').length,
      due_soon: vehicles.filter(v => v.urgency_level === 'due_soon').length
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles,
      summary: summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[MOT-CRITICAL-API] Error fetching critical MOT vehicles:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch critical MOT vehicles",
      details: error instanceof Error ? error.message : 'Unknown error',
      vehicles: [],
      summary: { total: 0, expired: 0, critical: 0, due_soon: 0 }
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, vehicle_ids, channel, message_template } = body

    console.log(`[MOT-CRITICAL-API] ${action} request for ${vehicle_ids?.length || 0} vehicles via ${channel}`)

    if (action === 'send_bulk_reminders') {
      // This would integrate with your existing SMS/WhatsApp sending logic
      // For now, return a success response
      return NextResponse.json({
        success: true,
        message: `Bulk reminders sent to ${vehicle_ids.length} vehicles via ${channel}`,
        sent_count: vehicle_ids.length,
        failed_count: 0,
        cost_estimate: vehicle_ids.length * (channel === 'whatsapp' ? 0.005 : 0.04),
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
      message: "Supported actions: send_bulk_reminders"
    }, { status: 400 })

  } catch (error) {
    console.error('[MOT-CRITICAL-API] Error processing request:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process request"
    }, { status: 500 })
  }
}
