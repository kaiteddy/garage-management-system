import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Test the exact query structure used in the API
    const testQuery = await sql`
      SELECT 
        v.registration,
        d.doc_date_issued,
        d.total_gross,
        d.customer_name
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT document_date as doc_date_issued, total_gross, document_type as customer_name
        FROM customer_documents
        WHERE vehicle_registration = v.registration
        AND document_type IN ('SI', 'ES', 'JS')
        ORDER BY document_date DESC
        LIMIT 1
      ) d ON true
      WHERE v.registration IN ('LJ59GWX', 'LT08AWG', 'EJ57URG')
    `

    // Also check the raw customer_documents data for these vehicles
    const rawDocs = await sql`
      SELECT vehicle_registration, document_date, total_gross, document_type
      FROM customer_documents
      WHERE vehicle_registration IN ('LJ59GWX', 'LT08AWG', 'EJ57URG')
      ORDER BY vehicle_registration, document_date DESC
    `

    return NextResponse.json({
      success: true,
      testQuery,
      rawDocs
    })

  } catch (error) {
    console.error('Error testing document dates:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test document dates",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
