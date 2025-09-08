import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-LINE-ITEMS] Testing line items query...")

    // Test 1: Check table structures first
    const documentsStructure = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'id'
    `

    const lineItemsStructure = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'document_line_items' AND column_name = 'document_id'
    `

    // Test 2: Get sample data from both tables
    const sampleDocuments = await sql`
      SELECT id, doc_number, vehicle_registration
      FROM documents
      WHERE vehicle_registration = 'LN64 XFG'
      LIMIT 5
    `

    const sampleLineItems = await sql`
      SELECT document_id, description
      FROM document_line_items
      LIMIT 5
    `

    // Test 3: Check for line items for LN64 XFG document IDs specifically
    const ln64LineItems = await sql`
      SELECT document_id, description, quantity, unit_price, total_price
      FROM document_line_items
      WHERE document_id IN ('52214', '55282', '51608', '55041')
    `

    // Test 4: Check document extras for LN64 XFG
    const ln64Extras = await sql`
      SELECT document_id, labour_description, doc_notes
      FROM document_extras
      WHERE document_id IN ('52214', '55282', '51608', '55041')
    `

    // Test 5: Check what document IDs actually have line items
    const documentIdsWithLineItems = await sql`
      SELECT document_id, COUNT(*) as line_item_count
      FROM document_line_items
      GROUP BY document_id
      ORDER BY document_id::integer DESC
      LIMIT 10
    `

    // Test 4: Check document_line_items table structure
    const test4 = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'document_line_items'
      ORDER BY ordinal_position
    `

    // Test 5: Count total line items
    const test5 = await sql`
      SELECT COUNT(*) as total_line_items
      FROM document_line_items
    `

    return NextResponse.json({
      success: true,
      tests: {
        documents_structure: documentsStructure,
        line_items_structure: lineItemsStructure,
        sample_documents: sampleDocuments,
        sample_line_items: sampleLineItems,
        ln64_line_items: ln64LineItems,
        ln64_extras: ln64Extras,
        document_ids_with_line_items: documentIdsWithLineItems,
        test4_table_structure: test4,
        test5_total_count: test5
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
