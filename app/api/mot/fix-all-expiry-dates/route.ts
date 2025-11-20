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
    console.log("[FIX-ALL-MOT] Starting to fix ALL missing MOT expiry dates...")

    // Get total count first
    const totalCountResult = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
    `

    const totalToProcess = parseInt(totalCountResult[0].count)
    console.log(`[FIX-ALL-MOT] Found ${totalToProcess} vehicles that need fixing`)

    if (totalToProcess === 0) {
      return NextResponse.json({
        success: true,
        message: "No vehicles need fixing - all MOT expiry dates are already populated",
        processed: 0,
        fixed: 0,
        errors: 0,
        totalToProcess: 0
      })
    }

    let totalFixed = 0
    let totalErrors = 0
    let totalProcessed = 0
    const errorDetails: string[] = []
    const batchSize = 200 // Process in batches of 200
    let offset = 0

    // Process in batches to avoid memory issues and provide progress
    while (offset < totalToProcess) {
      console.log(`[FIX-ALL-MOT] Processing batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(totalToProcess/batchSize)} (vehicles ${offset + 1}-${Math.min(offset + batchSize, totalToProcess)})`)

      // Get next batch of vehicles
      const vehiclesToFix = await sql`
        SELECT registration, mot_status, mot_last_checked
        FROM vehicles 
        WHERE mot_status IN ('Valid', 'VALID', 'valid')
        AND mot_expiry_date IS NULL
        AND registration IS NOT NULL
        AND registration != ''
        ORDER BY mot_last_checked DESC
        LIMIT ${batchSize}
        OFFSET ${offset}
      ` as VehicleToFix[]

      if (vehiclesToFix.length === 0) {
        console.log("[FIX-ALL-MOT] No more vehicles to process")
        break
      }

      let batchFixed = 0
      let batchErrors = 0

      // Process vehicles in this batch
      for (let i = 0; i < vehiclesToFix.length; i++) {
        const vehicle = vehiclesToFix[i]
        
        try {
          if (totalProcessed % 50 === 0) {
            console.log(`[FIX-ALL-MOT] Progress: ${totalProcessed}/${totalToProcess} (${Math.round(totalProcessed/totalToProcess*100)}%)`)
          }
          
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
            
            batchFixed++
            totalFixed++
          } else if (motResult.success && !motResult.expiryDate) {
            // Vehicle checked successfully but no expiry date available
            // Still update the last checked time
            await sql`
              UPDATE vehicles 
              SET 
                mot_last_checked = NOW(),
                updated_at = NOW()
              WHERE UPPER(REPLACE(registration, ' ', '')) = ${vehicle.registration.toUpperCase().replace(/\s/g, "")}
            `
          } else {
            batchErrors++
            totalErrors++
            if (errorDetails.length < 20) { // Limit error details to prevent huge responses
              errorDetails.push(`${vehicle.registration}: ${motResult.error}`)
            }
          }

          totalProcessed++

          // Add small delay to respect rate limits (100ms = 10 requests per second)
          if (i < vehiclesToFix.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

        } catch (error) {
          console.error(`[FIX-ALL-MOT] Error processing ${vehicle.registration}:`, error)
          batchErrors++
          totalErrors++
          totalProcessed++
          if (errorDetails.length < 20) {
            errorDetails.push(`${vehicle.registration}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      console.log(`[FIX-ALL-MOT] Batch complete: Fixed ${batchFixed}, Errors ${batchErrors}`)
      offset += batchSize

      // Add delay between batches
      if (offset < totalToProcess) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second between batches
      }
    }

    // Get final statistics
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_with_expiry,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_3months,
        COUNT(CASE WHEN mot_expiry_date >= CURRENT_DATE AND mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as expiring_14days
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid', 'expired', 'due-soon')
      AND mot_expiry_date IS NOT NULL
    `

    const stats = finalStats[0]
    const totalCritical = parseInt(stats.expired_3months) + parseInt(stats.expiring_14days)

    console.log(`[FIX-ALL-MOT] COMPLETE! Processed ${totalProcessed}, Fixed ${totalFixed}, Errors ${totalErrors}`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed all ${totalProcessed} vehicles`,
      totalToProcess,
      processed: totalProcessed,
      fixed: totalFixed,
      errors: totalErrors,
      errorDetails: errorDetails,
      results: {
        totalVehiclesWithExpiryDates: parseInt(stats.total_with_expiry),
        criticalMOTs: {
          expiredWithin3Months: parseInt(stats.expired_3months),
          expiringWithin14Days: parseInt(stats.expiring_14days),
          totalCritical
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIX-ALL-MOT] Error in fix process:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix all MOT expiry dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
