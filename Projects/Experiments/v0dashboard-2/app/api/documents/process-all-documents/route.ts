import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[PROCESS-ALL-DOCUMENTS] Starting comprehensive document processing...")

    const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports'
    const documentsPath = `${basePath}/Documents.csv`
    const lineItemsPath = `${basePath}/LineItems.csv`
    const documentExtrasPath = `${basePath}/Document_Extras.csv`
    const receiptsPath = `${basePath}/Receipts.csv`

    // Check if files exist
    const files = [
      { name: 'Documents', path: documentsPath },
      { name: 'LineItems', path: lineItemsPath },
      { name: 'Document_Extras', path: documentExtrasPath },
      { name: 'Receipts', path: receiptsPath }
    ]

    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        return NextResponse.json({
          success: false,
          error: `${file.name}.csv file not found`,
          path: file.path
        }, { status: 404 })
      }
    }

    // Create comprehensive document tables
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_registration TEXT,
        document_type TEXT,
        document_number TEXT,
        document_date DATE,
        due_date DATE,
        total_gross DECIMAL(10,2),
        total_net DECIMAL(10,2),
        total_tax DECIMAL(10,2),
        status TEXT,
        department TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_doc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS line_items (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        item_type TEXT,
        description TEXT,
        quantity DECIMAL(10,2),
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        tax_rate DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_lineitem_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        description TEXT,
        amount DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_extra_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        amount DECIMAL(10,2),
        payment_date DATE,
        payment_method TEXT,
        description TEXT,
        reconciled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_receipt_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      )
    `

    // Clear existing data
    await sql`DELETE FROM receipts`
    await sql`DELETE FROM document_extras`
    await sql`DELETE FROM line_items`
    await sql`DELETE FROM documents`

    let documentsImported = 0
    let lineItemsImported = 0
    let extrasImported = 0
    let receiptsImported = 0

    // 1. Process Documents first
    console.log("[PROCESS-ALL-DOCUMENTS] Processing main documents...")
    const documentsContent = fs.readFileSync(documentsPath, 'utf-8')
    const documentLines = documentsContent.split('\n')
    const docHeader = documentLines[0].split(',')

    console.log(`[PROCESS-ALL-DOCUMENTS] Document header sample: ${docHeader.slice(0, 10).join(', ')}...`)

    // Find document column indices
    const findDocColumnIndex = (columnName: string) => {
      return docHeader.findIndex(field =>
        field.toLowerCase().replace(/"/g, '').trim().includes(columnName.toLowerCase())
      )
    }

    const docColumnIndices = {
      id: findDocColumnIndex('_id'),
      customerId: findDocColumnIndex('_id_customer'),
      vehicleReg: findDocColumnIndex('vehregistration'),
      docType: findDocColumnIndex('doctype'),
      docNumber: findDocColumnIndex('docnumber_invoice') || findDocColumnIndex('docnumber'),
      docDate: findDocColumnIndex('docdate_created'),
      dueDate: findDocColumnIndex('docdate_dueby'),
      totalGross: findDocColumnIndex('us_totalgross'),
      totalNet: findDocColumnIndex('us_totalnet'),
      totalTax: findDocColumnIndex('us_totaltax'),
      status: findDocColumnIndex('docstatus'),
      department: findDocColumnIndex('docdepartment')
    }

    console.log('[PROCESS-ALL-DOCUMENTS] Document column indices:', docColumnIndices)

    // Process documents (limit to first 10,000 for performance)
    for (let i = 1; i < Math.min(documentLines.length, 10001); i++) {
      const line = documentLines[i].trim()
      if (line.length === 0) continue

      try {
        const fields = parseCSVLine(line)

        const docId = fields[docColumnIndices.id] ? fields[docColumnIndices.id].replace(/"/g, '').trim() : ''
        if (!docId || docId.length < 5) continue

        const customerId = fields[docColumnIndices.customerId] ? fields[docColumnIndices.customerId].replace(/"/g, '').trim() : null

        // Parse date
        let docDate = null
        if (fields[docColumnIndices.docDate]) {
          const dateStr = fields[docColumnIndices.docDate].replace(/"/g, '').trim()
          if (dateStr) {
            try {
              docDate = new Date(dateStr)
              if (isNaN(docDate.getTime())) docDate = null
            } catch (e) {
              docDate = null
            }
          }
        }

        // Parse amounts
        const parseAmount = (field: string) => {
          if (!field) return null
          const cleaned = field.replace(/"/g, '').replace(/[£$,]/g, '').trim()
          const num = parseFloat(cleaned)
          return isNaN(num) ? null : num
        }

        const document = {
          id: docId,
          customer_id: customerId,
          vehicle_registration: fields[docColumnIndices.vehicleReg] ? fields[docColumnIndices.vehicleReg].replace(/"/g, '').trim() : null,
          document_type: fields[docColumnIndices.docType] ? fields[docColumnIndices.docType].replace(/"/g, '').trim() : null,
          document_number: fields[docColumnIndices.docNumber] ? fields[docColumnIndices.docNumber].replace(/"/g, '').trim() : null,
          document_date: docDate,
          total_gross: parseAmount(fields[docColumnIndices.totalGross]),
          total_net: parseAmount(fields[docColumnIndices.totalNet]),
          total_tax: parseAmount(fields[docColumnIndices.totalTax]),
          status: fields[docColumnIndices.status] ? fields[docColumnIndices.status].replace(/"/g, '').trim() : null,
          department: fields[docColumnIndices.department] ? fields[docColumnIndices.department].replace(/"/g, '').trim() : null
        }

        await sql`
          INSERT INTO documents (
            id, customer_id, vehicle_registration, document_type, document_number,
            document_date, total_gross, total_net, total_tax, status, department
          ) VALUES (
            ${document.id}, ${document.customer_id}, ${document.vehicle_registration},
            ${document.document_type}, ${document.document_number}, ${document.document_date},
            ${document.total_gross}, ${document.total_net}, ${document.total_tax},
            ${document.status}, ${document.department}
          )
          ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            vehicle_registration = EXCLUDED.vehicle_registration,
            updated_at = NOW()
        `
        documentsImported++

        if (documentsImported % 1000 === 0) {
          console.log(`[PROCESS-ALL-DOCUMENTS] Imported ${documentsImported} documents...`)
        }

      } catch (error) {
        // Skip problematic lines
        continue
      }
    }

    console.log(`[PROCESS-ALL-DOCUMENTS] Documents imported: ${documentsImported}`)

    // Get final statistics
    const documentStats = await sql`
      SELECT
        COUNT(*) as total_documents,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
        COUNT(CASE WHEN document_date IS NOT NULL THEN 1 END) as with_date,
        COUNT(CASE WHEN total_gross IS NOT NULL THEN 1 END) as with_amount,
        MIN(document_date) as earliest_date,
        MAX(document_date) as latest_date,
        SUM(total_gross) as total_revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT vehicle_registration) as unique_vehicles
      FROM documents
      WHERE customer_id IS NOT NULL
    `

    // Get recent customer activity
    const recentActivity = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.twilio_phone,
        c.email,
        COUNT(d.id) as document_count,
        MAX(d.document_date) as last_document_date,
        SUM(d.total_gross) as total_spent,
        COUNT(DISTINCT d.vehicle_registration) as vehicles_serviced,
        ARRAY_AGG(DISTINCT d.document_type) as document_types
      FROM customers c
      INNER JOIN documents d ON c.id = d.customer_id
      WHERE d.document_date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone, c.email
      ORDER BY MAX(d.document_date) DESC
      LIMIT 50
    `

    // Update customer last_contact_date based on documents
    await sql`
      UPDATE customers
      SET last_contact_date = (
        SELECT MAX(document_date)
        FROM documents
        WHERE documents.customer_id = customers.id
      )
      WHERE id IN (
        SELECT DISTINCT customer_id
        FROM documents
        WHERE customer_id IS NOT NULL
      )
    `

    const stats = documentStats[0]

    return NextResponse.json({
      success: true,
      message: "Document processing completed",
      results: {
        documentsImported,
        lineItemsImported,
        extrasImported,
        receiptsImported
      },
      statistics: {
        totalDocuments: parseInt(stats.total_documents),
        withCustomer: parseInt(stats.with_customer),
        withDate: parseInt(stats.with_date),
        withAmount: parseInt(stats.with_amount),
        earliestDate: stats.earliest_date,
        latestDate: stats.latest_date,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        uniqueCustomers: parseInt(stats.unique_customers),
        uniqueVehicles: parseInt(stats.unique_vehicles),
        customerLinkRate: Math.round((parseInt(stats.with_customer) / parseInt(stats.total_documents)) * 100)
      },
      recentActivity: recentActivity.slice(0, 20),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PROCESS-ALL-DOCUMENTS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process documents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Helper function to parse CSV lines properly
function parseCSVLine(line: string): string[] {
    const fields = []
    let current = ''
    let inQuotes = false
    let j = 0

    while (j < line.length) {
      const char = line[j]

      if (char === '"') {
        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
          current += '"'
          j += 2
        } else {
          inQuotes = !inQuotes
          j++
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
        j++
      } else {
        current += char
        j++
      }
    }
    fields.push(current.trim())
    return fields
}
