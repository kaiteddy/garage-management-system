import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[VALIDATE-MOT-DATA] 🔍 Validating MOT data across all vehicles")

    // Get vehicles with missing or outdated MOT data
    const vehiclesNeedingUpdate = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_status,
        v.mot_expiry_date,
        v.mot_last_checked,
        COUNT(mh.vehicle_registration) as mot_history_count
      FROM vehicles v
      LEFT JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE v.registration IS NOT NULL
      AND v.registration != ''
      GROUP BY v.registration, v.make, v.model, v.mot_status, v.mot_expiry_date, v.mot_last_checked
      HAVING COUNT(mh.vehicle_registration) = 0
      OR v.mot_last_checked IS NULL
      OR v.mot_last_checked < NOW() - INTERVAL '30 days'
      ORDER BY v.mot_last_checked ASC NULLS FIRST
      LIMIT 100
    `

    // Get vehicles with MOT data but inconsistencies
    const vehiclesWithInconsistencies = await sql`
      SELECT
        v.registration,
        v.mot_status,
        v.mot_expiry_date as vehicle_expiry,
        v.mot_test_result as vehicle_result,
        mh.expiry_date as history_expiry,
        mh.test_result as history_result,
        mh.test_date as latest_test_date,
        COUNT(mh.vehicle_registration) as mot_history_count
      FROM vehicles v
      JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE v.registration IS NOT NULL
      GROUP BY v.registration, v.mot_status, v.mot_expiry_date, v.mot_test_result, mh.expiry_date, mh.test_result, mh.test_date
      HAVING (
        v.mot_expiry_date != mh.expiry_date
        OR v.mot_test_result != mh.test_result
        OR v.mot_status NOT IN ('Valid', 'Invalid', 'Expired')
      )
      ORDER BY mh.test_date DESC
      LIMIT 50
    `

    // Get summary statistics
    const totalVehicles = await sql`
      SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''
    `

    const vehiclesWithMotHistory = await sql`
      SELECT COUNT(DISTINCT UPPER(REPLACE(vehicle_registration, ' ', ''))) as count FROM mot_history
    `

    const totalMotRecords = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    const vehiclesNeverChecked = await sql`
      SELECT COUNT(*) as count FROM vehicles
      WHERE registration IS NOT NULL
      AND registration != ''
      AND mot_last_checked IS NULL
    `

    const vehiclesCheckedRecently = await sql`
      SELECT COUNT(*) as count FROM vehicles
      WHERE mot_last_checked > NOW() - INTERVAL '7 days'
    `

    // Get sample of vehicles with good MOT data
    const vehiclesWithGoodData = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_status,
        v.mot_expiry_date,
        v.mot_last_checked,
        COUNT(mh.vehicle_registration) as mot_history_count,
        MAX(mh.test_date) as latest_test_date
      FROM vehicles v
      JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE v.mot_last_checked IS NOT NULL
      AND v.mot_last_checked > NOW() - INTERVAL '7 days'
      GROUP BY v.registration, v.make, v.model, v.mot_status, v.mot_expiry_date, v.mot_last_checked
      HAVING COUNT(mh.vehicle_registration) > 0
      ORDER BY COUNT(mh.vehicle_registration) DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      validation: {
        summary: {
          totalVehicles: parseInt(totalVehicles[0].count),
          vehiclesWithMotHistory: parseInt(vehiclesWithMotHistory[0].count),
          totalMotRecords: parseInt(totalMotRecords[0].count),
          vehiclesNeverChecked: parseInt(vehiclesNeverChecked[0].count),
          vehiclesCheckedRecently: parseInt(vehiclesCheckedRecently[0].count),
          coveragePercentage: Math.round((parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100)
        },
        issues: {
          vehiclesNeedingUpdate: vehiclesNeedingUpdate.length,
          vehiclesWithInconsistencies: vehiclesWithInconsistencies.length
        },
        recommendations: {
          needsImmediateUpdate: vehiclesNeedingUpdate.slice(0, 20),
          hasInconsistencies: vehiclesWithInconsistencies.slice(0, 10),
          goodExamples: vehiclesWithGoodData
        }
      },
      actions: {
        bulkUpdateUrl: "/api/vehicles/bulk-update-mot-history",
        individualUpdateUrl: "/api/vehicles/[registration]/get-official-mot-data"
      }
    })

  } catch (error) {
    console.error("[VALIDATE-MOT-DATA] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to validate MOT data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
