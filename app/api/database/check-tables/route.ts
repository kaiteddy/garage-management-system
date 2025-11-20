import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-TABLES] Checking database table status...")

    // Check what tables exist
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    // Check record counts for each table
    const tableCounts = {}
    
    for (const table of tables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table.table_name)}`
        tableCounts[table.table_name] = parseInt(count[0].count)
      } catch (error) {
        tableCounts[table.table_name] = 'Error'
      }
    }

    // Check if document tables exist and their status
    const documentTableStatus = {}
    const documentTables = ['customer_documents', 'document_line_items', 'document_extras', 'document_receipts']
    
    for (const tableName of documentTables) {
      try {
        const exists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          )
        `
        
        if (exists[0].exists) {
          const count = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`
          const sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`
          
          documentTableStatus[tableName] = {
            exists: true,
            recordCount: parseInt(count[0].count),
            sampleData: sampleData
          }
        } else {
          documentTableStatus[tableName] = {
            exists: false,
            recordCount: 0
          }
        }
      } catch (error) {
        documentTableStatus[tableName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Check customer activity data
    const customerActivityCheck = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as with_last_contact,
        MIN(last_contact_date) as earliest_contact,
        MAX(last_contact_date) as latest_contact
      FROM customers
    `

    return NextResponse.json({
      success: true,
      databaseStatus: {
        totalTables: tables.length,
        tables: tables.map(t => ({
          name: t.table_name,
          columns: parseInt(t.column_count),
          records: tableCounts[t.table_name]
        })),
        documentTableStatus,
        customerActivity: customerActivityCheck[0]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-TABLES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check database tables",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
