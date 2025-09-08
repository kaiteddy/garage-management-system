import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get("registration") || "NG07 LML"
    const cleanReg = registration.toUpperCase().replace(/\s/g, '');

    console.log(`[DEBUG-SERVICE] Looking for service history for: ${registration} (clean: ${cleanReg})`)

    // Test the exact query from the vehicle API
    const serviceHistory = await sql.query(`
      SELECT
        d.id,
        d.doc_number as document_number,
        d.doc_date_issued as date,
        d.doc_type as type,
        d.total_gross as amount,
        d.total_net,
        d.total_tax,
        d.status,
        d.vehicle_registration,
        de.labour_description,
        de.doc_notes
      FROM documents d
      LEFT JOIN document_extras de ON d.id::text = de.document_id::text
      WHERE d.vehicle_registration = $1
      OR d.vehicle_registration = $2
      OR REPLACE(d.vehicle_registration, ' ', '') = $3
      ORDER BY d.doc_date_issued DESC
      LIMIT 50
    `, [registration, cleanReg, cleanReg]);

    // Also test individual conditions
    const test1 = await sql`
      SELECT id, doc_number, vehicle_registration FROM documents
      WHERE vehicle_registration = ${registration}
    `

    const test2 = await sql`
      SELECT id, doc_number, vehicle_registration FROM documents
      WHERE vehicle_registration = ${cleanReg}
    `

    const test3 = await sql`
      SELECT id, doc_number, vehicle_registration FROM documents
      WHERE REPLACE(vehicle_registration, ' ', '') = ${cleanReg}
    `

    return NextResponse.json({
      success: true,
      registration,
      cleanReg,
      results: {
        main_query: serviceHistory,
        test_exact_match: test1,
        test_clean_match: test2,
        test_replace_match: test3
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-SERVICE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug service history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
