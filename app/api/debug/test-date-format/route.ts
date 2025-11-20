import { NextResponse } from "next/server"
import { formatDisplayDate } from "@/lib/date-utils"

export async function GET() {
  try {
    const testDate = "2024-01-14T00:00:00.000Z"
    const formatted = formatDisplayDate(testDate)
    
    return NextResponse.json({
      success: true,
      test: {
        input: testDate,
        output: formatted,
        currentDate: new Date().toISOString(),
        formatFunction: "formatDisplayDate from @/lib/date-utils"
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
