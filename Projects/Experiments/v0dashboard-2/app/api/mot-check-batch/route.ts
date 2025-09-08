import { type NextRequest, NextResponse } from "next/server"
import { checkMOTStatus } from "@/lib/mot-api"

export async function POST(request: NextRequest) {
  try {
    const { registrations } = await request.json()

    if (!Array.isArray(registrations) || registrations.length === 0) {
      return NextResponse.json({ error: "Invalid registrations array" }, { status: 400 })
    }

    console.log(`[SERVER] 🔍 Batch MOT check for ${registrations.length} vehicles`)

    // Process MOT checks with rate limiting
    const results = await Promise.allSettled(
      registrations.map(async (registration: string, index: number) => {
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, index * 100))

        try {
          const motData = await checkMOTStatus(registration)
          return {
            registration,
            success: true,
            data: motData,
          }
        } catch (error) {
          console.error(`[SERVER] ❌ MOT check failed for ${registration}:`, error)
          return {
            registration,
            success: false,
            error: error instanceof Error ? error.message : "MOT check failed",
          }
        }
      }),
    )

    const processedResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      } else {
        return {
          registration: registrations[index],
          success: false,
          error: "Request failed",
        }
      }
    })

    const successCount = processedResults.filter((r) => r.success).length
    console.log(`[SERVER] ✅ Completed batch MOT check: ${successCount}/${registrations.length} successful`)

    return NextResponse.json({
      results: processedResults,
      summary: {
        total: registrations.length,
        successful: successCount,
        failed: registrations.length - successCount,
      },
    })
  } catch (error) {
    console.error("[SERVER] ❌ Batch MOT check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
