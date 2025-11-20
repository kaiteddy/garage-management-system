import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get("table") || "document_line_items"
    
    console.log(`[TABLE-INFO] Getting info for table: ${tableName}`)

    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `

    const sampleData = await sql.query(`SELECT * FROM ${tableName} LIMIT 3`)

    return NextResponse.json({
      success: true,
      table_name: tableName,
      columns,
      sample_data: sampleData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TABLE-INFO] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get table info",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
