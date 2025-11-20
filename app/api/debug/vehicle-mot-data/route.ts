import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'NG07 LML'
    
    console.log(`[DEBUG-VEHICLE-MOT] 🔍 Checking MOT data for ${registration}`)

    // Fetch vehicle data from the API
    const vehicleResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://f17fee16adb2.ngrok-free.app'}/api/vehicles/${encodeURIComponent(registration)}`)
    const vehicleData = await vehicleResponse.json()

    if (!vehicleData.success) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch vehicle data",
        details: vehicleData.error
      })
    }

    const vehicle = vehicleData.vehicle

    return NextResponse.json({
      success: true,
      debug: {
        registration: vehicle.registration,
        motStatus: vehicle.motStatus,
        motExpiryDate: vehicle.motExpiryDate,
        motHistory: vehicle.motHistory,
        motHistoryCount: vehicle.motHistory?.length || 0,
        motHistoryStructure: vehicle.motHistory?.map((mot: any) => ({
          testDate: mot.testDate,
          expiryDate: mot.expiryDate,
          result: mot.result,
          mileage: mot.mileage,
          testNumber: mot.testNumber,
          dataTypes: {
            testDate: typeof mot.testDate,
            expiryDate: typeof mot.expiryDate,
            result: typeof mot.result,
            mileage: typeof mot.mileage,
            testNumber: typeof mot.testNumber
          }
        })) || []
      }
    })

  } catch (error) {
    console.error("[DEBUG-VEHICLE-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to debug vehicle MOT data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
