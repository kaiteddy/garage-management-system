import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DEBUG-JOB-SHEET] Testing customer_documents query...')

    // Simple test query
    const result = await sql`
      SELECT id, document_number, document_type, customer_id, vehicle_registration
      FROM customer_documents
      WHERE id = 'D69674AF2C5FEB4382954FD98B327C2E'
      LIMIT 1
    `

    console.log('[DEBUG-JOB-SHEET] Query result:', result)

    return NextResponse.json({
      success: true,
      result: result,
      count: result.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DEBUG-JOB-SHEET] Error:', error)
    console.error('[DEBUG-JOB-SHEET] Error stack:', error instanceof Error ? error.stack : 'No stack')

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
