import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Test the service history query on vehicles we KNOW have documents
    const testVehicles = await sql`
      SELECT 
        v.registration,
        c.first_name,
        c.last_name,
        d.doc_date_issued,
        d.total_gross,
        d.customer_name
      FROM vehicles v
      LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
      LEFT JOIN LATERAL (
        SELECT document_date as doc_date_issued, total_gross, document_type as customer_name
        FROM customer_documents
        WHERE vehicle_registration = v.registration
        AND document_type IN ('SI', 'ES', 'JS')
        ORDER BY
          CASE WHEN document_date IS NULL THEN 1 ELSE 0 END,
          document_date DESC
        LIMIT 1
      ) d ON true
      WHERE v.registration IN ('RE66 GMV', 'PF03NVC', 'LL61VWK', 'VU53DBZ', 'OV65 HWH')
    `

    // Also test a few vehicles from the critical MOT list to see if the fix is working
    const criticalTestVehicles = await sql`
      SELECT 
        v.registration,
        c.first_name,
        c.last_name,
        d.doc_date_issued,
        d.total_gross,
        d.customer_name
      FROM vehicles v
      LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
      LEFT JOIN LATERAL (
        SELECT document_date as doc_date_issued, total_gross, document_type as customer_name
        FROM customer_documents
        WHERE vehicle_registration = v.registration
        AND document_type IN ('SI', 'ES', 'JS')
        ORDER BY
          CASE WHEN document_date IS NULL THEN 1 ELSE 0 END,
          document_date DESC
        LIMIT 1
      ) d ON true
      WHERE v.registration IN ('LJ59GWX', 'LT08AWG', 'EJ57URG')
    `

    return NextResponse.json({
      success: true,
      testVehicles,
      criticalTestVehicles
    })

  } catch (error) {
    console.error('Error testing service history:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test service history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
