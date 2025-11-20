import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[QUICK-MOT-STATUS] 🔍 Quick MOT status check")

    // Get basic counts
    const totalVehicles = await sql`
      SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''
    `

    const vehiclesWithMotHistory = await sql`
      SELECT COUNT(DISTINCT UPPER(REPLACE(vehicle_registration, ' ', ''))) as count FROM mot_history
    `

    const totalMotRecords = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    // Get sample of vehicles without MOT history
    const vehiclesWithoutMot = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.mot_last_checked
      FROM vehicles v
      LEFT JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE v.registration IS NOT NULL
      AND v.registration != ''
      AND mh.vehicle_registration IS NULL
      ORDER BY v.registration
      LIMIT 20
    `

    // Get sample of vehicles with MOT history
    const vehiclesWithMot = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        COUNT(mh.vehicle_registration) as mot_count,
        MAX(mh.test_date) as latest_test
      FROM vehicles v
      JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      GROUP BY v.registration, v.make, v.model
      ORDER BY COUNT(mh.vehicle_registration) DESC
      LIMIT 10
    `

    // Check our specific examples
    const exampleVehicles = ['FV10SFK', 'FP63MTK', 'NG07LML']
    const exampleStatus = []
    
    for (const reg of exampleVehicles) {
      const motCount = await sql`
        SELECT COUNT(*) as count 
        FROM mot_history 
        WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${reg.replace(/\s/g, '')}
      `
      exampleStatus.push({
        registration: reg,
        motRecords: parseInt(motCount[0].count)
      })
    }

    const coveragePercentage = Math.round(
      (parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100
    )

    return NextResponse.json({
      success: true,
      summary: {
        totalVehicles: parseInt(totalVehicles[0].count),
        vehiclesWithMotHistory: parseInt(vehiclesWithMotHistory[0].count),
        totalMotRecords: parseInt(totalMotRecords[0].count),
        coveragePercentage: coveragePercentage,
        vehiclesWithoutMot: vehiclesWithoutMot.length,
        needingUpdate: parseInt(totalVehicles[0].count) - parseInt(vehiclesWithMotHistory[0].count)
      },
      samples: {
        vehiclesWithoutMot: vehiclesWithoutMot,
        vehiclesWithMot: vehiclesWithMot,
        exampleVehicles: exampleStatus
      }
    })

  } catch (error) {
    console.error("[QUICK-MOT-STATUS] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check MOT status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
