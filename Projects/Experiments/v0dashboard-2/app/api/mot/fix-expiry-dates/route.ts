import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"

interface VehicleToFix {
  registration: string
  mot_status: string
  mot_last_checked: string
}

export async function POST() {
  try {
    console.log("[FIX-MOT-EXPIRY] Starting to fix missing MOT expiry dates...")

    // Get vehicles that have MOT status but no expiry date
    const vehiclesToFix = await sql`
      SELECT registration, mot_status, mot_last_checked
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
      ORDER BY mot_last_checked DESC
      LIMIT 100
    ` as VehicleToFix[]

    console.log(`[FIX-MOT-EXPIRY] Found ${vehiclesToFix.length} vehicles with MOT status but missing expiry dates`)

    if (vehiclesToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No vehicles need fixing - all MOT expiry dates are already populated",
        processed: 0,
        fixed: 0,
        errors: 0
      })
    }

    let fixed = 0
    let errors = 0
    const errorDetails: string[] = []

    // Process vehicles one by one to avoid rate limits
    for (let i = 0; i < vehiclesToFix.length; i++) {
      const vehicle = vehiclesToFix[i]
      
      try {
        console.log(`[FIX-MOT-EXPIRY] [${i + 1}/${vehiclesToFix.length}] Checking ${vehicle.registration}...`)
        
        // Re-check MOT status to get expiry date
        const motResult = await checkMOTStatus(vehicle.registration)
        
        if (motResult.success && motResult.expiryDate) {
          // Update the vehicle with the expiry date
          await sql`
            UPDATE vehicles 
            SET 
              mot_expiry_date = ${motResult.expiryDate},
              mot_status = ${motResult.motStatus},
              mot_last_checked = NOW(),
              updated_at = NOW()
            WHERE UPPER(REPLACE(registration, ' ', '')) = ${vehicle.registration.toUpperCase().replace(/\s/g, "")}
          `
          
          console.log(`[FIX-MOT-EXPIRY] Fixed ${vehicle.registration}: Expiry date set to ${motResult.expiryDate}`)
          fixed++
        } else if (motResult.success && !motResult.expiryDate) {
          console.log(`[FIX-MOT-EXPIRY] ${vehicle.registration}: MOT check successful but no expiry date available`)
        } else {
          console.log(`[FIX-MOT-EXPIRY] ${vehicle.registration}: MOT check failed - ${motResult.error}`)
          errors++
          errorDetails.push(`${vehicle.registration}: ${motResult.error}`)
        }

        // Add delay to respect rate limits
        if (i < vehiclesToFix.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150)) // 150ms delay
        }

      } catch (error) {
        console.error(`[FIX-MOT-EXPIRY] Error processing ${vehicle.registration}:`, error)
        errors++
        errorDetails.push(`${vehicle.registration}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Check the results
    const updatedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NOT NULL
    `

    // Check for critical MOTs after the fix
    const criticalCheck = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_all,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL
    `

    const critical = criticalCheck[0]
    const totalCritical = parseInt(critical.expired_3months) + parseInt(critical.expiring_14days)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${vehiclesToFix.length} vehicles`,
      processed: vehiclesToFix.length,
      fixed,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Limit error details to first 10
      results: {
        totalVehiclesWithExpiryDates: parseInt(updatedCount[0].count),
        criticalMOTs: {
          expiredWithin3Months: parseInt(critical.expired_3months),
          expiringWithin14Days: parseInt(critical.expiring_14days),
          totalCritical
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIX-MOT-EXPIRY] Error in fix process:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix MOT expiry dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
