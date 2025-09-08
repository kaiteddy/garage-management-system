import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DEBUG-REGISTRATION] Checking vehicle registrations...')

    // Check a few job sheet records to see their vehicle_registration values
    const result = await sql`
      SELECT 
        id, 
        document_number, 
        document_type, 
        vehicle_registration,
        LENGTH(vehicle_registration) as reg_length,
        customer_id
      FROM customer_documents
      WHERE document_type = 'JS'
      ORDER BY created_at DESC
      LIMIT 10
    `

    console.log('[DEBUG-REGISTRATION] Query result:', result)

    return NextResponse.json({
      success: true,
      result: result,
      count: result.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DEBUG-REGISTRATION] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
