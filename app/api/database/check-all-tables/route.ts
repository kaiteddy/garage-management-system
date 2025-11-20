import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-ALL-TABLES] Checking all document-related tables...")

    // Check if customer_activity table exists and has data
    let customerActivityStatus = {}
    try {
      const activityCount = await sql`SELECT COUNT(*) as count FROM customer_activity`
      const activitySample = await sql`
        SELECT customer_id, total_documents, total_spent, activity_level, last_document_date 
        FROM customer_activity 
        ORDER BY total_spent DESC 
        LIMIT 5
      `
      customerActivityStatus = {
        exists: true,
        recordCount: parseInt(activityCount[0].count),
        sampleData: activitySample
      }
    } catch {
      customerActivityStatus = { exists: false, recordCount: 0 }
    }

    // Check main document tables
    let documentTablesStatus = {}
    const documentTables = ['customer_documents', 'document_line_items', 'document_extras', 'document_receipts']
    
    for (const tableName of documentTables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`
        documentTablesStatus[tableName] = parseInt(count[0].count)
      } catch {
        documentTablesStatus[tableName] = 'Table does not exist'
      }
    }

    // Check what tables actually exist in the database
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    // Get customer data with activity information
    const customerSummary = await sql`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END) as with_last_contact,
        MIN(last_contact_date) as earliest_contact,
        MAX(last_contact_date) as latest_contact
      FROM customers
    `

    return NextResponse.json({
      success: true,
      documentImportStatus: {
        customerActivity: customerActivityStatus,
        documentTables: documentTablesStatus,
        allTablesInDatabase: allTables.map(t => t.table_name),
        customerSummary: customerSummary[0]
      },
      importCompletionStatus: {
        essentialDocumentData: customerActivityStatus.exists && customerActivityStatus.recordCount > 0,
        fullDocumentTables: Object.values(documentTablesStatus).some(count => typeof count === 'number' && count > 0),
        customerActivityTracking: customerSummary[0].with_last_contact > 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-ALL-TABLES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check all tables",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
