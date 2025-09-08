import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[CHECK-DOCUMENT-EXTRAS] Checking document extras data...')

    // Check document extras structure and sample data
    const documentExtras = await sql`
      SELECT 
        id,
        document_id,
        labour_description,
        doc_notes,
        created_at
      FROM document_extras
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Check if we have any documents table data
    const documentsCount = await sql`
      SELECT COUNT(*) as count FROM documents
    `

    // Check document_line_items
    const lineItemsCount = await sql`
      SELECT COUNT(*) as count FROM document_line_items
    `

    // Check if document_extras have matching documents
    const extrasWithDocuments = await sql`
      SELECT 
        de.id,
        de.document_id,
        de.labour_description,
        d.doc_number,
        d.doc_type,
        d.customer_name
      FROM document_extras de
      LEFT JOIN documents d ON de.document_id = d._id
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        document_extras: documentExtras.length,
        documents: parseInt(documentsCount[0].count),
        line_items: parseInt(lineItemsCount[0].count)
      },
      sample_data: {
        document_extras: documentExtras,
        extras_with_documents: extrasWithDocuments
      },
      analysis: {
        extras_imported: documentExtras.length > 0,
        documents_imported: parseInt(documentsCount[0].count) > 0,
        line_items_imported: parseInt(lineItemsCount[0].count) > 0
      }
    })

  } catch (error) {
    console.error('[CHECK-DOCUMENT-EXTRAS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: "Failed to check document extras"
    }, { status: 500 })
  }
}
