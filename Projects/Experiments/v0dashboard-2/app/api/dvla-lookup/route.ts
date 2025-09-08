import { type NextRequest, NextResponse } from "next/server"
import { lookupVehicle } from "@/lib/dvla-api"

export async function POST(request: NextRequest) {
  try {
    const { registration } = await request.json()

    if (!registration) {
      return NextResponse.json({ error: "Registration number is required" }, { status: 400 })
    }

    console.log(`🔍 DVLA API: Looking up registration ${registration}`)

    const vehicleData = await lookupVehicle(registration)

    if (!vehicleData) {
      return NextResponse.json(
        {
          error: "Vehicle not found in DVLA database",
          registration: registration.toUpperCase().replace(/\s/g, ""),
        },
        { status: 404 },
      )
    }

    console.log(`✅ DVLA API: Successfully found vehicle data for ${registration}`)

    return NextResponse.json({
      success: true,
      data: vehicleData,
      source: "DVLA_API",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("DVLA lookup API error:", error)

    if (error instanceof Error) {
      if (error.message === "Vehicle not found") {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
      }

      return NextResponse.json(
        {
          error: error.message,
          details: error.stack || error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
