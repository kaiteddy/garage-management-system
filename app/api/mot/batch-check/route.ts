import { type NextRequest, NextResponse } from "next/server"
import { bulkCheckMOTStatus } from "@/lib/mot-api"

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

    const updated = results.filter((r) => r.status !== "unknown" && r.status !== "error").length
    const errors = results.filter((r) => r.status === "error").length

    console.log(`[MOT-BATCH] Completed: ${updated} updated, ${errors} errors`)

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: registrations.length,
      results,
    })
  } catch (error) {
    console.error("[MOT-BATCH] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
