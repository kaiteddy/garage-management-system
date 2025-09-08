import { type NextRequest, NextResponse } from "next/server"
import {
  bulkCheckMOTStatus,
  getAllVehicleRegistrations,
  batchUpdateVehicleMOTData,
  getMOTScanStats,
} from "@/lib/mot-api"
import { hasDVSACredentials, getDVSAAccessToken } from "@/lib/dvsa-auth"
import { initializeDatabase } from "@/lib/database/neon-client"

interface BulkScanProgress {
  isRunning: boolean
  totalVehicles: number
  processedVehicles: number
  successfulScans: number
  failedScans: number
  currentVehicle: string
  averageProcessingTime: number
  estimatedTimeRemaining: number
  startTime: number
  errors: string[]
}

// Global scan state (in production, use Redis or database)
let scanProgress: BulkScanProgress = {
  isRunning: false,
  totalVehicles: 0,
  processedVehicles: 0,
  successfulScans: 0,
  failedScans: 0,
  currentVehicle: "",
  averageProcessingTime: 0,
  estimatedTimeRemaining: 0,
  startTime: 0,
  errors: [],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "status") {
      // Return current scan progress
      return NextResponse.json({
        success: true,
        progress: scanProgress,
      })
    }

    if (action === "stats") {
      // Return MOT scan statistics
      const stats = await getMOTScanStats()
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // Default: return scan readiness check
    const readinessCheck = await checkScanReadiness()
    return NextResponse.json(readinessCheck)
  } catch (error) {
    console.error("[BULK-SCAN-API] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, options = {} } = body

    switch (action) {
      case "start":
        return await startBulkScan(options)
      case "stop":
        return await stopBulkScan()
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[BULK-SCAN-API] POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    )
  }
}

async function checkScanReadiness() {
  try {
    // Check DVSA credentials
    let hasCredentials = false
    try {
      hasCredentials = hasDVSACredentials()
    } catch (credErr) {
      // If parsing DVSA_TOKEN_URL throws (e.g. malformed URL) we still handle gracefully
      return {
        success: false,
        ready: false,
        error: credErr instanceof Error ? credErr.message : "DVSA API credentials not configured",
        details: {
          hasCredentials: false,
          databaseReady: false,
          vehicleCount: 0,
          credError: credErr instanceof Error ? credErr.message : String(credErr),
        },
      }
    }

    if (!hasCredentials) {
      return {
        success: false,
        ready: false,
        error: "DVSA API credentials not configured",
        details: {
          hasCredentials: false,
          databaseReady: false,
          vehicleCount: 0,
        },
      }
    }

    // Test DVSA connection
    try {
      await getDVSAAccessToken()
    } catch (error) {
      return {
        success: false,
        ready: false,
        error: error instanceof Error ? error.message : "DVSA API authentication failed",
        details: {
          hasCredentials: true,
          databaseReady: false,
          vehicleCount: 0,
          authError: error instanceof Error ? error.message : "Unknown auth error",
        },
      }
    }

    // Check database and get vehicle count
    let vehicleCount = 0
    let databaseReady = false

    try {
      const registrations = await getAllVehicleRegistrations()
      vehicleCount = registrations.length
      databaseReady = true
    } catch (dbError) {
      // Try to initialize database if it doesn't exist
      console.log("[BULK-SCAN-API] Database not ready, attempting initialization...")
      const initResult = await initializeDatabase()

      if (initResult.success) {
        try {
          const registrations = await getAllVehicleRegistrations()
          vehicleCount = registrations.length
          databaseReady = true
        } catch {
          vehicleCount = 0
          databaseReady = true // Database exists but no vehicles
        }
      } else {
        return {
          success: false,
          ready: false,
          error: "Database initialization failed",
          details: {
            hasCredentials: true,
            databaseReady: false,
            vehicleCount: 0,
            dbError: initResult.error,
          },
        }
      }
    }

    return {
      success: true,
      ready: vehicleCount > 0,
      message: vehicleCount > 0 ? `Ready to scan ${vehicleCount} vehicles` : "Database ready but no vehicles found",
      details: {
        hasCredentials: true,
        databaseReady,
        vehicleCount,
        isCurrentlyScanning: scanProgress.isRunning,
      },
    }
  } catch (error) {
    return {
      success: false,
      ready: false,
      error: error instanceof Error ? error.message : "Readiness check failed",
    }
  }
}

async function startBulkScan(options: any) {
  try {
    if (scanProgress.isRunning) {
      return NextResponse.json({ success: false, error: "Bulk scan already in progress" }, { status: 409 })
    }

    // Get all vehicle registrations
    const registrations = await getAllVehicleRegistrations()

    if (registrations.length === 0) {
      return NextResponse.json({ success: false, error: "No vehicles found to scan" }, { status: 400 })
    }

    let credsOk = false
    try {
      credsOk = hasDVSACredentials()
    } catch (credErr) {
      throw new Error(credErr instanceof Error ? credErr.message : "DVSA API credentials not configured.")
    }
    if (!credsOk) {
      throw new Error(
        "DVSA API credentials not configured. Please set DVSA_TOKEN_URL and DVSA_TOKEN environment variables.",
      )
    }

    // Initialize scan progress
    scanProgress = {
      isRunning: true,
      totalVehicles: registrations.length,
      processedVehicles: 0,
      successfulScans: 0,
      failedScans: 0,
      currentVehicle: "",
      averageProcessingTime: 0,
      estimatedTimeRemaining: 0,
      startTime: Date.now(),
      errors: [],
    }

    // Start the bulk scan in the background
    performBulkScan(registrations, options).catch((error) => {
      console.error("[BULK-SCAN] Background scan error:", error)
      scanProgress.isRunning = false
      scanProgress.errors.push(error instanceof Error ? error.message : "Unknown error")
    })

    return NextResponse.json({
      success: true,
      message: `Started bulk MOT scan for ${registrations.length} vehicles`,
      scanId: Date.now().toString(),
      totalVehicles: registrations.length,
    })
  } catch (error) {
    console.error("[BULK-SCAN] Start error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start bulk scan",
      },
      { status: 500 },
    )
  }
}

async function stopBulkScan() {
  scanProgress.isRunning = false

  return NextResponse.json({
    success: true,
    message: "Bulk scan stopped",
    finalStats: {
      totalVehicles: scanProgress.totalVehicles,
      processedVehicles: scanProgress.processedVehicles,
      successfulScans: scanProgress.successfulScans,
      failedScans: scanProgress.failedScans,
    },
  })
}

async function performBulkScan(registrations: string[], options: any) {
  console.log(`[BULK-SCAN] Starting bulk scan for ${registrations.length} vehicles`)

  const scanOptions = {
    concurrency: options.concurrency || 15,
    batchSize: options.batchSize || 100,
    delayBetweenBatches: options.delayBetweenBatches || 500,
    onProgress: (processed: number, total: number, current: string, avgTime: number) => {
      scanProgress.processedVehicles = processed
      scanProgress.currentVehicle = current
      scanProgress.averageProcessingTime = avgTime

      // Calculate estimated time remaining
      const remainingVehicles = total - processed
      scanProgress.estimatedTimeRemaining = remainingVehicles * avgTime

      // Log progress every 50 vehicles
      if (processed % 50 === 0) {
        console.log(`[BULK-SCAN] Progress: ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%)`)
      }
    },
  }

  try {
    const results = await bulkCheckMOTStatus(registrations, scanOptions)

    // Update scan progress with results
    scanProgress.successfulScans = results.filter((r) => r.success).length
    scanProgress.failedScans = results.filter((r) => !r.success).length

    // Update database with results
    console.log("[BULK-SCAN] Updating database with scan results...")
    await batchUpdateVehicleMOTData(results)

    // Mark scan as complete
    scanProgress.isRunning = false

    const totalTime = Date.now() - scanProgress.startTime
    console.log(`[BULK-SCAN] Bulk scan completed in ${(totalTime / 1000).toFixed(1)} seconds`)
    console.log(`[BULK-SCAN] Results: ${scanProgress.successfulScans} successful, ${scanProgress.failedScans} failed`)
  } catch (error) {
    console.error("[BULK-SCAN] Scan error:", error)
    scanProgress.isRunning = false
    scanProgress.errors.push(error instanceof Error ? error.message : "Unknown scan error")
  }
}
