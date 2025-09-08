import { type NextRequest, NextResponse } from "next/server"
import { bulkCheckMOTStatus, updateVehicleMOTData } from "@/lib/mot-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrations } = body

    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json({ success: false, error: "Invalid registrations array" }, { status: 400 })
    }

    if (registrations.length === 0) {
      return NextResponse.json({ success: false, error: "No registrations provided" }, { status: 400 })
    }

    if (registrations.length > 100) {
      return NextResponse.json({ success: false, error: "Too many registrations (max 100)" }, { status: 400 })
    }

    console.log(`[MOT-BATCH] Processing ${registrations.length} registrations`)

    const results = await bulkCheckMOTStatus(registrations)

    // Update database with MOT results in smaller batches to avoid connection timeouts
    let databaseUpdated = 0
    const successfulResults = results.filter(r => r.success && r.registration)

    console.log(`[MOT-BATCH] Updating database for ${successfulResults.length} successful results`)

    // Process database updates in smaller batches of 10 to avoid overwhelming the connection pool
    const dbBatchSize = 10
    for (let i = 0; i < successfulResults.length; i += dbBatchSize) {
      const batch = successfulResults.slice(i, i + dbBatchSize)

      const updatePromises = batch.map(async (motResult) => {
        try {
          await updateVehicleMOTData(motResult.registration, motResult)
          databaseUpdated++
        } catch (error) {
          console.error(`[MOT-BATCH] Failed to update database for ${motResult.registration}:`, error)
        }
      })

      await Promise.all(updatePromises)

      // Small delay between batches to prevent connection pool exhaustion
      if (i + dbBatchSize < successfulResults.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const updated = results.filter((r) => r.success).length
    const errors = results.filter((r) => !r.success).length

    console.log(`[MOT-BATCH] Completed: ${updated} checked, ${databaseUpdated} database updates, ${errors} errors`)

    return NextResponse.json({
      success: true,
      checked: updated,
      databaseUpdated,
      errors,
      total: registrations.length,
      results,
    })
  } catch (error) {
    console.error("[MOT-BATCH] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
