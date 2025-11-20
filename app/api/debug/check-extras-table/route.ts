import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-EXTRAS-TABLE] 🔍 Checking document_extras table structure...")

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'document_extras'
      )
    `

    if (!tableExists[0].exists) {
      return NextResponse.json({
        success: false,
        error: "document_extras table does not exist"
      })
    }

    // Get table structure
    const structure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'document_extras'
      ORDER BY ordinal_position
    `

    // Get sample data if any exists
    const sampleData = await sql`
      SELECT * FROM document_extras LIMIT 5
    `

    // Get count
    const count = await sql`
      SELECT COUNT(*) as count FROM document_extras
    `

    return NextResponse.json({
      success: true,
      tableExists: true,
      structure,
      sampleData,
      count: count[0].count
    })

  } catch (error) {
    console.error("[CHECK-EXTRAS-TABLE] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check table structure",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
