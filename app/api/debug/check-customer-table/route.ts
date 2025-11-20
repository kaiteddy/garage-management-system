import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-CUSTOMER-TABLE] 🔍 Checking customer table structure...")

    // Get table structure
    const structure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    // Get sample data
    const sampleData = await sql`
      SELECT * FROM customers LIMIT 3
    `

    return NextResponse.json({
      success: true,
      structure,
      sampleData
    })

  } catch (error) {
    console.error("[CHECK-CUSTOMER-TABLE] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check customer table structure",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
