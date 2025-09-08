import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[TEST-DB] Testing database connection...")

    // Check what tables exist
    const tablesResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log("[TEST-DB] Available tables:", tablesResult)

    // Check all tables for data and specifically look for imported data
    let tableData = {}
    let totalRecords = 0

    for (const table of tablesResult) {
      const tableName = table.table_name
      try {
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
        const count = parseInt(countResult[0]?.count || 0)
        totalRecords += count

        let sampleData = []
        let columns = []

        if (count > 0) {
          sampleData = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 3`)
        }

        // Get column structure for key tables
        if (['customers', 'documents', 'vehicles'].includes(tableName)) {
          try {
            columns = await sql`
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_name = ${tableName}
              ORDER BY ordinal_position
            `
          } catch (colError) {
            columns = [{ error: colError.message }]
          }
        }

        tableData[tableName] = {
          count: count,
          sampleData: sampleData,
          columns: columns
        }
      } catch (error) {
        tableData[tableName] = {
          count: 0,
          error: error.message
        }
      }
    }

    // Check database name and connection info
    const dbInfo = await sql`SELECT current_database(), current_user, version()`

    // Test basic connection
    const connectionTest = await sql`SELECT 1 as test, NOW() as current_time`

    console.log("[TEST-DB] Connection test:", connectionTest)

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      database: dbInfo[0],
      totalRecords: totalRecords,
      tables: tablesResult.map(row => row.table_name),
      tableData: tableData,
      connectionTest: connectionTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TEST-DB] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
