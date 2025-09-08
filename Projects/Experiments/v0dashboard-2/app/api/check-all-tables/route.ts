import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get all tables in the database
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    
    // Check for any tables that might contain service/visit data
    const tableData = []
    for (const table of tables) {
      try {
        const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.table_name}`)
        tableData.push({
          name: table.table_name,
          columns: table.column_count,
          rows: parseInt(count[0].count)
        })
      } catch (error) {
        tableData.push({
          name: table.table_name,
          columns: table.column_count,
          rows: 'Error counting'
        })
      }
    }

    return NextResponse.json({
      success: true,
      tables: tableData
    })

  } catch (error) {
    console.error('Error checking tables:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check tables",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
