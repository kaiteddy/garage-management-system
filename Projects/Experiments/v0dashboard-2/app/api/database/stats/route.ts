import { NextResponse } from "next/server"
import { getDatabaseStats } from "@/lib/database/neon-client"

export async function GET() {
  try {
    const stats = await getDatabaseStats()

    return NextResponse.json({
      success: true,
      stats: {
        customers: stats.customers,
        vehicles: stats.vehicles,
        jobs: 0, // Not implemented yet
        reminders: stats.reminders,
        appointments: stats.appointments,
        documents: stats.documents,
        stock_items: stats.stock,
      },
    })
  } catch (error) {
    console.error("[DATABASE-STATS] Error getting stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get database stats",
      },
      { status: 500 },
    )
  }
}
