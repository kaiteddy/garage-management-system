import { type NextRequest, NextResponse } from "next/server"
import { createMOTReminders } from "@/lib/db/queries"
import { isInReminderWindow } from "@/lib/date-utils"

export async function POST(request: NextRequest) {
  try {
    const { vehicles } = await request.json()

    if (!vehicles || !Array.isArray(vehicles)) {
      return NextResponse.json({ success: false, error: "Invalid vehicles data" }, { status: 400 })
    }

    // Filter vehicles that need reminders
    const vehiclesNeedingReminders = vehicles.filter((vehicle) => {
      // Must have MOT expiry date
      if (!vehicle.motExpiryDate) return false

      // Must be in reminder window (30 days before expiry)
      if (!isInReminderWindow(vehicle.motExpiryDate)) return false

      // Must not already have reminder sent
      if (vehicle.reminderSent) return false

      // Must not be archived
      if (vehicle.archived) return false

      return true
    })

    console.log(`Creating reminders for ${vehiclesNeedingReminders.length} vehicles`)

    // Create reminders in database
    const reminders = await createMOTReminders(vehiclesNeedingReminders)

    return NextResponse.json({
      success: true,
      data: {
        remindersCreated: reminders.length,
        reminders: reminders,
      },
      message: `Created ${reminders.length} MOT reminders`,
    })
  } catch (error) {
    console.error("Failed to create MOT reminders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create MOT reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
