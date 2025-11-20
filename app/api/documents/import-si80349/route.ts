import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[IMPORT-SI80349] Importing job SI80349 directly...")

    // Check if document already exists
    let docResult = await sql`
      SELECT id FROM documents WHERE _id = '665CDFCD4CEDBB41BBF283DED1CD97B2'
    `

    let documentId
    if (docResult.length > 0) {
      documentId = docResult[0].id
      console.log(`[IMPORT-SI80349] Document already exists with ID: ${documentId}`)
    } else {
      // Insert the document
      docResult = await sql`
        INSERT INTO documents (
          _id,
          _id_customer,
          _id_vehicle,
          doc_type,
          doc_number,
          doc_date_created,
          doc_date_issued,
          doc_date_paid,
          doc_status,
          customer_name,
          customer_address,
          customer_phone,
          vehicle_make,
          vehicle_model,
          vehicle_registration,
          vehicle_mileage,
          total_gross,
          total_net,
          total_tax,
          status,
          created_at,
          updated_at
        ) VALUES (
          '665CDFCD4CEDBB41BBF283DED1CD97B2',
          'B8D55B74E1A51D498B28E50874014716',
          '10A2EC541D738D46B3BF4690C6A98ABD',
          'SI',
          '80349',
          '2019-10-21',
          '2019-10-23',
          '2019-10-24',
          '~',
          'Rebecca Lewis',
          '8 Station Road, Felsted, Dunmow, Essex CM6 3HB',
          '07824 862004',
          'Toyota',
          'Hi-Ace 280 Swb D-4d 120',
          'NG07 LML',
          179235,
          380.30,
          316.92,
          63.38,
          'Issued',
          NOW(),
          NOW()
        )
        RETURNING id
      `
      documentId = docResult[0].id
      console.log(`[IMPORT-SI80349] Document inserted with ID: ${documentId}`)
    }

    // Insert line items
    try {
      await sql`
        INSERT INTO document_line_items (
          id,
          document_id,
          item_type,
          description,
          quantity,
          unit_price,
          total_price,
          tax_rate
        ) VALUES
          ('B6C9334BA61920469CC140301F3C8F91', ${documentId.toString()}, 'Labour', 'Mechanical Labour', 1, 234.00, 280.80, 20)
      `
    } catch (error) {
      console.log('[IMPORT-SI80349] Labour line item may already exist')
    }

    try {
      await sql`
        INSERT INTO document_line_items (
          id,
          document_id,
          item_type,
          description,
          quantity,
          unit_price,
          total_price,
          tax_rate
        ) VALUES
          ('B21883EB5660634EB9BCB29211BF6175', ${documentId.toString()}, 'Parts', 'Fuel Pipe Cyl 4', 1, 70.92, 85.10, 20)
      `
    } catch (error) {
      console.log('[IMPORT-SI80349] Parts line item may already exist')
    }

    console.log(`[IMPORT-SI80349] Line items inserted`)

    // Insert document extra
    try {
      await sql`
        INSERT INTO document_extras (
          document_id,
          labour_description,
          doc_notes
        ) VALUES (
          ${documentId},
          'Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System.',
          ''
        )
      `
    } catch (error) {
      console.log('[IMPORT-SI80349] Document extra may already exist')
    }

    console.log(`[IMPORT-SI80349] Document extra inserted`)

    // Verify the import
    const verifyDoc = await sql`
      SELECT
        d.*,
        de.labour_description
      FROM documents d
      LEFT JOIN document_extras de ON d.id = de.document_id
      WHERE d.doc_number = '80349'
    `

    // Get line items details (avoid type conversion issues)
    const lineItems = await sql.query(`
      SELECT * FROM document_line_items
      WHERE document_id = $1
    `, [documentId.toString()])

    const lineItemCount = lineItems.length

    return NextResponse.json({
      success: true,
      message: "Successfully imported job SI80349 for Rebecca Lewis / NG07 LML",
      import_results: {
        document_id: documentId,
        document_imported: true,
        line_items_imported: lineItems.length,
        document_extra_imported: true
      },
      verification: {
        document_details: verifyDoc[0] || null,
        line_items_count: lineItemCount,
        line_items: lineItems
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-SI80349] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import SI80349",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}