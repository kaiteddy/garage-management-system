import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DOCUMENTS-API] Fetching all documents...')

    const documents = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        customer_name,
        vehicle_registration,
        doc_date_issued,
        total_gross,
        total_net,
        total_tax,
        status,
        created_at
      FROM documents
      ORDER BY doc_date_issued DESC, doc_number DESC
      LIMIT 1000
    `

    console.log(`[DOCUMENTS-API] Found ${documents.length} documents`)

    return NextResponse.json({
      success: true,
      documents: documents,
      count: documents.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DOCUMENTS-API] Error fetching documents:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch documents",
      details: error instanceof Error ? error.message : 'Unknown error',
      documents: []
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[DOCUMENTS-API] Creating new document:', body)

    // This would be implemented when you need to create new documents
    return NextResponse.json({
      success: false,
      error: "Document creation not yet implemented",
      message: "Use the import functionality to add documents"
    }, { status: 501 })

  } catch (error) {
    console.error('[DOCUMENTS-API] Error creating document:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to create document"
    }, { status: 500 })
  }
}
