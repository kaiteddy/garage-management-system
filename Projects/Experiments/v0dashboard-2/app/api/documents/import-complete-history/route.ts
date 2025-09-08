import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-COMPLETE-HISTORY] Starting complete document history import...")

    const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports'
    const files = {
      documents: `${basePath}/Documents.csv`,
      lineItems: `${basePath}/LineItems.csv`,
      documentExtras: `${basePath}/Document_Extras.csv`,
      receipts: `${basePath}/Receipts.csv`
    }

    // Verify all files exist
    for (const [name, path] of Object.entries(files)) {
      if (!fs.existsSync(path)) {
        return NextResponse.json({
          success: false,
          error: `${name} file not found`,
          path
        }, { status: 404 })
      }
    }

    // Create comprehensive document schema
    console.log("[IMPORT-COMPLETE-HISTORY] Creating database schema...")
    
    await sql`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        vehicle_registration TEXT,
        document_type TEXT,
        document_number TEXT,
        document_date DATE,
        due_date DATE,
        total_gross DECIMAL(12,2),
        total_net DECIMAL(12,2),
        total_tax DECIMAL(12,2),
        status TEXT,
        department TEXT,
        mot_cost DECIMAL(10,2),
        mot_status TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_custdoc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS document_line_items (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        item_type TEXT,
        description TEXT,
        quantity DECIMAL(10,3),
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        tax_rate DECIMAL(5,2),
        part_number TEXT,
        labour_hours DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_lineitem_document FOREIGN KEY (document_id) REFERENCES customer_documents(id) ON DELETE CASCADE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS document_extras (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        extra_type TEXT,
        description TEXT,
        amount DECIMAL(10,2),
        tax_rate DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_extra_document FOREIGN KEY (document_id) REFERENCES customer_documents(id) ON DELETE CASCADE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS document_receipts (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        amount DECIMAL(10,2),
        payment_date DATE,
        payment_method TEXT,
        description TEXT,
        reconciled BOOLEAN DEFAULT FALSE,
        reconciled_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_receipt_document FOREIGN KEY (document_id) REFERENCES customer_documents(id) ON DELETE SET NULL
      )
    `

    // Clear existing data
    console.log("[IMPORT-COMPLETE-HISTORY] Clearing existing data...")
    await sql`DELETE FROM document_receipts`
    await sql`DELETE FROM document_extras`
    await sql`DELETE FROM document_line_items`
    await sql`DELETE FROM customer_documents`

    let documentsImported = 0
    let lineItemsImported = 0
    let extrasImported = 0
    let receiptsImported = 0
    let errors = 0

    // 1. Import Documents first
    console.log("[IMPORT-COMPLETE-HISTORY] Step 1: Importing main documents...")
    
    try {
      const documentsContent = fs.readFileSync(files.documents, 'utf-8')
      const documentRecords = parse(documentsContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      })

      console.log(`[IMPORT-COMPLETE-HISTORY] Parsed ${documentRecords.length} document records`)

      // Process documents in batches
      const batchSize = 200
      for (let i = 0; i < documentRecords.length; i += batchSize) {
        const batch = documentRecords.slice(i, i + batchSize)
        
        for (const record of batch) {
          try {
            if (!record._ID || !record._ID_Customer) continue

            const docDate = parseDate(record.docDate_Created)
            const dueDate = parseDate(record.docDate_DueBy)

            await sql`
              INSERT INTO customer_documents (
                id, customer_id, vehicle_registration, document_type, document_number,
                document_date, due_date, total_gross, total_net, total_tax,
                status, department, mot_cost, mot_status
              ) VALUES (
                ${record._ID.trim()},
                ${record._ID_Customer.trim()},
                ${record.vehRegistration?.trim() || null},
                ${record.docType?.trim() || null},
                ${record.docNumber_Invoice?.trim() || record.docNumber_Estimate?.trim() || null},
                ${docDate},
                ${dueDate},
                ${parseAmount(record.us_TotalGROSS)},
                ${parseAmount(record.us_TotalNET)},
                ${parseAmount(record.us_TotalTAX)},
                ${record.docStatus?.trim() || null},
                ${record.docDepartment?.trim() || null},
                ${parseAmount(record.motCost)},
                ${record.motStatus?.trim() || null}
              )
              ON CONFLICT (id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                vehicle_registration = EXCLUDED.vehicle_registration,
                updated_at = NOW()
            `
            documentsImported++

          } catch (error) {
            errors++
          }
        }

        if ((i + batchSize) % 2000 === 0 || i + batchSize >= documentRecords.length) {
          console.log(`[IMPORT-COMPLETE-HISTORY] Documents: ${Math.min(i + batchSize, documentRecords.length)}/${documentRecords.length} processed (${documentsImported} imported)`)
        }
      }

    } catch (error) {
      console.error("[IMPORT-COMPLETE-HISTORY] Error importing documents:", error)
    }

    // 2. Import Line Items
    console.log("[IMPORT-COMPLETE-HISTORY] Step 2: Importing line items...")
    
    try {
      const lineItemsContent = fs.readFileSync(files.lineItems, 'utf-8')
      const lineItemRecords = parse(lineItemsContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      })

      console.log(`[IMPORT-COMPLETE-HISTORY] Parsed ${lineItemRecords.length} line item records`)

      const batchSize = 500
      for (let i = 0; i < lineItemRecords.length; i += batchSize) {
        const batch = lineItemRecords.slice(i, i + batchSize)
        
        for (const record of batch) {
          try {
            if (!record._ID || !record._ID_Document) continue

            await sql`
              INSERT INTO document_line_items (
                id, document_id, item_type, description, quantity,
                unit_price, total_price, tax_rate, part_number, labour_hours
              ) VALUES (
                ${record._ID.trim()},
                ${record._ID_Document.trim()},
                ${record.Type?.trim() || null},
                ${record.Description?.trim() || null},
                ${parseAmount(record.Qty)},
                ${parseAmount(record.UnitPrice)},
                ${parseAmount(record.TotalPrice)},
                ${parseAmount(record.TaxRate)},
                ${record.PartNumber?.trim() || null},
                ${parseAmount(record.LabourHours)}
              )
              ON CONFLICT (id) DO NOTHING
            `
            lineItemsImported++

          } catch (error) {
            errors++
          }
        }

        if ((i + batchSize) % 5000 === 0 || i + batchSize >= lineItemRecords.length) {
          console.log(`[IMPORT-COMPLETE-HISTORY] Line Items: ${Math.min(i + batchSize, lineItemRecords.length)}/${lineItemRecords.length} processed (${lineItemsImported} imported)`)
        }
      }

    } catch (error) {
      console.error("[IMPORT-COMPLETE-HISTORY] Error importing line items:", error)
    }

    // 3. Import Document Extras
    console.log("[IMPORT-COMPLETE-HISTORY] Step 3: Importing document extras...")
    
    try {
      const extrasContent = fs.readFileSync(files.documentExtras, 'utf-8')
      const extraRecords = parse(extrasContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      })

      console.log(`[IMPORT-COMPLETE-HISTORY] Parsed ${extraRecords.length} extra records`)

      const batchSize = 500
      for (let i = 0; i < extraRecords.length; i += batchSize) {
        const batch = extraRecords.slice(i, i + batchSize)
        
        for (const record of batch) {
          try {
            if (!record._ID || !record._ID_Document) continue

            await sql`
              INSERT INTO document_extras (
                id, document_id, extra_type, description, amount, tax_rate
              ) VALUES (
                ${record._ID.trim()},
                ${record._ID_Document.trim()},
                ${record.Type?.trim() || null},
                ${record.Description?.trim() || null},
                ${parseAmount(record.Amount)},
                ${parseAmount(record.TaxRate)}
              )
              ON CONFLICT (id) DO NOTHING
            `
            extrasImported++

          } catch (error) {
            errors++
          }
        }

        if ((i + batchSize) % 2000 === 0 || i + batchSize >= extraRecords.length) {
          console.log(`[IMPORT-COMPLETE-HISTORY] Extras: ${Math.min(i + batchSize, extraRecords.length)}/${extraRecords.length} processed (${extrasImported} imported)`)
        }
      }

    } catch (error) {
      console.error("[IMPORT-COMPLETE-HISTORY] Error importing extras:", error)
    }

    // 4. Import Receipts
    console.log("[IMPORT-COMPLETE-HISTORY] Step 4: Importing receipts...")
    
    try {
      const receiptsContent = fs.readFileSync(files.receipts, 'utf-8')
      const receiptRecords = parse(receiptsContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ',',
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      })

      console.log(`[IMPORT-COMPLETE-HISTORY] Parsed ${receiptRecords.length} receipt records`)

      const batchSize = 500
      for (let i = 0; i < receiptRecords.length; i += batchSize) {
        const batch = receiptRecords.slice(i, i + batchSize)
        
        for (const record of batch) {
          try {
            if (!record._ID || !record._ID_Document) continue

            const paymentDate = parseDate(record.Date)
            const reconciledDate = parseDate(record.Reconciled_Date)

            await sql`
              INSERT INTO document_receipts (
                id, document_id, amount, payment_date, payment_method,
                description, reconciled, reconciled_date
              ) VALUES (
                ${record._ID.trim()},
                ${record._ID_Document.trim()},
                ${parseAmount(record.Amount)},
                ${paymentDate},
                ${record.Method?.trim() || null},
                ${record.Description?.trim() || null},
                ${record.Reconciled === 'TRUE' || record.Reconciled === '1'},
                ${reconciledDate}
              )
              ON CONFLICT (id) DO NOTHING
            `
            receiptsImported++

          } catch (error) {
            errors++
          }
        }

        if ((i + batchSize) % 2000 === 0 || i + batchSize >= receiptRecords.length) {
          console.log(`[IMPORT-COMPLETE-HISTORY] Receipts: ${Math.min(i + batchSize, receiptRecords.length)}/${receiptRecords.length} processed (${receiptsImported} imported)`)
        }
      }

    } catch (error) {
      console.error("[IMPORT-COMPLETE-HISTORY] Error importing receipts:", error)
    }

    // 5. Update customer last contact dates
    console.log("[IMPORT-COMPLETE-HISTORY] Step 5: Updating customer contact dates...")
    
    await sql`
      UPDATE customers 
      SET last_contact_date = (
        SELECT MAX(document_date) 
        FROM customer_documents 
        WHERE customer_documents.customer_id = customers.id
        AND document_date IS NOT NULL
      )
      WHERE id IN (
        SELECT DISTINCT customer_id 
        FROM customer_documents 
        WHERE customer_id IS NOT NULL
      )
    `

    // 6. Generate comprehensive statistics
    console.log("[IMPORT-COMPLETE-HISTORY] Step 6: Generating statistics...")
    
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customer_documents) as total_documents,
        (SELECT COUNT(*) FROM document_line_items) as total_line_items,
        (SELECT COUNT(*) FROM document_extras) as total_extras,
        (SELECT COUNT(*) FROM document_receipts) as total_receipts,
        (SELECT COUNT(DISTINCT customer_id) FROM customer_documents WHERE customer_id IS NOT NULL) as unique_customers,
        (SELECT COUNT(DISTINCT vehicle_registration) FROM customer_documents WHERE vehicle_registration IS NOT NULL) as unique_vehicles,
        (SELECT MIN(document_date) FROM customer_documents WHERE document_date IS NOT NULL) as earliest_date,
        (SELECT MAX(document_date) FROM customer_documents WHERE document_date IS NOT NULL) as latest_date,
        (SELECT SUM(total_gross) FROM customer_documents WHERE total_gross IS NOT NULL) as total_revenue,
        (SELECT SUM(amount) FROM document_receipts WHERE amount IS NOT NULL) as total_payments
    `

    const customerActivity = await sql`
      SELECT 
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as very_recent,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '1 year' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as recent,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '2 years' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as moderate,
        COUNT(CASE WHEN last_contact_date >= CURRENT_DATE - INTERVAL '5 years' 
                   AND last_contact_date < CURRENT_DATE - INTERVAL '2 years' THEN 1 END) as old,
        COUNT(CASE WHEN last_contact_date < CURRENT_DATE - INTERVAL '5 years' THEN 1 END) as very_old,
        COUNT(CASE WHEN last_contact_date IS NULL THEN 1 END) as no_activity
      FROM customers
    `

    const topCustomers = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        c.twilio_phone,
        COUNT(d.id) as document_count,
        SUM(d.total_gross) as total_spent,
        MAX(d.document_date) as last_visit,
        COUNT(DISTINCT d.vehicle_registration) as vehicles_serviced
      FROM customers c
      INNER JOIN customer_documents d ON c.id = d.customer_id
      WHERE d.total_gross IS NOT NULL
      GROUP BY c.id, c.first_name, c.last_name, c.twilio_phone
      ORDER BY SUM(d.total_gross) DESC
      LIMIT 20
    `

    const finalStats = stats[0]
    const activity = customerActivity[0]

    return NextResponse.json({
      success: true,
      message: "Complete document history import completed successfully",
      importResults: {
        documentsImported,
        lineItemsImported,
        extrasImported,
        receiptsImported,
        totalErrors: errors
      },
      statistics: {
        totalDocuments: parseInt(finalStats.total_documents),
        totalLineItems: parseInt(finalStats.total_line_items),
        totalExtras: parseInt(finalStats.total_extras),
        totalReceipts: parseInt(finalStats.total_receipts),
        uniqueCustomers: parseInt(finalStats.unique_customers),
        uniqueVehicles: parseInt(finalStats.unique_vehicles),
        earliestDate: finalStats.earliest_date,
        latestDate: finalStats.latest_date,
        totalRevenue: parseFloat(finalStats.total_revenue) || 0,
        totalPayments: parseFloat(finalStats.total_payments) || 0
      },
      customerActivity: {
        veryRecent: parseInt(activity.very_recent), // Last 6 months
        recent: parseInt(activity.recent), // 6 months - 1 year
        moderate: parseInt(activity.moderate), // 1-2 years
        old: parseInt(activity.old), // 2-5 years
        veryOld: parseInt(activity.very_old), // 5+ years
        noActivity: parseInt(activity.no_activity) // No documents
      },
      topCustomers: topCustomers.slice(0, 10),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-COMPLETE-HISTORY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import complete document history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Helper functions
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  try {
    const date = new Date(dateStr.trim())
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function parseAmount(amountStr: string | null | undefined): number | null {
  if (!amountStr || amountStr.trim() === '') return null
  try {
    const cleaned = amountStr.replace(/[£$,]/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  } catch {
    return null
  }
}
