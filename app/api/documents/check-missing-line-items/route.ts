import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-MISSING-LINE-ITEMS] Analyzing documents without line items...")

    // Get all documents
    const totalDocuments = await sql`
      SELECT COUNT(*) as total_documents
      FROM documents
    `

    // Get documents that have line items
    const documentsWithLineItems = await sql`
      SELECT COUNT(DISTINCT d.id) as documents_with_line_items
      FROM documents d
      INNER JOIN document_line_items dli ON d.id::text = dli.document_id
    `

    // Get documents WITHOUT line items
    const documentsWithoutLineItems = await sql`
      SELECT 
        d.id,
        d.doc_number,
        d.doc_type,
        d.doc_date_issued,
        d.vehicle_registration,
        d.customer_name,
        d.total_gross,
        d.total_net,
        d.total_tax
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id::text = dli.document_id
      WHERE dli.document_id IS NULL
      ORDER BY d.id DESC
      LIMIT 50
    `

    // Get sample of documents WITH line items for comparison
    const sampleWithLineItems = await sql`
      SELECT 
        d.id,
        d.doc_number,
        d.doc_type,
        d.vehicle_registration,
        d.total_gross,
        COUNT(dli.id) as line_item_count
      FROM documents d
      INNER JOIN document_line_items dli ON d.id::text = dli.document_id
      GROUP BY d.id, d.doc_number, d.doc_type, d.vehicle_registration, d.total_gross
      ORDER BY d.id DESC
      LIMIT 10
    `

    // Get document type breakdown for missing line items
    const missingByType = await sql`
      SELECT 
        d.doc_type,
        COUNT(*) as missing_count,
        AVG(d.total_gross::numeric) as avg_amount
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id::text = dli.document_id
      WHERE dli.document_id IS NULL
      GROUP BY d.doc_type
      ORDER BY missing_count DESC
    `

    return NextResponse.json({
      success: true,
      analysis: {
        total_documents: totalDocuments[0].total_documents,
        documents_with_line_items: documentsWithLineItems[0].documents_with_line_items,
        documents_without_line_items: documentsWithoutLineItems.length,
        missing_percentage: ((documentsWithoutLineItems.length / parseInt(totalDocuments[0].total_documents)) * 100).toFixed(2)
      },
      missing_by_type: missingByType,
      sample_missing_documents: documentsWithoutLineItems.slice(0, 20),
      sample_with_line_items: sampleWithLineItems,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-MISSING-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check missing line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
