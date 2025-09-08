import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DEBUG-JOB-SHEET-DATA] Checking actual job sheet data...')

    // Check what's actually in the customer_documents table for job sheets
    const result = await sql`
      SELECT 
        id, 
        document_number, 
        document_type, 
        vehicle_registration,
        customer_id,
        created_at
      FROM customer_documents
      WHERE document_type = 'JS'
      ORDER BY created_at DESC
      LIMIT 5
    `

    console.log('[DEBUG-JOB-SHEET-DATA] Job sheet data:', result)

    // Also check if there are any job sheets with vehicle registration data
    const withReg = await sql`
      SELECT 
        id, 
        document_number, 
        vehicle_registration
      FROM customer_documents
      WHERE document_type = 'JS' 
        AND vehicle_registration IS NOT NULL 
        AND vehicle_registration != ''
      LIMIT 5
    `

    console.log('[DEBUG-JOB-SHEET-DATA] Job sheets with registration:', withReg)

    // Check what vehicle data exists
    const vehicles = await sql`
      SELECT registration, make, model
      FROM vehicles
      LIMIT 5
    `

    console.log('[DEBUG-JOB-SHEET-DATA] Vehicle data:', vehicles)

    return NextResponse.json({
      success: true,
      jobSheets: result,
      jobSheetsWithReg: withReg,
      vehicles: vehicles,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DEBUG-JOB-SHEET-DATA] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
