import { type NextRequest, NextResponse } from "next/server"
import { testDVSAConnection } from "@/lib/dvsa-test"

export async function GET(request: NextRequest) {
  try {
    const result = await testDVSAConnection()
    return NextResponse.json(result)
  } catch (error) {
    console.error("DVSA test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test DVSA connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
