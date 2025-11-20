import { type NextRequest, NextResponse } from "next/server"
import { sql, initializeDatabase } from "@/lib/database/neon-client"
import { getDVSAAccessToken, hasDVSACredentials } from "@/lib/dvsa-auth"
import { checkMOTStatus } from "@/lib/mot-api"

interface ScanStats {
  total: number
  processed: number
  successful: number
  failed: number
  remaining: number
  progress: number
}

interface ScanResult {
  registration: string
  status: "success" | "failed" | "not_found" | "processed" | "error"
  motStatus?: string
  motExpiry?: string
  error?: string
}

// In-memory scan state
let scanState = {
  isRunning: false,
  isPaused: false,
  currentBatch: 0,
  totalVehicles: 0,
  processedCount: 0,
  successCount: 0,
  failedCount: 0,
  results: [] as ScanResult[],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const getStatus = searchParams.get("status") === "true"

    if (getStatus) {
      const stats: ScanStats = {
        total: scanState.totalVehicles,
        processed: scanState.processedCount,
        successful: scanState.successCount,
        failed: scanState.failedCount,
        remaining: Math.max(0, scanState.totalVehicles - scanState.processedCount),
        progress: scanState.totalVehicles > 0 ? (scanState.processedCount / scanState.totalVehicles) * 100 : 0,
      }

      return NextResponse.json({
        success: true,
        stats,
        results: scanState.results.slice(-10),
        isRunning: scanState.isRunning,
        isPaused: scanState.isPaused,
      })
    }

    console.log("[MOT-SCAN-API] Getting vehicle count...")

    let vehicleCount = 0
    let hasInitialized = false

    try {
      const result =
        await sql`SELECT COUNT(*)::int as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''`
      vehicleCount = result[0]?.count || 0
      console.log(`[MOT-SCAN-API] Found ${vehicleCount} vehicles`)
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError)
      console.log(`[MOT-SCAN-API] Database error: ${msg}`)

      if (/relation .*vehicles.* does not exist/i.test(msg)) {
        console.log("[MOT-SCAN-API] Vehicles table missing, initializing database...")

        const initResult = await initializeDatabase()

        if (initResult.success) {
          hasInitialized = true
          console.log("[MOT-SCAN-API] Database initialized successfully")

          // Retry the count after initialization
          try {
            const retryResult =
              await sql`SELECT COUNT(*)::int as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''`
            vehicleCount = retryResult[0]?.count || 0
            console.log(`[MOT-SCAN-API] After initialization: ${vehicleCount} vehicles`)
          } catch (retryError) {
            console.error("[MOT-SCAN-API] Retry count failed:", retryError)
            vehicleCount = 0
          }
        } else {
          console.error("[MOT-SCAN-API] Database initialization failed:", initResult.error)
          vehicleCount = 0
        }
      } else {
        console.error("[MOT-SCAN-API] Unexpected database error:", dbError)
        throw dbError
      }
    }

    return NextResponse.json({
      success: true,
      vehicleCount,
      message: hasInitialized
        ? "Database initialized and ready for scanning"
        : vehicleCount > 0
          ? `Found ${vehicleCount} vehicles ready for MOT scanning`
          : "No vehicles found in database. Please add vehicle data first.",
      hasInitialized,
    })
  } catch (error) {
    console.error("[MOT-SCAN-API] GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get scan statistics",
        vehicleCount: 0,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, batchSize = 10 } = body

    switch (action) {
      case "start":
        return await startScan(batchSize)
      case "pause":
        return await pauseScan()
      case "resume":
        return await resumeScan()
      case "stop":
        return await stopScan()
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[MOT-SCAN-API] POST error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scan operation failed",
      },
      { status: 500 },
    )
  }
}

async function startScan(batchSize: number) {
  try {
    if (!hasDVSACredentials()) {
      throw new Error(
        "DVSA API credentials not configured. Please set DVSA_TOKEN_URL and DVSA_TOKEN environment variables.",
      )
    }

    try {
      await getDVSAAccessToken()
    } catch (tokenError) {
      throw new Error(
        `DVSA authentication failed: ${tokenError instanceof Error ? tokenError.message : "Unknown error"}`,
      )
    }

    const vehicles = await sql`
      SELECT id, registration, make, model, year
      FROM vehicles 
      WHERE registration IS NOT NULL 
      AND registration != ''
      ORDER BY registration
    `

    if (vehicles.length === 0) {
      throw new Error("No vehicles found to scan. Please add vehicle data to your database first.")
    }

    scanState = {
      isRunning: true,
      isPaused: false,
      currentBatch: 0,
      totalVehicles: vehicles.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
    }

    processScanBatch(vehicles, batchSize)

    return NextResponse.json({
      success: true,
      message: `Started scanning ${vehicles.length} vehicles`,
      totalVehicles: vehicles.length,
    })
  } catch (error) {
    console.error("[MOT-SCAN] Start error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start scan",
      },
      { status: 500 },
    )
  }
}

async function pauseScan() {
  scanState.isPaused = true
  return NextResponse.json({
    success: true,
    message: "Scan paused",
  })
}

async function resumeScan() {
  scanState.isPaused = false
  return NextResponse.json({
    success: true,
    message: "Scan resumed",
  })
}

async function stopScan() {
  scanState.isRunning = false
  scanState.isPaused = false
  return NextResponse.json({
    success: true,
    message: "Scan stopped",
  })
}

async function processScanBatch(vehicles: any[], batchSize: number) {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  for (let i = 0; i < vehicles.length; i += batchSize) {
    if (!scanState.isRunning) {
      console.log("[MOT-SCAN] Scan stopped by user")
      break
    }

    while (scanState.isPaused && scanState.isRunning) {
      await delay(1000)
    }

    const batch = vehicles.slice(i, i + batchSize)
    console.log(
      `[MOT-SCAN] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vehicles.length / batchSize)}`,
    )

    for (const vehicle of batch) {
      if (!scanState.isRunning) break

      try {
        const motResult = await checkMOTStatus(vehicle.registration)

        if (motResult.success) {
          await sql`
            UPDATE vehicles 
            SET 
              mot_expiry_date = ${motResult.expiryDate || null},
              mot_status = ${motResult.motStatus || "unknown"},
              mot_last_checked = NOW(),
              updated_at = NOW()
            WHERE id = ${vehicle.id}
          `

          scanState.results.push({
            registration: vehicle.registration,
            status: "success",
            motStatus: motResult.motStatus,
            motExpiry: motResult.expiryDate,
          })
          scanState.successCount++
        } else {
          scanState.results.push({
            registration: vehicle.registration,
            status: motResult.motStatus === "no-mot" ? "not_found" : "failed",
            error: motResult.error,
          })
          scanState.failedCount++
        }
      } catch (error) {
        console.error(`[MOT-SCAN] Error processing ${vehicle.registration}:`, error)
        scanState.results.push({
          registration: vehicle.registration,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        scanState.failedCount++
      }

      scanState.processedCount++
      await delay(200) // Rate limiting
    }

    await delay(1000) // Batch delay
  }

  scanState.isRunning = false
  scanState.isPaused = false
  console.log(
    `[MOT-SCAN] Scan completed. Processed: ${scanState.processedCount}, Success: ${scanState.successCount}, Failed: ${scanState.failedCount}`,
  )
}
