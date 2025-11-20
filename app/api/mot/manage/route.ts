import { type NextRequest, NextResponse } from "next/server"
import { getConnectedData } from "@/lib/database/connector"
import { checkMOTStatus } from "@/lib/mot-api"
import { setCachedMOTData } from "@/lib/mot-cache"

export async function GET(request: NextRequest) {
  try {
    const data = await getConnectedData()
    const vehicles = Array.from(data.vehicles.values())

    const motSummary = vehicles.map((vehicle) => ({
      registration: vehicle.registration,
      motExpiry: vehicle.motExpiry,
      hasReminder: vehicle.reminders.some((r) => r.type?.toUpperCase().includes("MOT")),
      customerName: vehicle.customer
        ? `${vehicle.customer.forename} ${vehicle.customer.surname}`.trim() || vehicle.customer.companyName
        : "Unknown",
    }))

    return NextResponse.json({
      success: true,
      data: motSummary,
      count: motSummary.length,
    })
  } catch (error) {
    console.error("MOT manage error:", error)
    return NextResponse.json({ success: false, error: "Failed to get MOT management data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, registrations } = await request.json()

    if (action === "refresh" && Array.isArray(registrations)) {
      const results = []

      for (const registration of registrations) {
        try {
          const motData = await checkMOTStatus(registration)
          setCachedMOTData(registration, motData)
          results.push({
            registration,
            success: true,
            data: motData,
          })
        } catch (error) {
          results.push({
            registration,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      return NextResponse.json({
        success: true,
        results,
        message: `Refreshed MOT data for ${results.length} vehicles`,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action or parameters" }, { status: 400 })
  } catch (error) {
    console.error("MOT manage POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to manage MOT data" }, { status: 500 })
  }
}
