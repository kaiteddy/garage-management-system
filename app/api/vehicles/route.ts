import { type NextRequest, NextResponse } from "next/server"
import { VehicleService } from "@/lib/database/vehicle-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get("registration")

    if (registration) {
      const vehicle = await VehicleService.getVehicleByRegistration(registration)
      return NextResponse.json({
        success: true,
        data: vehicle,
      })
    }

    const vehicles = await VehicleService.getAllVehicles()
    return NextResponse.json({
      success: true,
      data: vehicles,
      count: vehicles.length,
    })
  } catch (error) {
    console.error("Error fetching vehicles:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch vehicles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create") {
      const vehicle = await VehicleService.createVehicle(body)
      return NextResponse.json({
        success: true,
        data: vehicle,
        message: "Vehicle created successfully",
      })
    }

    if (action === "update-mot") {
      const { registration, motData } = body
      const vehicle = await VehicleService.updateVehicleMOT(registration, motData)
      return NextResponse.json({
        success: !!vehicle,
        data: vehicle,
        message: vehicle ? "Vehicle MOT updated successfully" : "Vehicle not found",
      })
    }

    if (action === "batch-update-mot") {
      const { motResults } = body
      const updated = await VehicleService.batchUpdateMOTData(motResults)
      return NextResponse.json({
        success: true,
        updated,
        message: `Updated ${updated} vehicles`,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Vehicle operation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Vehicle operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
