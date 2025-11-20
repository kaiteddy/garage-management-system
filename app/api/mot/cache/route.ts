import { type NextRequest, NextResponse } from "next/server"
import { getCachedMOTData, setCachedMOTData, clearMOTCache } from "@/lib/mot-cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get("registration")

    if (!registration) {
      return NextResponse.json({ success: false, error: "Registration parameter required" }, { status: 400 })
    }

    const cachedData = getCachedMOTData(registration)

    return NextResponse.json({
      success: true,
      data: cachedData,
      cached: !!cachedData,
    })
  } catch (error) {
    console.error("MOT cache GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to get cached MOT data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { registration, data } = await request.json()

    if (!registration || !data) {
      return NextResponse.json({ success: false, error: "Registration and data required" }, { status: 400 })
    }

    setCachedMOTData(registration, data)

    return NextResponse.json({
      success: true,
      message: "MOT data cached successfully",
    })
  } catch (error) {
    console.error("MOT cache POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to cache MOT data" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get("registration")

    if (registration) {
      // Clear specific registration
      clearMOTCache(registration)
    } else {
      // Clear all cache
      clearMOTCache()
    }

    return NextResponse.json({
      success: true,
      message: registration ? `Cache cleared for ${registration}` : "All cache cleared",
    })
  } catch (error) {
    console.error("MOT cache DELETE error:", error)
    return NextResponse.json({ success: false, error: "Failed to clear MOT cache" }, { status: 500 })
  }
}
