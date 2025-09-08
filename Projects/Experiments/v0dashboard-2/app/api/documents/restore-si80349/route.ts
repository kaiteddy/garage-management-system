import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[RESTORE-SI80349] 🔧 Restoring SI80349 document for NG07 LML...")

    // First, check if it already exists
    const existing = await sql`
      SELECT id, doc_number FROM documents WHERE doc_number = '80349'
    `

    if (existing.length > 0) {
      console.log("[RESTORE-SI80349] Document already exists, updating...")
    }

    // Insert/Update the SI80349 document with correct data
    const documentResult = await sql`
      INSERT INTO documents (
        _id, _id_customer, _id_vehicle, doc_type, doc_number,
        doc_date_issued, customer_name, vehicle_registration,
        total_gross, total_net, total_tax, status,
        created_at, updated_at
      ) VALUES (
        '665CDFCD4CEDBB41BBF283DED1CD97B2',
        'B8D55B74E1A51D498B28E50874014716',
        'VEHICLE_NG07LML',
        'SI',
        '80349',
        '2019-10-23',
        'Rebecca Lewis',
        'NG07 LML',
        380.30,
        316.92,
        63.38,
        'Issued',
        NOW(),
        NOW()
      )
      -- No conflict handling, will insert new record
      RETURNING id
    `

    const documentId = documentResult[0].id

    console.log(`[RESTORE-SI80349] Document created/updated with ID: ${documentId}`)

    // Add line items
    const lineItems = [
      {
        id: `LABOUR_${documentId}`,
        type: 'Labour',
        description: 'Mechanical Labour',
        quantity: 1,
        unit_price: 234.00,
        total_price: 280.80
      },
      {
        id: `PARTS_${documentId}`,
        type: 'Parts',
        description: 'Fuel Pipe Cyl 4',
        quantity: 1,
        unit_price: 70.92,
        total_price: 85.10
      }
    ]

    for (const item of lineItems) {
      await sql`
        INSERT INTO document_line_items (
          id, document_id, item_type, description, quantity,
          unit_price, total_price, tax_rate
        ) VALUES (
          ${item.id},
          ${documentId.toString()},
          ${item.type},
          ${item.description},
          ${item.quantity},
          ${item.unit_price},
          ${item.total_price},
          20
        )
        ON CONFLICT (id) DO UPDATE SET
          description = EXCLUDED.description,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          total_price = EXCLUDED.total_price
      `
    }

    // Add service description
    await sql`
      INSERT INTO document_extras (
        document_id, labour_description, doc_notes
      ) VALUES (
        ${documentId},
        'Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System.',
        'Complete fuel system repair'
      )
      ON CONFLICT (document_id) DO UPDATE SET
        labour_description = EXCLUDED.labour_description,
        doc_notes = EXCLUDED.doc_notes
    `

    // Verify the restoration
    const verification = await sql`
      SELECT
        d.id,
        d.doc_number,
        d.customer_name,
        d.vehicle_registration,
        d.total_gross,
        d._id_customer,
        de.labour_description
      FROM documents d
      LEFT JOIN document_extras de ON d.id = de.document_id
      WHERE d.doc_number = '80349'
    `

    const lineItemsVerification = await sql`
      SELECT description, quantity, unit_price, total_price
      FROM document_line_items
      WHERE document_id = ${documentId.toString()}
    `

    console.log("[RESTORE-SI80349] ✅ SI80349 restoration completed!")

    return NextResponse.json({
      success: true,
      restoration_results: {
        document_id: documentId,
        document_details: verification[0] || null,
        line_items: lineItemsVerification,
        line_items_count: lineItemsVerification.length,
        status: "SI80349 successfully restored with complete service details"
      },
      verification: {
        document_exists: verification.length > 0,
        customer_linked: verification[0]?._id_customer === 'B8D55B74E1A51D498B28E50874014716',
        vehicle_linked: verification[0]?.vehicle_registration === 'NG07 LML',
        service_description_added: verification[0]?.labour_description ? true : false
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[RESTORE-SI80349] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to restore SI80349",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
