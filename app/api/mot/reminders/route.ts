import { NextResponse } from "next/server"
import { getUpcomingMOTReminders } from "@/lib/db/queries"

export async function GET() {
  try {
    // This is a placeholder - you'll need to implement getUpcomingMOTReminders
    // to fetch vehicles with MOTs due in the next 30 days
    const reminders = await getUpcomingMOTReminders()
    
    return NextResponse.json({
      success: true,
      data: reminders,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Failed to fetch MOT reminders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MOT reminders",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
