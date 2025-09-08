import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[STATUS-CHECK] Checking current MOT database status...")

    // Get comprehensive status
    const statusResult = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as vehicles_with_expiry,
        COUNT(CASE WHEN mot_status IN ('Valid', 'VALID', 'valid') AND mot_expiry_date IS NULL THEN 1 END) as still_need_fixing,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days,
        COUNT(CASE WHEN mot_last_checked IS NOT NULL THEN 1 END) as vehicles_checked
      FROM vehicles 
      WHERE registration IS NOT NULL AND registration != ''
    `

    const stats = statusResult[0]
    const totalCritical = parseInt(stats.expired_3months) + parseInt(stats.expiring_14days)
    const progressPercent = Math.round((parseInt(stats.vehicles_with_expiry) / parseInt(stats.total_vehicles)) * 100)

    return NextResponse.json({
      success: true,
      status: {
        totalVehicles: parseInt(stats.total_vehicles),
        vehiclesWithExpiryDates: parseInt(stats.vehicles_with_expiry),
        vehiclesChecked: parseInt(stats.vehicles_checked),
        stillNeedFixing: parseInt(stats.still_need_fixing),
        progressPercent,
        criticalMOTs: {
          expiredWithin3Months: parseInt(stats.expired_3months),
          expiringWithin14Days: parseInt(stats.expiring_14days),
          totalCritical
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[STATUS-CHECK] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
