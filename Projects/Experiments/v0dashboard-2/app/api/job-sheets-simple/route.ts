import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[JOB-SHEETS-SIMPLE] Fetching job sheets with simple query...')

    // Simple query without complex JOINs
    const jobSheets = await sql`
      SELECT
        id,
        document_number,
        vehicle_registration,
        customer_id,
        created_at,
        status,
        total_gross,
        total_net
      FROM customer_documents
      WHERE document_type IN ('ES', 'JS', 'ESTIMATE', 'INVOICE')
        AND (status = '1' OR status = '2' OR status IS NULL)
        AND document_number ~ '^[0-9]+$'
      ORDER BY CAST(document_number AS INTEGER) DESC
      LIMIT 20
    `

    console.log(`[JOB-SHEETS-SIMPLE] Found ${jobSheets.length} job sheets`)

    // Simple transformation
    const transformedJobSheets = jobSheets.map((sheet: any) => ({
      id: sheet.id,
      jobNumber: sheet.document_number?.toString().padStart(5, '0') || 'N/A',
      date: new Date(sheet.created_at || Date.now()).toLocaleDateString('en-GB'),
      registration: sheet.vehicle_registration || 'NO-REG',
      makeModel: 'MAKE/MODEL UNKNOWN',
      customer: 'CUSTOMER DATA',
      labour: parseFloat(sheet.total_net || '0'),
      total: parseFloat(sheet.total_gross || '0'),
      status: sheet.status === '1' ? 'Open' : sheet.status === '2' ? 'Completed' : 'Open',
      motBooked: false
    }))

    return NextResponse.json({
      success: true,
      jobSheets: transformedJobSheets,
      total: transformedJobSheets.length,
      nextJobNumber: 91259
    })

  } catch (error) {
    console.error('[JOB-SHEETS-SIMPLE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch job sheets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
