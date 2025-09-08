import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    console.log(`[FIND-SERVICE-RECORDS] 🔍 Finding service records for ${registration}`)

    const cleanReg = registration.toUpperCase().replace(/\s/g, '')

    // Search for documents with this vehicle registration
    const documents = await sql`
      SELECT
        id,
        doc_number,
        doc_date_issued,
        doc_type,
        customer_name,
        vehicle_registration,
        total_gross,
        total_net,
        total_tax,
        doc_status,
        created_at
      FROM documents
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
      OR vehicle_registration ILIKE ${`%${registration}%`}
      ORDER BY doc_date_issued DESC
      LIMIT 20
    `

    // Also search by partial registration match
    const partialMatches = await sql`
      SELECT
        id,
        doc_number,
        doc_date_issued,
        doc_type,
        customer_name,
        vehicle_registration,
        total_gross,
        total_net,
        total_tax,
        doc_status,
        created_at
      FROM documents
      WHERE vehicle_registration ILIKE ${`%FV10%`}
      OR vehicle_registration ILIKE ${`%SFK%`}
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `

    // Get line items for found documents
    const documentIds = documents.map(doc => doc.id)
    let lineItems = []
    if (documentIds.length > 0) {
      lineItems = await sql`
        SELECT
          document_id,
          description,
          quantity,
          unit_price,
          total_price,
          item_type
        FROM document_line_items
        WHERE document_id = ANY(${documentIds})
        ORDER BY document_id, id
      `
    }

    // Get document extras for found documents
    let documentExtras = []
    if (documentIds.length > 0) {
      documentExtras = await sql`
        SELECT
          document_id,
          labour_description,
          doc_notes
        FROM document_extras
        WHERE document_id = ANY(${documentIds})
      `
    }

    // Search for customer records that might be linked
    const customerSearch = await sql`
      SELECT
        id,
        first_name,
        last_name,
        phone,
        email
      FROM customers
      WHERE id IN (
        SELECT DISTINCT _id_customer
        FROM documents
        WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
      )
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      registration: registration,
      searchResults: {
        exactMatches: documents,
        partialMatches: partialMatches,
        lineItems: lineItems,
        documentExtras: documentExtras,
        relatedCustomers: customerSearch
      },
      summary: {
        exactDocuments: documents.length,
        partialDocuments: partialMatches.length,
        totalValue: documents.reduce((sum, doc) => sum + (parseFloat(doc.total_gross) || 0), 0),
        dateRange: documents.length > 0 ? {
          earliest: documents[documents.length - 1]?.doc_date_issued,
          latest: documents[0]?.doc_date_issued
        } : null
      }
    })

  } catch (error) {
    console.error("[FIND-SERVICE-RECORDS] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to find service records",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
