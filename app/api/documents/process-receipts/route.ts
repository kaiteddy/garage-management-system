import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[PROCESS-RECEIPTS] Processing receipts to analyze customer activity...")

    const receiptsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Receipts.csv'
    const documentsPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Documents.csv'

    // Check if file exists
    if (!fs.existsSync(receiptsPath)) {
      return NextResponse.json({
        success: false,
        error: "Receipts.csv file not found",
        path: receiptsPath
      }, { status: 404 })
    }

    // Create receipts table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        receipt_date DATE,
        total_amount DECIMAL(10,2),
        payment_method TEXT,
        status TEXT,
        vehicle_registration TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `

    // Read and parse CSV
    const fileContent = fs.readFileSync(receiptsPath, 'utf-8')
    const lines = fileContent.split('\n')

    console.log(`[PROCESS-RECEIPTS] Processing ${lines.length} lines`)

    // Get header and find column positions
    const headerLine = lines[0]
    const headerFields = headerLine.split(',')

    console.log(`[PROCESS-RECEIPTS] Header fields: ${headerFields.slice(0, 10).join(', ')}...`)

    const findColumnIndex = (columnName: string) => {
      return headerFields.findIndex(field =>
        field.toLowerCase().replace(/"/g, '').trim().includes(columnName.toLowerCase())
      )
    }

    const columnIndices = {
      id: findColumnIndex('_id'),
      customerId: findColumnIndex('customer'),
      date: findColumnIndex('date'),
      amount: findColumnIndex('total') || findColumnIndex('amount'),
      payment: findColumnIndex('payment'),
      status: findColumnIndex('status'),
      vehicle: findColumnIndex('vehicle') || findColumnIndex('registration'),
      description: findColumnIndex('description') || findColumnIndex('notes')
    }

    console.log('[PROCESS-RECEIPTS] Column indices:', columnIndices)

    let imported = 0
    let skipped = 0
    let errors = 0

    // Clear existing receipts
    await sql`DELETE FROM receipts`

    // Process each data line
    for (let i = 1; i < Math.min(lines.length, 5000); i++) { // Limit to first 5000 for testing
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Parse CSV line
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

        // Extract receipt data
        const receiptId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : ''
        const customerId = fields[columnIndices.customerId] ? fields[columnIndices.customerId].replace(/"/g, '').trim() : ''

        if (!receiptId || receiptId.length < 5) {
          skipped++
          continue
        }

        // Parse date
        let receiptDate = null
        if (fields[columnIndices.date]) {
          const dateStr = fields[columnIndices.date].replace(/"/g, '').trim()
          if (dateStr) {
            try {
              // Try different date formats
              if (dateStr.includes('/')) {
                const parts = dateStr.split('/')
                if (parts.length === 3) {
                  receiptDate = new Date(parts[2], parts[1] - 1, parts[0]) // DD/MM/YYYY
                }
              } else if (dateStr.includes('-')) {
                receiptDate = new Date(dateStr)
              }
            } catch (e) {
              // Invalid date, skip
            }
          }
        }

        // Parse amount
        let amount = null
        if (fields[columnIndices.amount]) {
          const amountStr = fields[columnIndices.amount].replace(/"/g, '').replace(/[£$,]/g, '').trim()
          if (amountStr && !isNaN(parseFloat(amountStr))) {
            amount = parseFloat(amountStr)
          }
        }

        const receipt = {
          id: receiptId,
          customer_id: customerId || null,
          receipt_date: receiptDate,
          total_amount: amount,
          payment_method: fields[columnIndices.payment] ? fields[columnIndices.payment].replace(/"/g, '').trim() : null,
          status: fields[columnIndices.status] ? fields[columnIndices.status].replace(/"/g, '').trim() : null,
          vehicle_registration: fields[columnIndices.vehicle] ? fields[columnIndices.vehicle].replace(/"/g, '').trim() : null,
          description: fields[columnIndices.description] ? fields[columnIndices.description].replace(/"/g, '').trim() : null
        }

        // Import receipt
        await sql`
          INSERT INTO receipts (
            id, customer_id, receipt_date, total_amount, payment_method,
            status, vehicle_registration, description
          ) VALUES (
            ${receipt.id},
            ${receipt.customer_id},
            ${receipt.receipt_date},
            ${receipt.total_amount},
            ${receipt.payment_method},
            ${receipt.status},
            ${receipt.vehicle_registration},
            ${receipt.description}
          )
          ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            receipt_date = EXCLUDED.receipt_date,
            total_amount = EXCLUDED.total_amount,
            updated_at = NOW()
        `
        imported++

        if (imported % 500 === 0) {
          console.log(`[PROCESS-RECEIPTS] Imported ${imported} receipts...`)
        }

      } catch (error) {
        errors++
        if (errors <= 10) {
          console.error(`[PROCESS-RECEIPTS] Error on line ${i + 1}:`, error)
        }
      }
    }

    // Get statistics
    const receiptStats = await sql`
      SELECT
        COUNT(*) as total_receipts,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as with_customer,
        COUNT(CASE WHEN receipt_date IS NOT NULL THEN 1 END) as with_date,
        COUNT(CASE WHEN total_amount IS NOT NULL THEN 1 END) as with_amount,
        MIN(receipt_date) as earliest_date,
        MAX(receipt_date) as latest_date,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_amount
      FROM receipts
    `

    // Get recent customer activity
    const recentActivity = await sql`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.twilio_phone,
        COUNT(r.id) as receipt_count,
        MAX(r.receipt_date) as last_receipt_date,
        SUM(r.total_amount) as total_spent
      FROM customers c
      INNER JOIN receipts r ON c.id = r.customer_id
      WHERE r.receipt_date >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.twilio_phone
      ORDER BY MAX(r.receipt_date) DESC
      LIMIT 20
    `

    // Update customer last_contact_date based on receipts
    await sql`
      UPDATE customers
      SET last_contact_date = (
        SELECT MAX(receipt_date)
        FROM receipts
        WHERE receipts.customer_id = customers.id
      )
      WHERE id IN (
        SELECT DISTINCT customer_id
        FROM receipts
        WHERE customer_id IS NOT NULL
      )
    `

    const stats = receiptStats[0]

    return NextResponse.json({
      success: true,
      message: "Receipts processed successfully",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors
      },
      statistics: {
        totalReceipts: parseInt(stats.total_receipts),
        withCustomer: parseInt(stats.with_customer),
        withDate: parseInt(stats.with_date),
        withAmount: parseInt(stats.with_amount),
        earliestDate: stats.earliest_date,
        latestDate: stats.latest_date,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        averageAmount: parseFloat(stats.average_amount) || 0,
        customerLinkRate: Math.round((parseInt(stats.with_customer) / parseInt(stats.total_receipts)) * 100)
      },
      recentActivity: recentActivity.slice(0, 10),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PROCESS-RECEIPTS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process receipts",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
