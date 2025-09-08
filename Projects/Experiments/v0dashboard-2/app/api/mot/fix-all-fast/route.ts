import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"

interface VehicleToFix {
  registration: string
  mot_status: string
  mot_last_checked: string
}

interface ProcessedVehicle {
  registration: string
  success: boolean
  expiryDate?: string
  motStatus?: string
  error?: string
}

// Process vehicles in parallel batches
async function processVehicleBatch(vehicles: VehicleToFix[], batchNumber: number): Promise<ProcessedVehicle[]> {
  console.log(`[FAST-FIX] Processing batch ${batchNumber} with ${vehicles.length} vehicles`)
  
  // Process all vehicles in parallel with Promise.allSettled
  const promises = vehicles.map(async (vehicle): Promise<ProcessedVehicle> => {
    try {
      const motResult = await checkMOTStatus(vehicle.registration)
      
      if (motResult.success && motResult.expiryDate) {
        return {
          registration: vehicle.registration,
          success: true,
          expiryDate: motResult.expiryDate,
          motStatus: motResult.motStatus
        }
      } else {
        return {
          registration: vehicle.registration,
          success: false,
          error: motResult.error || 'No expiry date available'
        }
      }
    } catch (error) {
      return {
        registration: vehicle.registration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  const results = await Promise.allSettled(promises)
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        registration: vehicles[index].registration,
        success: false,
        error: result.reason?.message || 'Promise rejected'
      }
    }
  })
}

// Batch update database
async function batchUpdateDatabase(processedVehicles: ProcessedVehicle[]): Promise<number> {
  const successfulUpdates = processedVehicles.filter(v => v.success && v.expiryDate)
  
  if (successfulUpdates.length === 0) {
    return 0
  }

  // Build batch update query
  const updatePromises = successfulUpdates.map(vehicle => 
    sql`
      UPDATE vehicles 
      SET 
        mot_expiry_date = ${vehicle.expiryDate},
        mot_status = ${vehicle.motStatus},
        mot_last_checked = NOW(),
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${vehicle.registration.toUpperCase().replace(/\s/g, "")}
    `
  )

  // Execute all updates in parallel
  await Promise.all(updatePromises)
  
  return successfulUpdates.length
}

export async function POST() {
  try {
    console.log("[FAST-FIX] Starting high-speed MOT expiry date fix...")

    // Get total count
    const totalCountResult = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
    `

    const totalToProcess = parseInt(totalCountResult[0].count)
    console.log(`[FAST-FIX] Found ${totalToProcess} vehicles to process`)

    if (totalToProcess === 0) {
      return NextResponse.json({
        success: true,
        message: "No vehicles need fixing",
        processed: 0,
        fixed: 0,
        errors: 0
      })
    }

    let totalFixed = 0
    let totalErrors = 0
    let totalProcessed = 0
    const errorDetails: string[] = []
    
    // Optimized settings for speed
    const batchSize = 50 // Parallel batch size
    const concurrentBatches = 4 // Number of batches to process simultaneously
    const totalBatchSize = batchSize * concurrentBatches // 200 vehicles at once
    
    let offset = 0
    let batchNumber = 1

    while (offset < totalToProcess) {
      const startTime = Date.now()
      
      // Get larger batch of vehicles
      const vehiclesToFix = await sql`
        SELECT registration, mot_status, mot_last_checked
        FROM vehicles 
        WHERE mot_status IN ('Valid', 'VALID', 'valid')
        AND mot_expiry_date IS NULL
        AND registration IS NOT NULL
        AND registration != ''
        ORDER BY mot_last_checked DESC
        LIMIT ${totalBatchSize}
        OFFSET ${offset}
      ` as VehicleToFix[]

      if (vehiclesToFix.length === 0) break

      console.log(`[FAST-FIX] Processing mega-batch ${batchNumber}: ${vehiclesToFix.length} vehicles (${offset + 1}-${offset + vehiclesToFix.length})`)

      // Split into concurrent batches
      const batches: VehicleToFix[][] = []
      for (let i = 0; i < vehiclesToFix.length; i += batchSize) {
        batches.push(vehiclesToFix.slice(i, i + batchSize))
      }

      // Process all batches in parallel
      const batchPromises = batches.map((batch, index) => 
        processVehicleBatch(batch, batchNumber * 10 + index)
      )

      const batchResults = await Promise.all(batchPromises)
      
      // Flatten results
      const allProcessedVehicles = batchResults.flat()
      
      // Batch update database
      const fixedInThisBatch = await batchUpdateDatabase(allProcessedVehicles)
      
      // Update counters
      totalProcessed += allProcessedVehicles.length
      totalFixed += fixedInThisBatch
      const errorsInBatch = allProcessedVehicles.filter(v => !v.success).length
      totalErrors += errorsInBatch

      // Collect error details (limited)
      allProcessedVehicles
        .filter(v => !v.success)
        .slice(0, 10 - errorDetails.length)
        .forEach(v => errorDetails.push(`${v.registration}: ${v.error}`))

      const batchTime = Date.now() - startTime
      const vehiclesPerSecond = Math.round(allProcessedVehicles.length / (batchTime / 1000))
      
      console.log(`[FAST-FIX] Batch ${batchNumber} complete: ${fixedInThisBatch} fixed, ${errorsInBatch} errors, ${vehiclesPerSecond} vehicles/sec`)
      
      offset += vehiclesToFix.length
      batchNumber++

      // Progress update
      const progressPercent = Math.round((totalProcessed / totalToProcess) * 100)
      console.log(`[FAST-FIX] Progress: ${progressPercent}% (${totalProcessed}/${totalToProcess})`)

      // Small delay between mega-batches to prevent overwhelming the API
      if (offset < totalToProcess) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 0.5 second
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

    console.log(`[FAST-FIX] HIGH-SPEED PROCESSING COMPLETE!`)
    console.log(`[FAST-FIX] Processed: ${totalProcessed}, Fixed: ${totalFixed}, Errors: ${totalErrors}`)

    return NextResponse.json({
      success: true,
      message: `High-speed processing complete! Processed ${totalProcessed} vehicles`,
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
      performance: {
        averageSpeed: `${Math.round(totalProcessed / ((Date.now() - Date.now()) / 60000))} vehicles/minute`,
        parallelProcessing: true,
        batchUpdates: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FAST-FIX] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform high-speed fix",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
