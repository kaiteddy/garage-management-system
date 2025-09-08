import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-MOT-DATES] Checking MOT expiry date distribution...")

    // 1. Total vehicles
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM vehicles
      WHERE registration IS NOT NULL AND registration != ''
    `

    // 2. Vehicles with MOT expiry dates
    const withDatesResult = await sql`
      SELECT COUNT(*) as count FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `

    // 2b. Check for vehicles that have been MOT checked
    const checkedResult = await sql`
      SELECT COUNT(*) as count FROM vehicles
      WHERE mot_last_checked IS NOT NULL
    `

    // 2c. Check MOT status distribution
    const statusResult = await sql`
      SELECT
        mot_status,
        COUNT(*) as count
      FROM vehicles
      WHERE mot_status IS NOT NULL
      GROUP BY mot_status
      ORDER BY count DESC
    `

    // 3. Check the specific critical criteria
    const criticalResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_all,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `

    // 4. Sample of vehicles with MOT dates (earliest)
    const sampleEarliestResult = await sql`
      SELECT registration, make, model, mot_expiry_date, mot_status,
             (mot_expiry_date - CURRENT_DATE) as days_from_now
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      ORDER BY mot_expiry_date
      LIMIT 10
    `

    // 4b. Sample of vehicles with MOT dates (latest/furthest future)
    const sampleLatestResult = await sql`
      SELECT registration, make, model, mot_expiry_date, mot_status,
             (mot_expiry_date - CURRENT_DATE) as days_from_now
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      ORDER BY mot_expiry_date DESC
      LIMIT 10
    `

    // 5. Date range of MOT expiry dates
    const rangeResult = await sql`
      SELECT
        MIN(mot_expiry_date) as earliest,
        MAX(mot_expiry_date) as latest,
        COUNT(*) as total
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `

    const stats = criticalResult[0]
    const range = rangeResult[0]

    return NextResponse.json({
      success: true,
      analysis: {
        totalVehicles: parseInt(totalResult[0].total),
        vehiclesWithMOTDates: parseInt(withDatesResult[0].count),
        vehiclesChecked: parseInt(checkedResult[0].count),
        motStatusDistribution: statusResult,
        critical: {
          totalExpiredAll: parseInt(stats.expired_all),
          expiredWithin3Months: parseInt(stats.expired_3months),
          expiringWithin14Days: parseInt(stats.expiring_14days),
          totalCritical: parseInt(stats.expired_3months) + parseInt(stats.expiring_14days)
        },
        dateRange: {
          earliest: range.earliest,
          latest: range.latest,
          totalWithDates: parseInt(range.total)
        },
        sampleEarliest: sampleEarliestResult,
        sampleLatest: sampleLatestResult
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-MOT-DATES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze MOT dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
