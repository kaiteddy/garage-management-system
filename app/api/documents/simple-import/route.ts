import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[SIMPLE-IMPORT] Starting simple import of SI80349...")

    // Step 1: Check if document exists
    const existingDoc = await sql`
      SELECT id, doc_number FROM documents WHERE doc_number = '80349'
    `

    let documentId
    let documentExists = existingDoc.length > 0

    if (documentExists) {
      documentId = existingDoc[0].id
      console.log(`[SIMPLE-IMPORT] Document SI80349 already exists with ID: ${documentId}`)
    } else {
      console.log(`[SIMPLE-IMPORT] Document SI80349 not found, creating new one...`)
      
      // Insert document without conflict handling
      try {
        const newDoc = await sql`
          INSERT INTO documents (
            _id, _id_customer, doc_type, doc_number, doc_date_issued,
            customer_name, vehicle_registration, vehicle_make, vehicle_model,
            total_gross, total_net, total_tax, status
          ) VALUES (
            '665CDFCD4CEDBB41BBF283DED1CD97B2',
            'B8D55B74E1A51D498B28E50874014716',
            'SI', '80349', '2019-10-23',
            'Rebecca Lewis', 'NG07 LML', 'Toyota', 'Hi-Ace 280 Swb D-4d 120',
            380.30, 316.92, 63.38, 'Issued'
          ) RETURNING id
        `
        documentId = newDoc[0].id
        console.log(`[SIMPLE-IMPORT] Created document with ID: ${documentId}`)
      } catch (docError) {
        console.log(`[SIMPLE-IMPORT] Document creation failed, trying to find existing:`, docError)
        const retryDoc = await sql`SELECT id FROM documents WHERE doc_number = '80349'`
        if (retryDoc.length > 0) {
          documentId = retryDoc[0].id
          documentExists = true
        } else {
          throw docError
        }
      }
    }

    // Step 2: Add line items
    let lineItemsAdded = 0
    
    // Labour item
    try {
      await sql.query(`
        INSERT INTO document_line_items (id, document_id, item_type, description, quantity, unit_price, total_price, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'LABOUR_' + documentId,
        documentId.toString(),
        'Labour',
        'Mechanical Labour',
        1,
        234.00,
        280.80,
        20
      ])
      lineItemsAdded++
      console.log(`[SIMPLE-IMPORT] Added labour line item`)
    } catch (error) {
      console.log(`[SIMPLE-IMPORT] Labour line item may already exist`)
    }

    // Parts item
    try {
      await sql.query(`
        INSERT INTO document_line_items (id, document_id, item_type, description, quantity, unit_price, total_price, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'PARTS_' + documentId,
        documentId.toString(),
        'Parts',
        'Fuel Pipe Cyl 4',
        1,
        70.92,
        85.10,
        20
      ])
      lineItemsAdded++
      console.log(`[SIMPLE-IMPORT] Added parts line item`)
    } catch (error) {
      console.log(`[SIMPLE-IMPORT] Parts line item may already exist`)
    }

    // Step 3: Add service description
    let serviceDescAdded = false
    try {
      await sql`
        INSERT INTO document_extras (document_id, labour_description)
        VALUES (${documentId}, 'Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System.')
      `
      serviceDescAdded = true
      console.log(`[SIMPLE-IMPORT] Added service description`)
    } catch (error) {
      console.log(`[SIMPLE-IMPORT] Service description may already exist`)
    }

    // Step 4: Verify what we have
    const finalDoc = await sql`
      SELECT doc_number, customer_name, vehicle_registration, total_gross
      FROM documents WHERE id = ${documentId}
    `

    const finalLineItems = await sql.query(`
      SELECT item_type, description, total_price 
      FROM document_line_items WHERE document_id = $1
    `, [documentId.toString()])

    return NextResponse.json({
      success: true,
      message: "SI80349 import completed",
      results: {
        document_id: documentId,
        document_existed: documentExists,
        line_items_added: lineItemsAdded,
        service_description_added: serviceDescAdded,
        final_verification: {
          document: finalDoc[0] || null,
          line_items: finalLineItems,
          line_items_count: finalLineItems.length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[SIMPLE-IMPORT] Error:", error)
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
