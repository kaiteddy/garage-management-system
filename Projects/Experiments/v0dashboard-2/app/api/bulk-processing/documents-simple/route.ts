import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { batchSize = 10, offset = 0, testMode = true } = await request.json()

    console.log(`[DOCS-SIMPLE] Starting simple document import: size=${batchSize}, offset=${offset}, testMode=${testMode}`)

    const documentsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv"

    // Read the CSV file as text and parse manually
    const csvContent = fs.readFileSync(documentsPath, 'utf8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

    console.log(`[DOCS-SIMPLE] Found ${lines.length - 1} documents in CSV`)
    console.log(`[DOCS-SIMPLE] Headers:`, headers.slice(0, 10)) // Show first 10 headers

    const results = {
      documents_processed: 0,
      documents_imported: 0,
      failed: 0,
      details: []
    }

    // Process documents in the specified batch
    const startLine = offset + 1 // +1 to skip header
    const endLine = Math.min(startLine + batchSize, lines.length)

    for (let i = startLine; i < endLine; i++) {
      if (!lines[i] || lines[i].trim() === '') continue

      try {
        // Parse CSV line manually (basic parsing)
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())

        // Create document object from CSV data
        const docData = {}
        headers.forEach((header, index) => {
          docData[header] = values[index] || null
        })

        // Map the correct field names from CSV
        const documentId = docData._ID
        const documentNumber = docData.docNumber_Invoice || docData.docNumber_Estimate || docData.docNumber_Jobsheet
        const customerId = docData._ID_Customer
        const vehicleReg = docData.vehRegistration
        const totalGross = docData.us_TotalGROSS
        const customerName = `${docData.custName_Forename || ''} ${docData.custName_Surname || ''}`.trim()

        // Skip if essential data is missing
        if (!documentId || !documentNumber || !customerId) {
          results.failed++
          results.details.push({
            line: i,
            status: 'failed',
            reason: 'Missing essential document data',
            debug: { documentId, documentNumber, customerId }
          })
          continue
        }

        // Insert document with basic data
        const docResult = await sql`
          INSERT INTO documents (
            _id, _id_customer, _id_vehicle, doc_type, doc_number,
            doc_date_issued, customer_name, vehicle_registration,
            total_gross, total_net, total_tax, status,
            created_at, updated_at
          ) VALUES (
            ${documentId},
            ${customerId},
            ${docData._ID_Vehicle},
            ${docData.docType || 'SI'},
            ${documentNumber},
            ${docData.docDate_Issued},
            ${customerName},
            ${vehicleReg},
            ${totalGross ? parseFloat(totalGross) : 0},
            ${docData.us_TotalNET ? parseFloat(docData.us_TotalNET) : 0},
            ${docData.us_TotalTAX ? parseFloat(docData.us_TotalTAX) : 0},
            ${docData.docUserStatus || 'Issued'},
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

        results.documents_imported++
        results.details.push({
          line: i,
          doc_number: documentNumber,
          status: 'imported',
          customer: customerName,
          vehicle: vehicleReg,
          amount: totalGross
        })

        results.documents_processed++

        // In test mode, limit processing
        if (testMode && results.documents_processed >= 5) {
          break
        }

      } catch (error) {
        results.failed++
        results.details.push({
          line: i,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`[DOCS-SIMPLE] Error processing line ${i}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      batch_results: results,
      batch_info: {
        batch_size: batchSize,
        offset,
        test_mode: testMode,
        total_lines_in_csv: lines.length - 1,
        lines_processed: `${startLine} to ${endLine - 1}`
      },
      next_batch: {
        recommended_offset: offset + batchSize,
        estimated_remaining: Math.max(0, lines.length - 1 - (offset + batchSize))
      },
      csv_info: {
        total_lines: lines.length,
        headers_found: headers.length,
        sample_headers: headers.slice(0, 15)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DOCS-SIMPLE] Error:", error)
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
