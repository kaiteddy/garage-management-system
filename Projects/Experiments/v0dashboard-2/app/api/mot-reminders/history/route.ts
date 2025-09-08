import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[MOT-REMINDERS-HISTORY] Fetching reminder history...')

    // Get reminder history with vehicle and customer information
    const reminders = await sql`
      SELECT 
        mr.id,
        mr.vehicle_id,
        mr.customer_id,
        mr.phone_number,
        mr.message_content,
        mr.twilio_sid,
        mr.status,
        mr.reminder_type,
        mr.sent_at,
        mr.delivered_at,
        mr.failed_at,
        mr.error_message,
        v.registration as vehicle_registration,
        v.make,
        v.model,
        COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Customer') as customer_name
      FROM mot_reminders mr
      LEFT JOIN vehicles v ON mr.vehicle_id = v.id
      LEFT JOIN customers c ON mr.customer_id = c.id
      ORDER BY mr.sent_at DESC
      LIMIT 100
    `

    console.log(`[MOT-REMINDERS-HISTORY] Found ${reminders.length} reminder records`)

    return NextResponse.json({
      success: true,
      reminders: reminders,
      count: reminders.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[MOT-REMINDERS-HISTORY] Error:', error)
    
    // If table doesn't exist, return empty array
    if (error instanceof Error && error.message.includes('relation "mot_reminders" does not exist')) {
      return NextResponse.json({
        success: true,
        reminders: [],
        count: 0,
        message: 'MOT reminders table not yet created',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
