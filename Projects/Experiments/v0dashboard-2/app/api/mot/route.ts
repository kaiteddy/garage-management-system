import { type NextRequest, NextResponse } from "next/server"
import { checkMOTStatus } from "@/lib/mot-api"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const registration = searchParams.get("registration")
  const refresh = searchParams.get("refresh") === "true"

  if (!registration) {
    return NextResponse.json(
      {
        success: false,
        error: "Registration number is required",
      },
      { status: 400 },
    )
  }

  // Validate registration format (basic check)
  if (!/^[A-Z0-9\s]{1,10}$/i.test(registration)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid registration number format",
      },
      { status: 400 },
    )
  }

  try {
    console.log(`🔍 MOT API: Looking up registration ${registration} (refresh: ${refresh})`)

    // Call the combined DVSA/DVLA MOT check
    const motData = await checkMOTStatus(registration)

    if (!motData) {
      return NextResponse.json(
        {
          success: false,
          error: `Vehicle with registration ${registration} not found in DVSA/DVLA databases`,
          registration: registration.toUpperCase().replace(/\s/g, ""),
        },
        { status: 404 },
      )
    }

    console.log(`✅ MOT API: Successfully retrieved data for ${registration}`)

    return NextResponse.json({
      success: true,
      data: motData,
      source: "DVSA_DVLA_COMBINED",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("MOT API error:", error)

    let errorMessage = "Failed to fetch MOT data"
    let statusCode = 500
    let details = "Unknown error"

    if (error instanceof Error) {
      errorMessage = error.message
      details = error.stack || error.message

      // Handle specific error cases
      if (error.message.includes("404")) {
        statusCode = 404
        errorMessage = "Vehicle not found"
      } else if (error.message.includes("401") || error.message.includes("403")) {
        statusCode = 403
        errorMessage = "Authentication failed. Please check API credentials."
      } else if (error.message.includes("ENOTFOUND")) {
        errorMessage = "Could not connect to the API. Please check your internet connection."
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: details,
        registration: registration.toUpperCase().replace(/\s/g, ""),
      },
      { status: statusCode },
    )
  }
}
