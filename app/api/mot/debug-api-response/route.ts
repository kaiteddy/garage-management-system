import { NextResponse } from "next/server"
import { checkMOTStatus } from "@/lib/mot-api"

export async function POST(request: Request) {
  try {
    const { registration } = await request.json()
    
    if (!registration) {
      return NextResponse.json(
        { success: false, error: "Registration required" },
        { status: 400 }
      )
    }

    console.log(`[DEBUG-API] Checking MOT API response for: ${registration}`)
    
    // Call the MOT API and get detailed response
    const motResult = await checkMOTStatus(registration)
    
    return NextResponse.json({
      success: true,
      registration,
      motResult,
      analysis: {
        hasExpiryDate: !!motResult.expiryDate,
        hasVehicleData: !!motResult.vehicleData,
        motTestsCount: motResult.vehicleData?.motTests?.length || 0,
        latestTest: motResult.vehicleData?.motTests?.[0] || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug API response",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
