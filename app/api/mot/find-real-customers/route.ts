import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[FIND-REAL-CUSTOMERS] Searching for real customers from Customers.csv...")

    // First, remove the test customers
    await sql`DELETE FROM customers WHERE id IN ('1', '2', '3')`

    // Check all tables for customer data
    const tableNames = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    console.log("[FIND-REAL-CUSTOMERS] Available tables:", tableNames.map(t => t.table_name))

    let customerResults = []

    // Check each table for customer-like data
    for (const table of tableNames) {
      try {
        const tableName = table.table_name
        
        // Get column information
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `

        const columnNames = columns.map(c => c.column_name)
        
        // Look for tables with customer-like columns
        const hasCustomerColumns = columnNames.some(col => 
          col.toLowerCase().includes('name') || 
          col.toLowerCase().includes('email') || 
          col.toLowerCase().includes('phone') ||
          col.toLowerCase().includes('customer')
        )

        if (hasCustomerColumns) {
          // Get row count
          const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`)
          const rowCount = parseInt(countResult[0].count)

          if (rowCount > 100) { // Look for tables with substantial data
            // Get sample data
            const sampleData = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 3`)
            
            customerResults.push({
              tableName,
              rowCount,
              columns: columnNames,
              sampleData
            })
          }
        }
      } catch (error) {
        console.log(`[FIND-REAL-CUSTOMERS] Error checking table ${table.table_name}:`, error.message)
      }
    }

    // Sort by row count to find the largest customer table
    customerResults.sort((a, b) => b.rowCount - a.rowCount)

    return NextResponse.json({
      success: true,
      message: "Customer search completed",
      results: {
        tablesFound: customerResults.length,
        potentialCustomerTables: customerResults
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FIND-REAL-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to find real customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
