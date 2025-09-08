import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { batchSize = 5000, testMode = false } = await request.json()
    
    console.log(`[IMPORT-LINE-ITEMS] 🔧 Starting line items import, batchSize: ${batchSize}, testMode: ${testMode}`)

    const startTime = Date.now()
    const lineItemsPath = "/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv"

    // Check if file exists
    if (!fs.existsSync(lineItemsPath)) {
      return NextResponse.json({
        success: false,
        error: "LineItems.csv file not found",
        path: lineItemsPath
      }, { status: 404 })
    }

    // Read CSV content
    console.log("[IMPORT-LINE-ITEMS] 📄 Reading LineItems.csv...")
    const csvContent = fs.readFileSync(lineItemsPath, 'utf8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log(`[IMPORT-LINE-ITEMS] 📊 Found ${lines.length - 1} line items in CSV`)
    console.log(`[IMPORT-LINE-ITEMS] Headers:`, headers.slice(0, 10))

    const results = {
      total_lines: lines.length - 1,
      processed: 0,
      imported: 0,
      failed: 0,
      skipped: 0
    }

    // Get existing documents to match against
    const existingDocuments = await sql`
      SELECT id, _id FROM documents
    `
    
    const documentMap = new Map()
    existingDocuments.forEach(doc => {
      documentMap.set(doc._id, doc.id.toString())
    })

    console.log(`[IMPORT-LINE-ITEMS] 🔗 Found ${documentMap.size} existing documents to link line items to`)

    // Process line items in batches
    const maxLines = testMode ? Math.min(1000, lines.length - 1) : lines.length - 1
    
    for (let i = 1; i <= maxLines && i < lines.length; i++) {
      if (!lines[i] || lines[i].trim() === '') continue
      
      try {
        // Parse CSV line
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
        const lineItemData = {}
        headers.forEach((header, index) => {
          lineItemData[header] = values[index] || null
        })

        // Extract key fields
        const documentId = lineItemData._id_document || lineItemData._ID_Document
        const description = lineItemData.description || lineItemData.Description
        const quantity = lineItemData.quantity || lineItemData.Quantity || 1
        const unitPrice = lineItemData.unit_price || lineItemData.UnitPrice || 0
        const totalPrice = lineItemData.total_price || lineItemData.TotalPrice || 0
        const itemType = lineItemData.item_type || lineItemData.ItemType || 'Item'

        // Check if we have a matching document
        const matchingDocumentId = documentMap.get(documentId)
        
        if (!matchingDocumentId) {
          results.skipped++
          continue
        }

        // Insert line item
        await sql`
          INSERT INTO document_line_items (
            id, document_id, item_type, description, quantity,
            unit_price, total_price, tax_rate
          ) VALUES (
            ${lineItemData._id || `${matchingDocumentId}_${i}`},
            ${matchingDocumentId},
            ${itemType},
            ${description || 'Service Item'},
            ${parseInt(quantity) || 1},
            ${parseFloat(unitPrice) || 0},
            ${parseFloat(totalPrice) || 0},
            20
          )
          ON CONFLICT (id) DO UPDATE SET
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            total_price = EXCLUDED.total_price
        `

        results.imported++
        results.processed++

        // Progress logging
        if (results.processed % 1000 === 0) {
          console.log(`[IMPORT-LINE-ITEMS] 📈 Progress: ${results.processed}/${maxLines} processed, ${results.imported} imported`)
        }

      } catch (error) {
        results.failed++
        results.processed++
        
        if (results.failed % 100 === 0) {
          console.log(`[IMPORT-LINE-ITEMS] ⚠️ ${results.failed} failures so far`)
        }
      }
    }

    const processingTime = Date.now() - startTime

    // Get final counts
    const finalLineItemCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const documentsWithLineItems = await sql`
      SELECT COUNT(DISTINCT document_id) as count FROM document_line_items
    `

    console.log(`[IMPORT-LINE-ITEMS] ✅ Completed: ${results.imported} line items imported in ${Math.round(processingTime / 1000)} seconds`)

    return NextResponse.json({
      success: true,
      line_items_import_results: {
        processing_summary: results,
        performance: {
          processing_time_ms: processingTime,
          processing_time_seconds: Math.round(processingTime / 1000),
          items_per_second: Math.round(results.processed / (processingTime / 1000))
        },
        final_status: {
          total_line_items_in_database: parseInt(finalLineItemCount[0].count),
          documents_with_line_items: parseInt(documentsWithLineItems[0].count),
          existing_documents_available: documentMap.size
        },
        data_quality: {
          import_success_rate: Math.round((results.imported / results.processed) * 100),
          documents_matched: results.imported > 0 ? "SUCCESS" : "FAILED"
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to import line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
