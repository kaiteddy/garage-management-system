/**
 * BOTTLENECK-OPTIMIZED MOT Batch Processing System
 * Maximum speed with proper rate limiting
 */

import { getAllVehicleRegistrations, updateVehicleMOTData } from "./db/queries"
import { batchCheckMOTStatus } from "./mot-api"

export interface MOTScanResult {
  totalVehicles: number
  processedVehicles: number
  successfulChecks: number
  failedChecks: number
  validMOTs: number
  dueSoon: number
  expired: number
  unknown: number
  errors: string[]
  startTime: string
  endTime: string
  duration: number
  vehiclesPerSecond: number
  estimatedTimeRemaining?: number
  currentBatch?: number
  totalBatches?: number
}

/**
 * BOTTLENECK-OPTIMIZED: Start a full MOT scan with maximum speed and proper rate limiting
 */
export async function startFullMOTScan(): Promise<MOTScanResult> {
  const startTime = new Date().toISOString()
  const scanStartMs = Date.now()

  console.log("[MOT-BATCH] Starting BOTTLENECK-OPTIMIZED full MOT database scan...")
  console.log(`[MOT-BATCH] Scan started at: ${startTime}`)

  const result: MOTScanResult = {
    totalVehicles: 0,
    processedVehicles: 0,
    successfulChecks: 0,
    failedChecks: 0,
    validMOTs: 0,
    dueSoon: 0,
    expired: 0,
    unknown: 0,
    errors: [],
    startTime,
    endTime: "",
    duration: 0,
    vehiclesPerSecond: 0,
  }

  try {
    // Get all vehicle registrations from database
    console.log("[MOT-BATCH] Fetching vehicle registrations from database...")
    const registrations = await getAllVehicleRegistrations()

    if (registrations.length === 0) {
      console.warn("[MOT-BATCH] No vehicle registrations found in database")
      result.errors.push("No vehicle registrations found in database")
      result.endTime = new Date().toISOString()
      result.duration = Date.now() - scanStartMs
      return result
    }

    result.totalVehicles = registrations.length
    console.log(`[MOT-BATCH] Found ${registrations.length} vehicles to scan`)

    // Calculate estimated time with Bottleneck rate limiting
    // 15 RPS with 10 concurrent = ~15 vehicles per second theoretical max
    // In practice, expect ~10-12 vehicles per second due to API response times
    const estimatedSeconds = Math.ceil(registrations.length / 12)
    console.log(`[MOT-BATCH] Estimated completion time: ${Math.ceil(estimatedSeconds / 60)} minutes`)

    // Process vehicles with BOTTLENECK rate limiting
    console.log("[MOT-BATCH] Starting BOTTLENECK-OPTIMIZED batch MOT checks...")
    const motResults = await batchCheckMOTStatus(registrations)

    result.processedVehicles = motResults.length
    console.log(`[MOT-BATCH] Processed ${motResults.length} vehicles`)

    // Analyze results
    for (const motResult of motResults) {
      if (motResult.motStatus === "error") {
        result.failedChecks++
        if (motResult.error) {
          result.errors.push(`${motResult.registration}: ${motResult.error}`)
        }
      } else {
        result.successfulChecks++

        // Count by status
        switch (motResult.motStatus) {
          case "valid":
            result.validMOTs++
            break
          case "due-soon":
            result.dueSoon++
            break
          case "expired":
            result.expired++
            break
          case "unknown":
            result.unknown++
            break
        }

        // Update database with MOT data (async, don't wait)
        updateVehicleMOTData(motResult.registration, motResult).catch((updateError) => {
          console.error(`[MOT-BATCH] Failed to update database for ${motResult.registration}:`, updateError)
        })
      }
    }

    result.endTime = new Date().toISOString()
    result.duration = Date.now() - scanStartMs
    result.vehiclesPerSecond = Number((result.processedVehicles / (result.duration / 1000)).toFixed(2))

    console.log("[MOT-BATCH] BOTTLENECK-OPTIMIZED scan completed successfully!")
    console.log(`[MOT-BATCH] Results: ${result.successfulChecks} successful, ${result.failedChecks} failed`)
    console.log(
      `[MOT-BATCH] MOT Status: ${result.validMOTs} valid, ${result.dueSoon} due soon, ${result.expired} expired, ${result.unknown} unknown`,
    )
    console.log(`[MOT-BATCH] Duration: ${Math.round(result.duration / 1000)} seconds`)
    console.log(`[MOT-BATCH] Speed: ${result.vehiclesPerSecond} vehicles/second`)

    return result
  } catch (error) {
    console.error("[MOT-BATCH] Scan failed with error:", error)

    result.errors.push(error instanceof Error ? error.message : "Unknown scan error")
    result.endTime = new Date().toISOString()
    result.duration = Date.now() - scanStartMs
    result.vehiclesPerSecond =
      result.processedVehicles > 0 ? Number((result.processedVehicles / (result.duration / 1000)).toFixed(2)) : 0

    return result
  }
}

/**
 * Get scan progress (for real-time updates)
 */
export function getScanProgress(): { inProgress: boolean; progress?: number } {
  // TODO: Implement real-time progress tracking
  return { inProgress: false }
}
