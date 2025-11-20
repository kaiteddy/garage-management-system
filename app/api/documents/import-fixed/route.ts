import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST(request: Request) {
  try {
    const { step = 'documents' } = await request.json().catch(() => ({}))
    
    console.log(`[IMPORT-FIXED] Starting fixed import for ${step}`)

    const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports'
    
    if (step === 'documents') {
      return await importDocumentsFixed(basePath)
    } else if (step === 'lineitems') {
      return await importLineItemsFixed(basePath)
    } else if (step === 'extras') {
      return await importExtrasFixed(basePath)
    } else if (step === 'receipts') {
      return await importReceiptsFixed(basePath)
    } else if (step === 'finalize') {
      return await finalizeImportFixed()
    } else {
      return NextResponse.json({ success: false, error: "Invalid step" }, { status: 400 })
    }

  } catch (error) {
    console.error("[IMPORT-FIXED] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function importDocumentsFixed(basePath: string) {
  const documentsPath = `${basePath}/Documents.csv`
  
  if (!fs.existsSync(documentsPath)) {
    return NextResponse.json({ success: false, error: "Documents.csv not found" }, { status: 404 })
  }

  // Ensure table exists
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
      balance DECIMAL(12,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_custdoc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `

  // Clear existing data
  await sql`DELETE FROM customer_documents`

  // Read and parse CSV properly
  const fileContent = fs.readFileSync(documentsPath, 'utf-8')
  
  let records
  try {
    records = parse(fileContent, {
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
  } catch (parseError) {
    console.error("[IMPORT-FIXED] CSV Parse Error:", parseError)
    return NextResponse.json({
      success: false,
      error: "Failed to parse Documents CSV",
      details: parseError instanceof Error ? parseError.message : "Unknown parse error"
    }, { status: 400 })
  }

  console.log(`[IMPORT-FIXED] Successfully parsed ${records.length} document records`)

  let imported = 0
  let skipped = 0
  let errors = 0

  // Process first 10,000 records for performance
  const maxRecords = Math.min(records.length, 10000)
  
  for (let i = 0; i < maxRecords; i++) {
    const record = records[i]
    
    try {
      // Skip if no ID or customer ID
      if (!record._ID || !record._ID_Customer) {
        skipped++
        continue
      }

      const docId = record._ID.trim()
      const customerId = record._ID_Customer.trim()

      // Parse dates
      const parseDate = (dateStr: string) => {
        if (!dateStr || dateStr.trim() === '') return null
        try {
          const date = new Date(dateStr.trim())
          return isNaN(date.getTime()) ? null : date
        } catch {
          return null
        }
      }

      // Parse amounts
      const parseAmount = (amountStr: string) => {
        if (!amountStr || amountStr.trim() === '') return null
        try {
          const cleaned = amountStr.replace(/[£$,]/g, '').trim()
          const num = parseFloat(cleaned)
          return isNaN(num) ? null : num
        } catch {
          return null
        }
      }

      const docDate = parseDate(record.docDate_Created)
      const dueDate = parseDate(record.docDate_DueBy)

      await sql`
        INSERT INTO customer_documents (
          id, customer_id, vehicle_registration, document_type, document_number,
          document_date, due_date, total_gross, total_net, total_tax,
          status, department, balance
        ) VALUES (
          ${docId},
          ${customerId},
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
          ${parseAmount(record.us_Balance)}
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          vehicle_registration = EXCLUDED.vehicle_registration,
          updated_at = NOW()
      `
      imported++

      if (imported % 1000 === 0) {
        console.log(`[IMPORT-FIXED] Imported ${imported} documents...`)
      }

    } catch (error) {
      errors++
      if (errors < 10) {
        console.error(`[IMPORT-FIXED] Error importing document ${record._ID}:`, error)
      }
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM customer_documents`

  return NextResponse.json({
    success: true,
    step: 'documents',
    results: {
      totalRecords: maxRecords,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    },
    nextStep: 'lineitems'
  })
}

async function importLineItemsFixed(basePath: string) {
  const lineItemsPath = `${basePath}/LineItems.csv`
  
  if (!fs.existsSync(lineItemsPath)) {
    return NextResponse.json({ success: false, error: "LineItems.csv not found" }, { status: 404 })
  }

  // Ensure table exists
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_lineitem_document FOREIGN KEY (document_id) REFERENCES customer_documents(id) ON DELETE CASCADE
    )
  `

  await sql`DELETE FROM document_line_items`

  const fileContent = fs.readFileSync(lineItemsPath, 'utf-8')
  
  let records
  try {
    records = parse(fileContent, {
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
  } catch (parseError) {
    return NextResponse.json({
      success: false,
      error: "Failed to parse LineItems CSV",
      details: parseError instanceof Error ? parseError.message : "Unknown parse error"
    }, { status: 400 })
  }

  console.log(`[IMPORT-FIXED] Successfully parsed ${records.length} line item records`)

  let imported = 0
  let skipped = 0
  let errors = 0

  // Process first 20,000 records
  const maxRecords = Math.min(records.length, 20000)
  
  for (let i = 0; i < maxRecords; i++) {
    const record = records[i]
    
    try {
      if (!record._ID || !record._ID_Document) {
        skipped++
        continue
      }

      const parseAmount = (amountStr: string) => {
        if (!amountStr || amountStr.trim() === '') return null
        try {
          const cleaned = amountStr.replace(/[£$,]/g, '').trim()
          const num = parseFloat(cleaned)
          return isNaN(num) ? null : num
        } catch {
          return null
        }
      }

      await sql`
        INSERT INTO document_line_items (
          id, document_id, item_type, description, quantity,
          unit_price, total_price, tax_rate
        ) VALUES (
          ${record._ID.trim()},
          ${record._ID_Document.trim()},
          ${record.Type?.trim() || null},
          ${record.Description?.trim() || null},
          ${parseAmount(record.Qty)},
          ${parseAmount(record.UnitPrice)},
          ${parseAmount(record.TotalPrice)},
          ${parseAmount(record.TaxRate)}
        )
        ON CONFLICT (id) DO NOTHING
      `
      imported++

      if (imported % 2000 === 0) {
        console.log(`[IMPORT-FIXED] Imported ${imported} line items...`)
      }

    } catch (error) {
      errors++
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM document_line_items`

  return NextResponse.json({
    success: true,
    step: 'lineitems',
    results: {
      totalRecords: maxRecords,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    },
    nextStep: 'extras'
  })
}

async function importExtrasFixed(basePath: string) {
  const extrasPath = `${basePath}/Document_Extras.csv`
  
  if (!fs.existsSync(extrasPath)) {
    return NextResponse.json({ success: false, error: "Document_Extras.csv not found" }, { status: 404 })
  }

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

  await sql`DELETE FROM document_extras`

  const fileContent = fs.readFileSync(extrasPath, 'utf-8')
  
  let records
  try {
    records = parse(fileContent, {
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
  } catch (parseError) {
    return NextResponse.json({
      success: false,
      error: "Failed to parse Document_Extras CSV",
      details: parseError instanceof Error ? parseError.message : "Unknown parse error"
    }, { status: 400 })
  }

  console.log(`[IMPORT-FIXED] Successfully parsed ${records.length} extras records`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    try {
      if (!record._ID || !record._ID_Document) {
        skipped++
        continue
      }

      const parseAmount = (amountStr: string) => {
        if (!amountStr || amountStr.trim() === '') return null
        try {
          const cleaned = amountStr.replace(/[£$,]/g, '').trim()
          const num = parseFloat(cleaned)
          return isNaN(num) ? null : num
        } catch {
          return null
        }
      }

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
      imported++

    } catch (error) {
      errors++
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM document_extras`

  return NextResponse.json({
    success: true,
    step: 'extras',
    results: {
      totalRecords: records.length,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    },
    nextStep: 'receipts'
  })
}

async function importReceiptsFixed(basePath: string) {
  const receiptsPath = `${basePath}/Receipts.csv`
  
  if (!fs.existsSync(receiptsPath)) {
    return NextResponse.json({ success: false, error: "Receipts.csv not found" }, { status: 404 })
  }

  await sql`
    CREATE TABLE IF NOT EXISTS document_receipts (
      id TEXT PRIMARY KEY,
      document_id TEXT,
      amount DECIMAL(10,2),
      payment_date DATE,
      payment_method TEXT,
      description TEXT,
      reconciled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_receipt_document FOREIGN KEY (document_id) REFERENCES customer_documents(id) ON DELETE SET NULL
    )
  `

  await sql`DELETE FROM document_receipts`

  const fileContent = fs.readFileSync(receiptsPath, 'utf-8')
  
  let records
  try {
    records = parse(fileContent, {
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
  } catch (parseError) {
    return NextResponse.json({
      success: false,
      error: "Failed to parse Receipts CSV",
      details: parseError instanceof Error ? parseError.message : "Unknown parse error"
    }, { status: 400 })
  }

  console.log(`[IMPORT-FIXED] Successfully parsed ${records.length} receipt records`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    try {
      if (!record._ID || !record._ID_Document) {
        skipped++
        continue
      }

      const parseDate = (dateStr: string) => {
        if (!dateStr || dateStr.trim() === '') return null
        try {
          const date = new Date(dateStr.trim())
          return isNaN(date.getTime()) ? null : date
        } catch {
          return null
        }
      }

      const parseAmount = (amountStr: string) => {
        if (!amountStr || amountStr.trim() === '') return null
        try {
          const cleaned = amountStr.replace(/[£$,]/g, '').trim()
          const num = parseFloat(cleaned)
          return isNaN(num) ? null : num
        } catch {
          return null
        }
      }

      await sql`
        INSERT INTO document_receipts (
          id, document_id, amount, payment_date, payment_method,
          description, reconciled
        ) VALUES (
          ${record._ID.trim()},
          ${record._ID_Document.trim()},
          ${parseAmount(record.Amount)},
          ${parseDate(record.Date)},
          ${record.Method?.trim() || null},
          ${record.Description?.trim() || null},
          ${record.Reconciled === 'TRUE' || record.Reconciled === '1'}
        )
        ON CONFLICT (id) DO NOTHING
      `
      imported++

    } catch (error) {
      errors++
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM document_receipts`

  return NextResponse.json({
    success: true,
    step: 'receipts',
    results: {
      totalRecords: records.length,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    },
    nextStep: 'finalize'
  })
}

async function finalizeImportFixed() {
  console.log("[FINALIZE-IMPORT-FIXED] Generating final statistics...")

  // Get comprehensive statistics
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

  // Get sample data
  const sampleDocuments = await sql`
    SELECT 
      cd.id,
      cd.customer_id,
      c.first_name,
      c.last_name,
      cd.document_type,
      cd.document_date,
      cd.total_gross,
      cd.vehicle_registration,
      COUNT(dli.id) as line_items_count,
      COUNT(de.id) as extras_count,
      COUNT(dr.id) as receipts_count
    FROM customer_documents cd
    LEFT JOIN customers c ON cd.customer_id = c.id
    LEFT JOIN document_line_items dli ON cd.id = dli.document_id
    LEFT JOIN document_extras de ON cd.id = de.document_id
    LEFT JOIN document_receipts dr ON cd.id = dr.document_id
    WHERE cd.total_gross IS NOT NULL
    GROUP BY cd.id, cd.customer_id, c.first_name, c.last_name, cd.document_type, 
             cd.document_date, cd.total_gross, cd.vehicle_registration
    ORDER BY cd.total_gross DESC
    LIMIT 10
  `

  const finalStats = stats[0]

  return NextResponse.json({
    success: true,
    step: 'finalize',
    message: "Complete document import finished successfully!",
    finalStatistics: {
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
    sampleDocuments: sampleDocuments.slice(0, 5),
    nextStep: 'complete'
  })
}
