import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[MOT-PROCESSING-STATUS] Checking processing status...")

    // Check if there are any recent processing logs or active processes
    // We'll look for recent activity in the last 5 minutes
    const recentActivity = await sql`
      SELECT
        COUNT(*) as recent_updates,
        MAX(updated_at) as last_update
      FROM vehicles
      WHERE updated_at > NOW() - INTERVAL '5 minutes'
      AND mot_last_checked IS NOT NULL
    `

    // Get total vehicles that need MOT checking (no MOT data or old data)
    const needsChecking = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_last_checked IS NULL
      OR mot_last_checked < NOW() - INTERVAL '24 hours'
    `

    // Get vehicles with critical MOT status
    const criticalCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    const isProcessing = recentActivity[0]?.recent_updates > 0
    const lastUpdate = recentActivity[0]?.last_update
    const vehiclesNeedingCheck = needsChecking[0]?.count || 0
    const criticalVehicles = criticalCount[0]?.count || 0

    console.log(`[MOT-PROCESSING-STATUS] Processing: ${isProcessing}, Critical: ${criticalVehicles}, Needs checking: ${vehiclesNeedingCheck}`)

    return NextResponse.json({
      success: true,
      data: {
        isProcessing,
        lastUpdate,
        vehiclesNeedingCheck: parseInt(vehiclesNeedingCheck),
        criticalVehicles: parseInt(criticalVehicles),
        recentUpdates: parseInt(recentActivity[0]?.recent_updates || 0)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[MOT-PROCESSING-STATUS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check processing status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
