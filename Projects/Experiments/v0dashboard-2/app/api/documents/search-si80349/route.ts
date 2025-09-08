import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[SEARCH-SI80349] 🔍 Searching for document SI80349...")

    // Search for SI80349 in various ways
    const searches = await Promise.all([
      // By doc number
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, _id, _id_customer
        FROM documents 
        WHERE doc_number = '80349'
      `,
      // By customer name Rebecca Lewis
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, _id, _id_customer
        FROM documents 
        WHERE customer_name LIKE '%Rebecca%' AND customer_name LIKE '%Lewis%'
      `,
      // By vehicle registration NG07 LML
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, _id, _id_customer
        FROM documents 
        WHERE vehicle_registration LIKE '%NG07%'
      `,
      // By the specific _id we used
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, _id, _id_customer
        FROM documents 
        WHERE _id = '665CDFCD4CEDBB41BBF283DED1CD97B2'
      `,
      // By customer ID
      sql`
        SELECT id, doc_number, customer_name, vehicle_registration, total_gross, _id, _id_customer
        FROM documents 
        WHERE _id_customer = 'B8D55B74E1A51D498B28E50874014716'
      `
    ])

    // Check if Rebecca Lewis customer exists
    const rebeccaCustomer = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers 
      WHERE first_name LIKE '%Rebecca%' AND last_name LIKE '%Lewis%'
    `

    // Check if NG07 LML vehicle exists
    const ng07Vehicle = await sql`
      SELECT registration, make, model, owner_id
      FROM vehicles 
      WHERE registration = 'NG07 LML'
    `

    // Check recent document imports
    const recentDocs = await sql`
      SELECT id, doc_number, customer_name, vehicle_registration, total_gross, created_at
      FROM documents 
      WHERE created_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      search_results: {
        by_doc_number: searches[0],
        by_customer_name: searches[1],
        by_vehicle_registration: searches[2],
        by_document_id: searches[3],
        by_customer_id: searches[4]
      },
      related_data: {
        rebecca_lewis_customers: rebeccaCustomer,
        ng07_lml_vehicle: ng07Vehicle,
        recent_document_imports: recentDocs
      },
      analysis: {
        si80349_found: searches[0].length > 0,
        rebecca_lewis_found: searches[1].length > 0,
        ng07_lml_docs_found: searches[2].length > 0,
        customer_exists: rebeccaCustomer.length > 0,
        vehicle_exists: ng07Vehicle.length > 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SEARCH-SI80349] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to search for SI80349",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
