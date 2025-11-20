import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import csv from 'csv-parser'

export async function POST() {
  try {
    console.log("[IMPORT-MISSING] Starting import of missing documents...")

    const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"
    const lineItemsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv"
    const documentExtrasPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Document_Extras.csv"

    let importedDocs = 0
    let importedLineItems = 0
    let importedExtras = 0

    // First, import the specific job SI80349 and related documents
    const targetDocuments = [
      {
        id: "665CDFCD4CEDBB41BBF283DED1CD97B2",
        customer_id: "B8D55B74E1A51D498B28E50874014716",
        vehicle_id: "10A2EC541D738D46B3BF4690C6A98ABD",
        doc_type: "SI",
        doc_number: "80349",
        doc_date_created: "2019-10-21",
        doc_date_issued: "2019-10-23",
        doc_date_paid: "2019-10-24",
        doc_status: "~",
        customer_name: "Rebecca Lewis",
        customer_address: "8 Station Road, Felsted, Dunmow, Essex CM6 3HB",
        customer_phone: "07824 862004",
        vehicle_make: "Toyota",
        vehicle_model: "Hi-Ace 280 Swb D-4d 120",
        vehicle_registration: "NG07 LML",
        vehicle_mileage: 179235,
        total_gross: 380.30,
        total_net: 316.92,
        total_tax: 63.38,
        status: "Issued"
      }
    ]

    // Import the document
    let documentId = null
    for (const doc of targetDocuments) {
      try {
        const result = await sql`
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
            ${doc.id},
            ${doc.customer_id},
            ${doc.vehicle_id},
            ${doc.doc_type},
            ${doc.doc_number},
            ${doc.doc_date_created},
            ${doc.doc_date_issued},
            ${doc.doc_date_paid},
            ${doc.doc_status},
            ${doc.customer_name},
            ${doc.customer_address},
            ${doc.customer_phone},
            ${doc.vehicle_make},
            ${doc.vehicle_model},
            ${doc.vehicle_registration},
            ${doc.vehicle_mileage},
            ${doc.total_gross},
            ${doc.total_net},
            ${doc.total_tax},
            ${doc.status},
            NOW(),
            NOW()
          )
          ON CONFLICT (_id) DO UPDATE SET
            doc_number = EXCLUDED.doc_number,
            customer_name = EXCLUDED.customer_name,
            vehicle_registration = EXCLUDED.vehicle_registration,
            total_gross = EXCLUDED.total_gross,
            updated_at = NOW()
          RETURNING id
        `
        documentId = result[0].id
        importedDocs++
        console.log(`[IMPORT-MISSING] Imported document: ${doc.doc_number} with ID: ${documentId}`)
      } catch (error) {
        console.log(`[IMPORT-MISSING] Error importing document ${doc.doc_number}:`, error)
      }
    }

    // Import line items for SI80349
    const targetLineItems = [
      {
        document_id: documentId,
        item_type: "Labour",
        description: "Mechanical Labour",
        quantity: 1,
        unit_price: 234.00,
        total_price: 280.80,
        tax_rate: 20
      },
      {
        document_id: documentId,
        item_type: "Parts",
        description: "Fuel Pipe Cyl 4",
        quantity: 1,
        unit_price: 70.92,
        total_price: 85.10,
        tax_rate: 20
      }
    ]

    for (const item of targetLineItems) {
      try {
        await sql`
          INSERT INTO document_line_items (
            document_id,
            item_type,
            description,
            quantity,
            unit_price,
            total_price,
            tax_rate
          ) VALUES (
            ${item.document_id},
            ${item.item_type},
            ${item.description},
            ${item.quantity},
            ${item.unit_price},
            ${item.total_price},
            ${item.tax_rate}
          )
        `
        importedLineItems++
        console.log(`[IMPORT-MISSING] Imported line item: ${item.description}`)
      } catch (error) {
        console.log(`[IMPORT-MISSING] Error importing line item:`, error)
      }
    }

    // Import document extra (service description)
    if (documentId) {
      try {
        await sql`
          INSERT INTO document_extras (
            document_id,
            labour_description,
            doc_notes
          ) VALUES (
            ${documentId},
            ${"Investigated Engine Fuel Leak - Found Cylinder 4 Injector Pipe Leaking. Replaced Injector Pipe And Bled Fuel System."},
            ${""}
          )
          ON CONFLICT (document_id) DO UPDATE SET
            labour_description = EXCLUDED.labour_description,
            doc_notes = EXCLUDED.doc_notes
        `
        importedExtras++
        console.log(`[IMPORT-MISSING] Imported document extra for SI80349`)
      } catch (error) {
        console.log(`[IMPORT-MISSING] Error importing document extra:`, error)
      }
    }

    // Verify the import
    const verifyDoc = await sql`
      SELECT
        d.*,
        COUNT(dli.id) as line_item_count,
        de.labour_description
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      LEFT JOIN document_extras de ON d.id = de.document_id
      WHERE d.doc_number = '80349'
      GROUP BY d.id, de.labour_description
    `

    return NextResponse.json({
      success: true,
      import_results: {
        documents_imported: importedDocs,
        line_items_imported: importedLineItems,
        document_extras_imported: importedExtras
      },
      verification: {
        si80349_found: verifyDoc.length > 0,
        document_details: verifyDoc[0] || null
      },
      message: `Successfully imported job SI80349 and related data for Rebecca Lewis / NG07 LML`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-MISSING] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import missing documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
