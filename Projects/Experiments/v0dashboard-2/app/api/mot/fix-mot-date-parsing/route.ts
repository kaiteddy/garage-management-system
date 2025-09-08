import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[FIX-MOT-PARSING] Starting MOT date parsing fix...")

    // Find vehicles with MOT status text but no expiry date
    const vehiclesNeedingParsing = await sql`
      SELECT registration, make, model, mot_status
      FROM vehicles
      WHERE mot_status IS NOT NULL
        AND mot_status != ''
        AND mot_expiry_date IS NULL
        AND mot_status ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
      LIMIT 500
    `

    console.log(`[FIX-MOT-PARSING] Found ${vehiclesNeedingParsing.length} vehicles needing date parsing`)

    let updatedCount = 0
    let errorCount = 0
    const errors = []

    for (const vehicle of vehiclesNeedingParsing) {
      try {
        // Parse the date from DD/MM/YYYY format
        const dateParts = vehicle.mot_status.split('/')
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          const year = parseInt(dateParts[2])

          // Create a proper date object
          const motExpiryDate = new Date(year, month - 1, day)

          // Update the vehicle with the parsed date
          await sql`
            UPDATE vehicles
            SET mot_expiry_date = ${motExpiryDate.toISOString()},
                mot_last_checked = CURRENT_TIMESTAMP
            WHERE registration = ${vehicle.registration}
          `

          updatedCount++

          if (updatedCount % 50 === 0) {
            console.log(`[FIX-MOT-PARSING] Updated ${updatedCount} vehicles...`)
          }
        }
      } catch (error) {
        errorCount++
        errors.push({
          registration: vehicle.registration,
          mot_status: vehicle.mot_status,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`[FIX-MOT-PARSING] Error parsing ${vehicle.registration}: ${vehicle.mot_status}`)
      }
    }

    // Now check how many vehicles we have with proper MOT dates
    const updatedStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(mot_expiry_date) as vehicles_with_dates,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_vehicles,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '12 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_within_12_months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as due_within_14_days,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_within_30_days
      FROM vehicles
    `

    const stats = updatedStats[0]

    return NextResponse.json({
      success: true,
      message: "MOT date parsing completed",
      results: {
        vehiclesFound: vehiclesNeedingParsing.length,
        updatedCount,
        errorCount,
        errors: errors.slice(0, 10) // Show first 10 errors
      },
      updatedStats: {
        totalVehicles: parseInt(stats.total_vehicles),
        vehiclesWithDates: parseInt(stats.vehicles_with_dates),
        expiredVehicles: parseInt(stats.expired_vehicles),
        expiredWithin12Months: parseInt(stats.expired_within_12_months),
        dueWithin14Days: parseInt(stats.due_within_14_days),
        dueWithin30Days: parseInt(stats.due_within_30_days)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIX-MOT-PARSING] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix MOT date parsing",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
