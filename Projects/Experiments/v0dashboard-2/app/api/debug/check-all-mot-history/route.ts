import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-ALL-MOT] 🔍 Checking all MOT history in database")

    // Get all MOT history records
    const allMotHistory = await sql`
      SELECT 
        vehicle_registration,
        test_date,
        expiry_date,
        test_result,
        odometer_value,
        odometer_unit,
        mot_test_number,
        created_at
      FROM mot_history
      ORDER BY vehicle_registration, test_date DESC
      LIMIT 50
    `

    // Get count by vehicle
    const countByVehicle = await sql`
      SELECT 
        vehicle_registration,
        COUNT(*) as test_count,
        MAX(test_date) as latest_test,
        MIN(test_date) as earliest_test
      FROM mot_history
      GROUP BY vehicle_registration
      ORDER BY test_count DESC
      LIMIT 20
    `

    // Get total count
    const totalCount = await sql`
      SELECT COUNT(*) as total FROM mot_history
    `

    return NextResponse.json({
      success: true,
      totalRecords: totalCount[0].total,
      countByVehicle: countByVehicle,
      sampleRecords: allMotHistory.slice(0, 10),
      allRecords: allMotHistory
    })

  } catch (error) {
    console.error("[CHECK-ALL-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check MOT history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
