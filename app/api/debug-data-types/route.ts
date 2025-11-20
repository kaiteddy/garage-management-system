import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DEBUG-DATA-TYPES] Checking exact data types...')

    // Check document_extras table structure
    const documentExtrasColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'document_extras'
      ORDER BY ordinal_position
    `

    // Check sample data from document_extras
    const documentExtrasSample = await sql`
      SELECT * FROM document_extras LIMIT 3
    `

    // Check documents table id type
    const documentsIdSample = await sql`
      SELECT id, pg_typeof(id) as id_type FROM documents LIMIT 3
    `

    // Simple connection test without JOIN
    const simpleConnectionTest = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM document_line_items) as line_items,
        (SELECT COUNT(*) FROM document_extras) as document_extras
    `

    // Test basic customer-vehicle connection
    const basicCustomerVehicle = await sql`
      SELECT c.first_name, c.last_name, v.registration
      FROM customers c, vehicles v 
      WHERE c.id = v.owner_id 
      LIMIT 3
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug_info: {
        document_extras_structure: documentExtrasColumns,
        document_extras_sample: documentExtrasSample,
        documents_id_type: documentsIdSample,
        basic_counts: simpleConnectionTest[0],
        basic_customer_vehicle_test: basicCustomerVehicle
      },
      analysis: {
        tables_exist: documentExtrasColumns.length > 0,
        data_exists: documentExtrasSample.length > 0,
        basic_connections_work: basicCustomerVehicle.length > 0
      }
    })

  } catch (error) {
    console.error('[DEBUG-DATA-TYPES] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to debug data types"
      },
      { status: 500 }
    )
  }
}
