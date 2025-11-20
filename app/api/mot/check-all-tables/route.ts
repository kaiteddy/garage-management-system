import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-ALL-TABLES] Checking all database tables...")

    // Get all tables
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    let tableDetails = []

    for (const table of tables) {
      try {
        const tableName = table.table_name
        
        // Get row count
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
        const rowCount = parseInt(countResult[0].count)

        // Get columns
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `

        // Get sample data if table has rows
        let sampleData = []
        if (rowCount > 0) {
          sampleData = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 2`)
        }

        tableDetails.push({
          tableName,
          rowCount,
          columnCount: parseInt(table.column_count),
          columns: columns.map(c => ({ name: c.column_name, type: c.data_type })),
          sampleData
        })

      } catch (error) {
        console.log(`[CHECK-ALL-TABLES] Error checking table ${table.table_name}:`, error.message)
        tableDetails.push({
          tableName: table.table_name,
          error: error.message
        })
      }
    }

    // Sort by row count
    tableDetails.sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0))

    return NextResponse.json({
      success: true,
      message: "Database table analysis completed",
      results: {
        totalTables: tableDetails.length,
        tableDetails
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-ALL-TABLES] Error:", error)
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
