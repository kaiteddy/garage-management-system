import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST(request: Request) {
  try {
    const { table = 'documents', limit = 5000 } = await request.json().catch(() => ({}))
    
    console.log(`[IMPORT-DIRECT] Starting direct import for ${table} with limit ${limit}`)

    const basePath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports'
    
    if (table === 'documents') {
      return await importDocumentsDirect(basePath, limit)
    } else if (table === 'lineitems') {
      return await importLineItemsDirect(basePath, limit)
    } else if (table === 'extras') {
      return await importExtrasDirect(basePath, limit)
    } else if (table === 'receipts') {
      return await importReceiptsDirect(basePath, limit)
    } else {
      return NextResponse.json({ success: false, error: "Invalid table" }, { status: 400 })
    }

  } catch (error) {
    console.error("[IMPORT-DIRECT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import directly",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

async function importDocumentsDirect(basePath: string, limit: number) {
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT fk_custdoc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `

  // Clear existing data
  await sql`DELETE FROM customer_documents`

  // Read file and process line by line
  const fileContent = fs.readFileSync(documentsPath, 'utf-8')
  const lines = fileContent.split('\n')
  
  console.log(`[IMPORT-DIRECT] Processing ${Math.min(limit, lines.length - 1)} document lines`)

  // Get header
  const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim())
  const idIndex = header.indexOf('_ID')
  const customerIdIndex = header.indexOf('_ID_Customer')
  const vehicleIndex = header.indexOf('vehRegistration')
  const typeIndex = header.indexOf('docType')
  const numberIndex = header.indexOf('docNumber_Invoice')
  const dateIndex = header.indexOf('docDate_Created')
  const dueDateIndex = header.indexOf('docDate_DueBy')
  const grossIndex = header.indexOf('us_TotalGROSS')
  const netIndex = header.indexOf('us_TotalNET')
  const taxIndex = header.indexOf('us_TotalTAX')
  const statusIndex = header.indexOf('docStatus')
  const deptIndex = header.indexOf('docDepartment')

  let imported = 0
  let skipped = 0
  let errors = 0

  // Process lines
  const maxLines = Math.min(limit + 1, lines.length)
  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing
      const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
      
      const docId = fields[idIndex]
      const customerId = fields[customerIdIndex]

      if (!docId || !customerId) {
        skipped++
        continue
      }

      // Parse date
      let docDate = null
      if (fields[dateIndex]) {
        try {
          docDate = new Date(fields[dateIndex])
          if (isNaN(docDate.getTime())) docDate = null
        } catch (e) {
          docDate = null
        }
      }

      // Parse amounts
      const parseAmount = (field: string) => {
        if (!field) return null
        const cleaned = field.replace(/[£$,]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      await sql`
        INSERT INTO customer_documents (
          id, customer_id, vehicle_registration, document_type, document_number,
          document_date, total_gross, total_net, total_tax, status, department
        ) VALUES (
          ${docId},
          ${customerId},
          ${fields[vehicleIndex] || null},
          ${fields[typeIndex] || null},
          ${fields[numberIndex] || null},
          ${docDate},
          ${parseAmount(fields[grossIndex])},
          ${parseAmount(fields[netIndex])},
          ${parseAmount(fields[taxIndex])},
          ${fields[statusIndex] || null},
          ${fields[deptIndex] || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          updated_at = NOW()
      `
      imported++

      if (imported % 500 === 0) {
        console.log(`[IMPORT-DIRECT] Imported ${imported} documents...`)
      }

    } catch (error) {
      errors++
      if (errors < 10) {
        console.error(`[IMPORT-DIRECT] Error on line ${i}:`, error)
      }
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM customer_documents`

  return NextResponse.json({
    success: true,
    table: 'documents',
    results: {
      linesProcessed: maxLines - 1,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    }
  })
}

async function importLineItemsDirect(basePath: string, limit: number) {
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
  const lines = fileContent.split('\n')
  
  console.log(`[IMPORT-DIRECT] Processing ${Math.min(limit, lines.length - 1)} line item lines`)

  const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim())
  const idIndex = header.indexOf('_ID')
  const docIdIndex = header.indexOf('_ID_Document')
  const typeIndex = header.indexOf('Type')
  const descIndex = header.indexOf('Description')
  const qtyIndex = header.indexOf('Qty')
  const unitPriceIndex = header.indexOf('UnitPrice')
  const totalPriceIndex = header.indexOf('TotalPrice')
  const taxRateIndex = header.indexOf('TaxRate')

  let imported = 0
  let skipped = 0
  let errors = 0

  const maxLines = Math.min(limit + 1, lines.length)
  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
      
      const itemId = fields[idIndex]
      const docId = fields[docIdIndex]

      if (!itemId || !docId) {
        skipped++
        continue
      }

      const parseAmount = (field: string) => {
        if (!field) return null
        const cleaned = field.replace(/[£$,]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      await sql`
        INSERT INTO document_line_items (
          id, document_id, item_type, description, quantity,
          unit_price, total_price, tax_rate
        ) VALUES (
          ${itemId},
          ${docId},
          ${fields[typeIndex] || null},
          ${fields[descIndex] || null},
          ${parseAmount(fields[qtyIndex])},
          ${parseAmount(fields[unitPriceIndex])},
          ${parseAmount(fields[totalPriceIndex])},
          ${parseAmount(fields[taxRateIndex])}
        )
        ON CONFLICT (id) DO NOTHING
      `
      imported++

      if (imported % 1000 === 0) {
        console.log(`[IMPORT-DIRECT] Imported ${imported} line items...`)
      }

    } catch (error) {
      errors++
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as count FROM document_line_items`

  return NextResponse.json({
    success: true,
    table: 'lineitems',
    results: {
      linesProcessed: maxLines - 1,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    }
  })
}

async function importExtrasDirect(basePath: string, limit: number) {
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
  const lines = fileContent.split('\n')
  
  console.log(`[IMPORT-DIRECT] Processing ${Math.min(limit, lines.length - 1)} extras lines`)

  const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim())
  const idIndex = header.indexOf('_ID')
  const docIdIndex = header.indexOf('_ID_Document')
  const typeIndex = header.indexOf('Type')
  const descIndex = header.indexOf('Description')
  const amountIndex = header.indexOf('Amount')
  const taxRateIndex = header.indexOf('TaxRate')

  let imported = 0
  let skipped = 0
  let errors = 0

  const maxLines = Math.min(limit + 1, lines.length)
  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
      
      const extraId = fields[idIndex]
      const docId = fields[docIdIndex]

      if (!extraId || !docId) {
        skipped++
        continue
      }

      const parseAmount = (field: string) => {
        if (!field) return null
        const cleaned = field.replace(/[£$,]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      await sql`
        INSERT INTO document_extras (
          id, document_id, extra_type, description, amount, tax_rate
        ) VALUES (
          ${extraId},
          ${docId},
          ${fields[typeIndex] || null},
          ${fields[descIndex] || null},
          ${parseAmount(fields[amountIndex])},
          ${parseAmount(fields[taxRateIndex])}
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
    table: 'extras',
    results: {
      linesProcessed: maxLines - 1,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    }
  })
}

async function importReceiptsDirect(basePath: string, limit: number) {
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
  const lines = fileContent.split('\n')
  
  console.log(`[IMPORT-DIRECT] Processing ${Math.min(limit, lines.length - 1)} receipts lines`)

  const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim())
  const idIndex = header.indexOf('_ID')
  const docIdIndex = header.indexOf('_ID_Document')
  const amountIndex = header.indexOf('Amount')
  const dateIndex = header.indexOf('Date')
  const methodIndex = header.indexOf('Method')
  const descIndex = header.indexOf('Description')
  const reconciledIndex = header.indexOf('Reconciled')

  let imported = 0
  let skipped = 0
  let errors = 0

  const maxLines = Math.min(limit + 1, lines.length)
  for (let i = 1; i < maxLines; i++) {
    try {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
      
      const receiptId = fields[idIndex]
      const docId = fields[docIdIndex]

      if (!receiptId || !docId) {
        skipped++
        continue
      }

      // Parse date
      let paymentDate = null
      if (fields[dateIndex]) {
        try {
          paymentDate = new Date(fields[dateIndex])
          if (isNaN(paymentDate.getTime())) paymentDate = null
        } catch (e) {
          paymentDate = null
        }
      }

      const parseAmount = (field: string) => {
        if (!field) return null
        const cleaned = field.replace(/[£$,]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      await sql`
        INSERT INTO document_receipts (
          id, document_id, amount, payment_date, payment_method,
          description, reconciled
        ) VALUES (
          ${receiptId},
          ${docId},
          ${parseAmount(fields[amountIndex])},
          ${paymentDate},
          ${fields[methodIndex] || null},
          ${fields[descIndex] || null},
          ${fields[reconciledIndex] === 'TRUE' || fields[reconciledIndex] === '1'}
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
    table: 'receipts',
    results: {
      linesProcessed: maxLines - 1,
      imported,
      skipped,
      errors,
      finalCount: parseInt(finalCount[0].count)
    }
  })
}
