import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[IMPORT-ALL-DOCUMENTS] Starting comprehensive import of all documents...")

    const documentsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'
    
    // Read file with proper encoding handling
    const fileContent = fs.readFileSync(documentsPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[IMPORT-ALL-DOCUMENTS] Processing ${lines.length} lines`)
    
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
      customerId: findColumnIndex('customerID'),
      vehicleId: findColumnIndex('vehicleID'),
      docDate: findColumnIndex('docDate'),
      docNumber: findColumnIndex('docNumber'),
      docType: findColumnIndex('docType'),
      totalNet: findColumnIndex('docTotal_Net'),
      totalVat: findColumnIndex('docTotal_VAT'),
      totalGross: findColumnIndex('docTotal_Gross'),
      status: findColumnIndex('docStatus'),
      labourDescription: findColumnIndex('labourDescription'),
      notes: findColumnIndex('docNotes')
    }

    console.log('[IMPORT-ALL-DOCUMENTS] Column indices:', columnIndices)

    let imported = 0
    let skipped = 0
    let errors = 0
    let invalidCustomers = 0
    let invalidVehicles = 0
    
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

        // Extract document data
        const documentId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : ''
        
        if (!documentId || documentId.length < 5) {
          skipped++
          continue
        }

        // Skip duplicate IDs
        if (seenIds.has(documentId)) {
          skipped++
          continue
        }
        seenIds.add(documentId)

        // Get and validate customer ID
        const customerId = fields[columnIndices.customerId] ? fields[columnIndices.customerId].replace(/"/g, '').trim() : ''
        let validCustomerId = null

        if (customerId) {
          try {
            const customerCheck = await sql`
              SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
            `
            if (customerCheck.length > 0) {
              validCustomerId = customerId
            } else {
              invalidCustomers++
            }
          } catch (error) {
            invalidCustomers++
          }
        }

        // Get and validate vehicle ID
        const vehicleId = fields[columnIndices.vehicleId] ? fields[columnIndices.vehicleId].replace(/"/g, '').trim() : ''
        let validVehicleId = null

        if (vehicleId) {
          try {
            const vehicleCheck = await sql`
              SELECT id FROM vehicles WHERE id = ${vehicleId} LIMIT 1
            `
            if (vehicleCheck.length > 0) {
              validVehicleId = vehicleId
            } else {
              invalidVehicles++
            }
          } catch (error) {
            invalidVehicles++
          }
        }

        // Skip if no valid customer (documents must have a customer)
        if (!validCustomerId) {
          skipped++
          continue
        }

        // Parse document date
        let docDate = null
        const docDateStr = fields[columnIndices.docDate] ? fields[columnIndices.docDate].replace(/"/g, '').trim() : ''
        if (docDateStr) {
          try {
            const date = new Date(docDateStr)
            if (!isNaN(date.getTime())) {
              docDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            // Invalid date, leave as null
          }
        }

        // Parse monetary values
        const parseMonetary = (value: string) => {
          if (!value) return null
          const cleaned = value.replace(/[£$,]/g, '').trim()
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? null : parsed
        }

        const document = {
          id: documentId,
          customer_id: validCustomerId,
          vehicle_id: validVehicleId,
          doc_date: docDate,
          doc_number: fields[columnIndices.docNumber] ? fields[columnIndices.docNumber].replace(/"/g, '').trim() : '',
          doc_type: fields[columnIndices.docType] ? fields[columnIndices.docType].replace(/"/g, '').trim() : 'invoice',
          total_net: parseMonetary(fields[columnIndices.totalNet] ? fields[columnIndices.totalNet].replace(/"/g, '').trim() : ''),
          total_vat: parseMonetary(fields[columnIndices.totalVat] ? fields[columnIndices.totalVat].replace(/"/g, '').trim() : ''),
          total_gross: parseMonetary(fields[columnIndices.totalGross] ? fields[columnIndices.totalGross].replace(/"/g, '').trim() : ''),
          status: fields[columnIndices.status] ? fields[columnIndices.status].replace(/"/g, '').trim() : 'completed',
          labour_description: fields[columnIndices.labourDescription] ? fields[columnIndices.labourDescription].replace(/"/g, '').trim() : '',
          notes: fields[columnIndices.notes] ? fields[columnIndices.notes].replace(/"/g, '').trim() : ''
        }

        // Import document with duplicate handling
        await sql`
          INSERT INTO documents (
            id, customer_id, vehicle_id, doc_date, doc_number, doc_type,
            total_net, total_vat, total_gross, status, labour_description, notes
          ) VALUES (
            ${document.id},
            ${document.customer_id},
            ${document.vehicle_id},
            ${document.doc_date},
            ${document.doc_number || ''},
            ${document.doc_type},
            ${document.total_net || 0},
            ${document.total_vat || 0},
            ${document.total_gross || 0},
            ${document.status},
            ${document.labour_description || ''},
            ${document.notes || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            vehicle_id = EXCLUDED.vehicle_id,
            doc_date = EXCLUDED.doc_date,
            doc_number = EXCLUDED.doc_number,
            doc_type = EXCLUDED.doc_type,
            total_net = EXCLUDED.total_net,
            total_vat = EXCLUDED.total_vat,
            total_gross = EXCLUDED.total_gross,
            status = EXCLUDED.status,
            labour_description = EXCLUDED.labour_description,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `
        imported++

        if (imported % 1000 === 0) {
          console.log(`[IMPORT-ALL-DOCUMENTS] Imported ${imported} documents...`)
        }

      } catch (error) {
        errors++
        if (errors <= 10) {
          console.error(`[IMPORT-ALL-DOCUMENTS] Error on line ${i + 1}:`, error)
        }
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM documents`
    const totalDocuments = parseInt(finalCount[0].count)

    // Get documents with vehicles
    const withVehicles = await sql`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE vehicle_id IS NOT NULL
    `
    const documentsWithVehicles = parseInt(withVehicles[0].count)

    // Get total revenue
    const revenueStats = await sql`
      SELECT 
        SUM(total_gross) as total_revenue,
        AVG(total_gross) as avg_invoice_value,
        COUNT(*) as invoice_count
      FROM documents 
      WHERE total_gross > 0
    `

    // Get sample documents
    const sampleDocuments = await sql`
      SELECT 
        d.id, d.doc_number, d.doc_type, d.doc_date, d.total_gross,
        c.first_name, c.last_name, v.registration
      FROM documents d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      ORDER BY d.created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Comprehensive document import completed",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors,
        invalidCustomers,
        invalidVehicles,
        totalDocumentsInDatabase: totalDocuments,
        documentsWithVehicles,
        vehicleConnectionRate: Math.round((documentsWithVehicles / totalDocuments) * 100),
        importRate: Math.round((imported / (lines.length - 1)) * 100),
        targetAchieved: totalDocuments >= 25000
      },
      revenue: {
        totalRevenue: parseFloat(revenueStats[0].total_revenue || '0'),
        averageInvoiceValue: parseFloat(revenueStats[0].avg_invoice_value || '0'),
        invoiceCount: parseInt(revenueStats[0].invoice_count || '0')
      },
      sampleDocuments,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ALL-DOCUMENTS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import all documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
