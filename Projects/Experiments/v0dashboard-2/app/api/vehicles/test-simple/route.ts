import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("🧪 Testing simple vehicle query...")

    // Test the most basic query possible
    const result = await sql`SELECT COUNT(*) as count FROM vehicles`
    
    console.log("✅ Basic query successful:", result)

    return NextResponse.json({
      success: true,
      message: "Basic query successful",
      vehicleCount: result[0]?.count || 0
    })

  } catch (error) {
    console.error("❌ Basic query failed:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Basic query failed",
        errorDetails: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}
