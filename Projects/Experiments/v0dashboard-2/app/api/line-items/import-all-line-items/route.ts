import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[IMPORT-ALL-LINE-ITEMS] Starting comprehensive import of all line items...")

    const lineItemsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/LineItems.csv'
    
    // Read file with proper encoding handling
    const fileContent = fs.readFileSync(lineItemsPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[IMPORT-ALL-LINE-ITEMS] Processing ${lines.length} lines`)
    
    // Get header and find column positions
    const headerLine = lines[0]
    const headerFields = headerLine.split(',')
    
    // Find column indices (case insensitive)
    const findColumnIndex = (columnName: string) => {
      return headerFields.findIndex(field => 
        field.toLowerCase().replace(/"/g, '').trim() === columnName.toLowerCase()
      )
    }

    const columnIndices = {
      id: findColumnIndex('_ID'),
      documentId: findColumnIndex('docID'),
      stockId: findColumnIndex('stockID'),
      lineType: findColumnIndex('itemType'),
      description: findColumnIndex('itemDescription'),
      quantity: findColumnIndex('itemQuantity'),
      unitPrice: findColumnIndex('itemPrice'),
      taxRate: findColumnIndex('itemTaxRate'),
      taxAmount: findColumnIndex('itemTaxAmount'),
      totalAmount: findColumnIndex('itemSub_Gross'),
      notes: findColumnIndex('itemNotes')
    }

    console.log('[IMPORT-ALL-LINE-ITEMS] Column indices:', columnIndices)

    let imported = 0
    let skipped = 0
    let errors = 0
    let invalidDocuments = 0
    
    const seenIds = new Set()

    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Parse CSV line manually to handle quotes properly
        const fields = []
        let current = ''
        let inQuotes = false
        let j = 0

        while (j < line.length) {
          const char = line[j]
          
          if (char === '"') {
            if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
              // Escaped quote
              current += '"'
              j += 2
            } else {
              // Toggle quote state
              inQuotes = !inQuotes
              j++
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator
            fields.push(current.trim())
            current = ''
            j++
          } else {
            current += char
            j++
          }
        }
        fields.push(current.trim()) // Add last field

        // Extract line item data
        const lineItemId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : ''
        
        if (!lineItemId || lineItemId.length < 5) {
          skipped++
          continue
        }

        // Skip duplicate IDs
        if (seenIds.has(lineItemId)) {
          skipped++
          continue
        }
        seenIds.add(lineItemId)

        // Get and validate document ID
        const documentId = fields[columnIndices.documentId] ? fields[columnIndices.documentId].replace(/"/g, '').trim() : ''
        let validDocumentId = null

        if (documentId) {
          try {
            // Convert documentId to integer for comparison
            const docIdInt = parseInt(documentId)
            if (!isNaN(docIdInt)) {
              // Check customer_documents table instead (which has the actual data)
              const documentCheck = await sql`
                SELECT id FROM customer_documents WHERE id = ${docIdInt} LIMIT 1
              `
              if (documentCheck.length > 0) {
                validDocumentId = documentId // Keep as string for line_items table
              } else {
                invalidDocuments++
              }
            } else {
              invalidDocuments++
            }
          } catch (error) {
            invalidDocuments++
          }
        }

        // Skip if no valid document (line items must have a document)
        if (!validDocumentId) {
          skipped++
          continue
        }

        // Parse monetary values
        const parseMonetary = (value: string) => {
          if (!value) return null
          const cleaned = value.replace(/[£$,]/g, '').trim()
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? null : parsed
        }

        // Parse quantity
        const parseQuantity = (value: string) => {
          if (!value) return 1
          const parsed = parseFloat(value.replace(/"/g, '').trim())
          return isNaN(parsed) ? 1 : parsed
        }

        const lineItem = {
          id: lineItemId,
          document_id: validDocumentId,
          stock_id: fields[columnIndices.stockId] ? fields[columnIndices.stockId].replace(/"/g, '').trim() : '',
          line_type: fields[columnIndices.lineType] ? fields[columnIndices.lineType].replace(/"/g, '').trim() : 'service',
          description: fields[columnIndices.description] ? fields[columnIndices.description].replace(/"/g, '').trim() : '',
          quantity: parseQuantity(fields[columnIndices.quantity] ? fields[columnIndices.quantity] : '1'),
          unit_price: parseMonetary(fields[columnIndices.unitPrice] ? fields[columnIndices.unitPrice].replace(/"/g, '').trim() : ''),
          tax_rate: parseMonetary(fields[columnIndices.taxRate] ? fields[columnIndices.taxRate].replace(/"/g, '').trim() : ''),
          tax_amount: parseMonetary(fields[columnIndices.taxAmount] ? fields[columnIndices.taxAmount].replace(/"/g, '').trim() : ''),
          total_amount: parseMonetary(fields[columnIndices.totalAmount] ? fields[columnIndices.totalAmount].replace(/"/g, '').trim() : ''),
          notes: fields[columnIndices.notes] ? fields[columnIndices.notes].replace(/"/g, '').trim() : ''
        }

        // Skip if no description
        if (!lineItem.description || lineItem.description.length < 2) {
          skipped++
          continue
        }

        // Import line item with duplicate handling
        await sql`
          INSERT INTO line_items (
            id, document_id, stock_id, line_type, description, quantity,
            unit_price, tax_rate, tax_amount, total_amount, notes
          ) VALUES (
            ${lineItem.id},
            ${lineItem.document_id},
            ${lineItem.stock_id || ''},
            ${lineItem.line_type},
            ${lineItem.description},
            ${lineItem.quantity || 1},
            ${lineItem.unit_price || 0},
            ${lineItem.tax_rate || 0},
            ${lineItem.tax_amount || 0},
            ${lineItem.total_amount || 0},
            ${lineItem.notes || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            document_id = EXCLUDED.document_id,
            stock_id = EXCLUDED.stock_id,
            line_type = EXCLUDED.line_type,
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            tax_rate = EXCLUDED.tax_rate,
            tax_amount = EXCLUDED.tax_amount,
            total_amount = EXCLUDED.total_amount,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `
        imported++

        if (imported % 1000 === 0) {
          console.log(`[IMPORT-ALL-LINE-ITEMS] Imported ${imported} line items...`)
        }

      } catch (error) {
        errors++
        if (errors <= 10) {
          console.error(`[IMPORT-ALL-LINE-ITEMS] Error on line ${i + 1}:`, error)
        }
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM line_items`
    const totalLineItems = parseInt(finalCount[0].count)

    // Get line item statistics
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT document_id) as documents_with_items,
        SUM(total_amount) as total_line_value,
        AVG(total_amount) as avg_line_value,
        COUNT(CASE WHEN line_type = 'service' THEN 1 END) as service_items,
        COUNT(CASE WHEN line_type = 'part' THEN 1 END) as part_items
      FROM line_items
    `

    // Get sample line items
    const sampleLineItems = await sql`
      SELECT 
        li.id, li.description, li.quantity, li.unit_price, li.total_amount,
        li.line_type, d.doc_number, c.first_name, c.last_name
      FROM line_items li
      LEFT JOIN documents d ON li.document_id = d.id
      LEFT JOIN customers c ON d.customer_id = c.id
      ORDER BY li.created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Comprehensive line items import completed",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors,
        invalidDocuments,
        totalLineItemsInDatabase: totalLineItems,
        documentsWithItems: parseInt(stats[0].documents_with_items || '0'),
        importRate: Math.round((imported / (lines.length - 1)) * 100),
        targetAchieved: totalLineItems >= 70000
      },
      statistics: {
        totalLineValue: parseFloat(stats[0].total_line_value || '0'),
        averageLineValue: parseFloat(stats[0].avg_line_value || '0'),
        serviceItems: parseInt(stats[0].service_items || '0'),
        partItems: parseInt(stats[0].part_items || '0')
      },
      sampleLineItems,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ALL-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import all line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
