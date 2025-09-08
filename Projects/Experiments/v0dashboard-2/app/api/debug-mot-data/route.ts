import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-MOT] Analyzing MOT data...")

    // 1. Check total vehicles with MOT dates
    const totalWithMot = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
    `

    // 2. Check vehicles with expired MOTs (all expired)
    const allExpired = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date < CURRENT_DATE
    `

    // 3. Check vehicles expired within 3 months
    const expiredWithin3Months = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months'
      AND mot_expiry_date < CURRENT_DATE
    `

    // 3b. Check vehicles expired within 6 months
    const expiredWithin6Months = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months'
      AND mot_expiry_date < CURRENT_DATE
    `

    // 3c. Check vehicles expired within 1 year
    const expiredWithin1Year = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '1 year'
      AND mot_expiry_date < CURRENT_DATE
    `

    // 3d. Check vehicles expired within 18 months
    const expiredWithin18Months = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE - INTERVAL '18 months'
      AND mot_expiry_date < CURRENT_DATE
    `

    // 4. Check vehicles due within 14 days
    const dueWithin14Days = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE
      AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days'
    `

    // 5. Check vehicles due within 30 days (original logic)
    const dueWithin30Days = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE
      AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    `

    // 6. Check the original "critical" logic (expired or due within 30 days)
    const originalCritical = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date < CURRENT_DATE + INTERVAL '30 days'
    `

    // 7. Sample of expired vehicles
    const sampleExpired = await sql`
      SELECT registration, make, model, mot_expiry_date,
             CURRENT_DATE - mot_expiry_date as days_overdue
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date < CURRENT_DATE
      ORDER BY mot_expiry_date DESC
      LIMIT 10
    `

    // 8. Sample of upcoming MOTs
    const sampleUpcoming = await sql`
      SELECT registration, make, model, mot_expiry_date,
             mot_expiry_date - CURRENT_DATE as days_until_due
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND mot_expiry_date >= CURRENT_DATE
      AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY mot_expiry_date ASC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      analysis: {
        totalWithMotDates: parseInt(totalWithMot[0].count),
        allExpired: parseInt(allExpired[0].count),
        expiredWithin3Months: parseInt(expiredWithin3Months[0].count),
        expiredWithin6Months: parseInt(expiredWithin6Months[0].count),
        expiredWithin1Year: parseInt(expiredWithin1Year[0].count),
        dueWithin14Days: parseInt(dueWithin14Days[0].count),
        dueWithin30Days: parseInt(dueWithin30Days[0].count),
        originalCriticalLogic: parseInt(originalCritical[0].count)
      },
      samples: {
        expiredVehicles: sampleExpired,
        upcomingMots: sampleUpcoming
      },
      currentDate: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-MOT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze MOT data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
