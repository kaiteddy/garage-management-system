import { NextResponse } from "next/server"
import { getReminderStats } from "@/lib/db/queries"

export async function GET() {
  try {
    const stats = await getReminderStats()

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to get reminder stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get reminder stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
