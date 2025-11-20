import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get current counts
    const currentStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN mot_status IN ('Valid', 'VALID', 'valid') AND mot_expiry_date IS NULL THEN 1 END) as still_need_fixing,
        COUNT(CASE WHEN mot_status IN ('Valid', 'VALID', 'valid', 'expired', 'due-soon') AND mot_expiry_date IS NOT NULL THEN 1 END) as have_expiry_dates,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles 
      WHERE registration IS NOT NULL AND registration != ''
    `

    const stats = currentStats[0]
    const totalCritical = parseInt(stats.expired_3months) + parseInt(stats.expiring_14days)
    const totalVehicles = parseInt(stats.total_vehicles)
    const stillNeedFixing = parseInt(stats.still_need_fixing)
    const haveExpiryDates = parseInt(stats.have_expiry_dates)
    const progressPercent = totalVehicles > 0 ? Math.round((haveExpiryDates / totalVehicles) * 100) : 0

    return NextResponse.json({
      success: true,
      progress: {
        totalVehicles,
        haveExpiryDates,
        stillNeedFixing,
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
    console.error("[FIX-PROGRESS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get progress",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
