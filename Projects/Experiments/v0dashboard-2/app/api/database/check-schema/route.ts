import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-SCHEMA] Checking database schema...")

    // Check vehicles table structure
    const vehiclesColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    // Check documents table structure
    const documentsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `

    // Check if MOT history table exists
    const motHistoryExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'mot_history'
      )
    `

    // Check for NG07 LML specifically
    const ng07Vehicle = await sql`
      SELECT * FROM vehicles
      WHERE registration ILIKE '%NG07%'
      LIMIT 1
    `

    // Check documents for NG07 LML
    const ng07Documents = await sql`
      SELECT
        id,
        doc_number,
        doc_type,
        vehicle_registration,
        customer_name,
        doc_date_issued,
        total_gross
      FROM documents
      WHERE vehicle_registration ILIKE '%NG07%'
      OR doc_number ILIKE '%SI80349%'
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `

    // Check document line items for any NG07 documents
    const ng07LineItems = await sql`
      SELECT
        dli.*,
        d.doc_number,
        d.vehicle_registration
      FROM document_line_items dli
      JOIN documents d ON dli.document_id::text = d.id::text
      WHERE d.vehicle_registration ILIKE '%NG07%'
      OR d.doc_number ILIKE '%SI80349%'
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      schema: {
        vehicles_table: {
          exists: vehiclesColumns.length > 0,
          columns: vehiclesColumns
        },
        documents_table: {
          exists: documentsColumns.length > 0,
          columns: documentsColumns
        },
        mot_history_table: {
          exists: motHistoryExists[0].exists
        }
      },
      ng07_data: {
        vehicle_record: ng07Vehicle[0] || null,
        documents: ng07Documents,
        line_items: ng07LineItems
      },
      analysis: {
        vehicle_found: ng07Vehicle.length > 0,
        documents_found: ng07Documents.length,
        line_items_found: ng07LineItems.length,
        missing_data: {
          service_history: ng07Documents.length === 0,
          line_items: ng07LineItems.length === 0,
          mot_history: !motHistoryExists[0].exists
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-SCHEMA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check schema",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
