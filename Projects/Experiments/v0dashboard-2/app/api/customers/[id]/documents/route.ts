import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const customerId = resolvedParams.id

    console.log(`[CUSTOMER-DOCUMENTS] Fetching documents for customer ${customerId}`)

    // Get customer documents with related data
    const documents = await sql`
      SELECT
        cd.id,
        cd.document_type,
        cd.document_date,
        cd.total_gross,
        cd.vehicle_registration,
        cd.status,
        cd.document_number,
        (SELECT COUNT(*) FROM document_line_items WHERE document_id = cd.id) as line_items_count,
        (SELECT COUNT(*) FROM document_receipts WHERE document_id = cd.id) as receipts_count,
        (SELECT COUNT(*) FROM document_extras WHERE document_id = cd.id) as has_job_description
      FROM customer_documents cd
      WHERE cd.customer_id = ${customerId}
      ORDER BY cd.document_date DESC NULLS LAST, cd.created_at DESC
    `

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      type: doc.document_type || 'Unknown',
      date: doc.document_date ? new Date(doc.document_date).toLocaleDateString() : 'No date',
      amount: parseFloat(doc.total_gross) || 0,
      vehicle: doc.vehicle_registration || 'No vehicle',
      status: doc.status || 'Unknown',
      documentNumber: doc.document_number,
      lineItemsCount: parseInt(doc.line_items_count),
      receiptsCount: parseInt(doc.receipts_count),
      hasJobDescription: parseInt(doc.has_job_description) > 0
    }))

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      count: formattedDocuments.length
    })

  } catch (error) {
    console.error("[CUSTOMER-DOCUMENTS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
