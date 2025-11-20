import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { searchTerm } = await request.json()
    
    console.log(`[SEARCH-DOCUMENTS] Searching for: ${searchTerm}`)

    // Search for documents by various criteria
    const documents = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross,
        doc_status,
        _id_customer,
        _id_vehicle
      FROM documents 
      WHERE doc_number ILIKE ${`%${searchTerm}%`}
      OR vehicle_registration ILIKE ${`%${searchTerm}%`}
      OR customer_name ILIKE ${`%${searchTerm}%`}
      ORDER BY doc_date_issued DESC
      LIMIT 20
    `

    // Also search for any documents that might be related to NG07
    const ng07Related = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross,
        doc_status
      FROM documents 
      WHERE vehicle_registration ILIKE '%NG07%'
      OR vehicle_registration ILIKE '%LML%'
      OR doc_number ILIKE '%SI%'
      ORDER BY doc_date_issued DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      searchTerm,
      results: {
        direct_matches: documents,
        ng07_related: ng07Related,
        total_found: documents.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SEARCH-DOCUMENTS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to search documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
