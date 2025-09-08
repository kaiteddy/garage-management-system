import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Check a few sample vehicles and their document relationships
    const testVehicles = await sql`
      SELECT 
        v.registration,
        COUNT(d.id) as document_count,
        MAX(d.doc_date_issued) as latest_document_date,
        MAX(d.total_gross) as latest_amount,
        MAX(d.customer_name) as latest_customer_name
      FROM vehicles v
      LEFT JOIN documents d ON v.registration = d.vehicle_registration
      WHERE v.registration IN ('LJ59GWX', 'LT08AWG', 'EJ57URG')
      GROUP BY v.registration
    `

    // Also check what document registrations look like
    const sampleDocuments = await sql`
      SELECT DISTINCT vehicle_registration
      FROM documents 
      WHERE vehicle_registration IS NOT NULL
      AND vehicle_registration != ''
      LIMIT 10
    `

    // Check if there are any documents at all
    const documentCount = await sql`
      SELECT COUNT(*) as total_documents
      FROM documents
      WHERE vehicle_registration IS NOT NULL
      AND vehicle_registration != ''
    `

    return NextResponse.json({
      success: true,
      testVehicles,
      sampleDocuments,
      documentCount: documentCount[0]
    })

  } catch (error) {
    console.error('Error testing document relationships:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test document relationships",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
