import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    const cleanReg = registration.toUpperCase().replace(/\s/g, '')
    
    console.log(`[DEBUG-SERVICE] 🔍 Debugging service history for: ${registration}`)

    // Search for documents with various registration formats
    const documentSearches = await Promise.all([
      // Exact match
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
        FROM documents 
        WHERE vehicle_registration = ${registration}
        LIMIT 10
      `,
      // Clean match (no spaces)
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
        FROM documents 
        WHERE REPLACE(vehicle_registration, ' ', '') = ${cleanReg}
        LIMIT 10
      `,
      // Case insensitive match
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
        FROM documents 
        WHERE UPPER(vehicle_registration) = ${registration.toUpperCase()}
        LIMIT 10
      `,
      // Partial match
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
        FROM documents 
        WHERE vehicle_registration LIKE ${'%' + registration + '%'}
        LIMIT 10
      `
    ])

    // Search by customer (Rebecca Lewis)
    const customerDocuments = await sql`
      SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued
      FROM documents 
      WHERE customer_name LIKE '%Rebecca%' OR customer_name LIKE '%Lewis%'
      LIMIT 10
    `

    // Search by customer ID
    const customerIdDocuments = await sql`
      SELECT id, doc_number, customer_name, vehicle_registration, total_gross, doc_date_issued, _id_customer
      FROM documents 
      WHERE _id_customer = 'B8D55B74E1A51D498B28E50874014716'
      LIMIT 10
    `

    // Check if the vehicle API query is working correctly
    const vehicleApiQuery = await sql`
      SELECT
        d.id,
        d.doc_number as document_number,
        d.doc_date_issued as date,
        d.doc_type as type,
        d.total_gross as amount,
        d.total_net,
        d.total_tax,
        d.status,
        d.vehicle_registration,
        de.labour_description,
        de.doc_notes
      FROM documents d
      LEFT JOIN document_extras de ON d.id::text = de.document_id::text
      WHERE d.vehicle_registration = ${registration}
      OR d.vehicle_registration = ${cleanReg}
      OR REPLACE(d.vehicle_registration, ' ', '') = ${cleanReg}
      ORDER BY d.doc_date_issued DESC
      LIMIT 10
    `

    // Get line items for any found documents
    const foundDocIds = vehicleApiQuery.map(doc => doc.id.toString())
    let lineItems = []
    
    if (foundDocIds.length > 0) {
      lineItems = await sql`
        SELECT document_id, description, quantity, unit_price, total_price, item_type
        FROM document_line_items
        WHERE document_id = ANY(${foundDocIds})
        LIMIT 20
      `
    }

    return NextResponse.json({
      success: true,
      debug_results: {
        registration_searched: registration,
        clean_registration: cleanReg,
        search_results: {
          exact_match: documentSearches[0],
          clean_match: documentSearches[1],
          case_insensitive: documentSearches[2],
          partial_match: documentSearches[3]
        },
        customer_searches: {
          by_name: customerDocuments,
          by_customer_id: customerIdDocuments
        },
        vehicle_api_query_result: vehicleApiQuery,
        line_items_found: lineItems,
        summary: {
          total_documents_found: vehicleApiQuery.length,
          total_line_items_found: lineItems.length,
          customer_id_matches: customerIdDocuments.length,
          name_matches: customerDocuments.length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-SERVICE] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to debug service history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
