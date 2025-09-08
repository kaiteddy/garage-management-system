import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
// import csv from 'csv-parser' // Not available in this environment

export async function POST(request: Request) {
  try {
    const { batchSize = 100, offset = 0, testMode = true } = await request.json()

    console.log(`[DOCS-BATCH] Starting document batch import: size=${batchSize}, offset=${offset}, testMode=${testMode}`)

    const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"
    const lineItemsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv"
    const documentExtrasPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Document_Extras.csv"

    const results = {
      documents_processed: 0,
      documents_imported: 0,
      line_items_imported: 0,
      document_extras_imported: 0,
      failed: 0,
      details: []
    }

    // Read documents CSV in batches
    const documents = []
    let currentRow = 0

    await new Promise((resolve, reject) => {
      fs.createReadStream(documentsPath)
        .pipe(csv())
        .on('data', (row) => {
          if (currentRow >= offset && documents.length < batchSize) {
            documents.push(row)
          }
          currentRow++

          // In test mode, limit to first 10 documents
          if (testMode && documents.length >= 10) {
            resolve(null)
            return
          }
        })
        .on('end', resolve)
        .on('error', reject)
    })

    console.log(`[DOCS-BATCH] Processing ${documents.length} documents from CSV`)

    for (const docRow of documents) {
      try {
        // Parse document data
        const docData = {
          _id: docRow._id || docRow.id,
          _id_customer: docRow._id_customer,
          _id_vehicle: docRow._id_vehicle,
          doc_type: docRow.doc_type,
          doc_number: docRow.doc_number,
          doc_date_created: docRow.doc_date_created,
          doc_date_issued: docRow.doc_date_issued,
          doc_date_paid: docRow.doc_date_paid,
          doc_status: docRow.doc_status,
          customer_name: docRow.customer_name,
          customer_address: docRow.customer_address,
          customer_phone: docRow.customer_phone,
          vehicle_make: docRow.vehicle_make,
          vehicle_model: docRow.vehicle_model,
          vehicle_registration: docRow.vehicle_registration,
          vehicle_mileage: docRow.vehicle_mileage ? parseInt(docRow.vehicle_mileage) : null,
          total_gross: docRow.total_gross ? parseFloat(docRow.total_gross) : 0,
          total_net: docRow.total_net ? parseFloat(docRow.total_net) : 0,
          total_tax: docRow.total_tax ? parseFloat(docRow.total_tax) : 0,
          status: docRow.status || 'Issued'
        }

        // Skip if essential data is missing
        if (!docData._id || !docData.doc_number) {
          results.failed++
          results.details.push({
            doc_number: docData.doc_number || 'Unknown',
            status: 'failed',
            reason: 'Missing essential document data'
          })
          continue
        }

        // Insert document
        const docResult = await sql`
          INSERT INTO documents (
            _id, _id_customer, _id_vehicle, doc_type, doc_number,
            doc_date_created, doc_date_issued, doc_date_paid, doc_status,
            customer_name, customer_address, customer_phone,
            vehicle_make, vehicle_model, vehicle_registration, vehicle_mileage,
            total_gross, total_net, total_tax, status,
            created_at, updated_at
          ) VALUES (
            ${docData._id}, ${docData._id_customer}, ${docData._id_vehicle},
            ${docData.doc_type}, ${docData.doc_number},
            ${docData.doc_date_created}, ${docData.doc_date_issued}, ${docData.doc_date_paid},
            ${docData.doc_status}, ${docData.customer_name}, ${docData.customer_address},
            ${docData.customer_phone}, ${docData.vehicle_make}, ${docData.vehicle_model},
            ${docData.vehicle_registration}, ${docData.vehicle_mileage},
            ${docData.total_gross}, ${docData.total_net}, ${docData.total_tax},
            ${docData.status}, NOW(), NOW()
          )
          ON CONFLICT (_id) DO UPDATE SET
            doc_number = EXCLUDED.doc_number,
            customer_name = EXCLUDED.customer_name,
            vehicle_registration = EXCLUDED.vehicle_registration,
            total_gross = EXCLUDED.total_gross,
            updated_at = NOW()
          RETURNING id
        `

        const documentId = docResult[0].id
        results.documents_imported++

        // Import line items for this document
        const lineItemsForDoc = []
        await new Promise((resolve, reject) => {
          fs.createReadStream(lineItemsPath)
            .pipe(csv())
            .on('data', (row) => {
              if (row._id_document === docData._id) {
                lineItemsForDoc.push(row)
              }
            })
            .on('end', resolve)
            .on('error', reject)
        })

        // Insert line items
        for (const lineItem of lineItemsForDoc) {
          try {
            await sql`
              INSERT INTO document_line_items (
                id, document_id, item_type, description, quantity,
                unit_price, total_price, tax_rate
              ) VALUES (
                ${lineItem._id || `${documentId}_${lineItem.line_number || Math.random()}`},
                ${documentId.toString()},
                ${lineItem.item_type || 'Item'},
                ${lineItem.description},
                ${lineItem.quantity ? parseInt(lineItem.quantity) : 1},
                ${lineItem.unit_price ? parseFloat(lineItem.unit_price) : 0},
                ${lineItem.total_price ? parseFloat(lineItem.total_price) : 0},
                ${lineItem.tax_rate ? parseFloat(lineItem.tax_rate) : 20}
              )
              ON CONFLICT (id) DO NOTHING
            `
            results.line_items_imported++
          } catch (lineError) {
            console.log(`[DOCS-BATCH] Line item import failed for ${docData.doc_number}:`, lineError)
          }
        }

        // Import document extras
        const extrasForDoc = []
        await new Promise((resolve, reject) => {
          fs.createReadStream(documentExtrasPath)
            .pipe(csv())
            .on('data', (row) => {
              if (row._id_document === docData._id) {
                extrasForDoc.push(row)
              }
            })
            .on('end', resolve)
            .on('error', reject)
        })

        for (const extra of extrasForDoc) {
          try {
            await sql`
              INSERT INTO document_extras (
                document_id, labour_description, doc_notes
              ) VALUES (
                ${documentId},
                ${extra.labour_description || ''},
                ${extra.doc_notes || ''}
              )
              ON CONFLICT (document_id) DO UPDATE SET
                labour_description = EXCLUDED.labour_description,
                doc_notes = EXCLUDED.doc_notes
            `
            results.document_extras_imported++
          } catch (extraError) {
            console.log(`[DOCS-BATCH] Document extra import failed for ${docData.doc_number}:`, extraError)
          }
        }

        results.details.push({
          doc_number: docData.doc_number,
          status: 'imported',
          customer: docData.customer_name,
          vehicle: docData.vehicle_registration,
          amount: docData.total_gross,
          line_items: lineItemsForDoc.length,
          extras: extrasForDoc.length
        })

        results.documents_processed++

      } catch (error) {
        results.failed++
        results.details.push({
          doc_number: docRow.doc_number || 'Unknown',
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`[DOCS-BATCH] Error processing document:`, error)
      }
    }

    // Get total document count from CSV for progress tracking
    const totalDocsInCsv = await new Promise((resolve) => {
      let count = 0
      fs.createReadStream(documentsPath)
        .pipe(csv())
        .on('data', () => count++)
        .on('end', () => resolve(count))
    })

    return NextResponse.json({
      success: true,
      batch_results: results,
      batch_info: {
        batch_size: batchSize,
        offset,
        test_mode: testMode,
        documents_in_batch: documents.length,
        total_documents_in_csv: totalDocsInCsv
      },
      next_batch: {
        recommended_offset: offset + batchSize,
        estimated_remaining: totalDocsInCsv - (offset + batchSize)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DOCS-BATCH] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process document batch",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
