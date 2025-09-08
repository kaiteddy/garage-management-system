import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-REAL-CUSTOMERS] Starting import of real customers from Customers.csv...")

    const filePath = '/Users/adamrutstein/v0dashboard-2/data/Customers.csv'

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: "Customers.csv file not found",
        filePath
      }, { status: 404 })
    }

    // Read and parse CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '\\',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true
    })

    console.log(`[IMPORT-REAL-CUSTOMERS] Found ${records.length} customer records`)

    let imported = 0
    let skipped = 0
    let errors = 0

    // Process customers in batches
    const batchSize = 50
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      for (const record of batch) {
        try {
          // Skip if no ID
          if (!record._ID || record._ID.trim() === '') {
            skipped++
            continue
          }

          // Prepare customer data
          const customer = {
            id: record._ID.trim(),
            first_name: record.nameForename?.trim() || null,
            last_name: record.nameSurname?.trim() || null,
            email: record.contactEmail?.trim() || null,
            phone: record.contactTelephone?.trim() || record.contactMobile?.trim() || null,
            address_line1: [record.addressHouseNo, record.addressRoad].filter(Boolean).join(' ').trim() || null,
            city: record.addressTown?.trim() || null,
            postcode: record.addressPostCode?.trim() || null,
            company_name: record.nameCompany?.trim() || null,
            account_number: record.AccountNumber?.trim() || null
          }

          // Debug first few records
          if (imported < 3) {
            console.log(`[IMPORT-REAL-CUSTOMERS] Sample record ${imported + 1}:`, {
              _ID: record._ID,
              nameForename: record.nameForename,
              nameSurname: record.nameSurname,
              contactEmail: record.contactEmail,
              customer
            })
          }

          // Insert customer (only if we have required data)
          if (customer.first_name || customer.last_name || customer.company_name) {
            await sql`
              INSERT INTO customers (
                id, first_name, last_name, email, phone,
                address_line1, city, postcode
              ) VALUES (
                ${customer.id},
                ${customer.first_name || ''},
                ${customer.last_name || ''},
                ${customer.email || ''},
                ${customer.phone},
                ${customer.address_line1},
                ${customer.city},
                ${customer.postcode}
              )
              ON CONFLICT (id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                address_line1 = EXCLUDED.address_line1,
                city = EXCLUDED.city,
                postcode = EXCLUDED.postcode,
                updated_at = NOW()
            `
            imported++
          } else {
            skipped++
          }

        } catch (error) {
          console.error(`[IMPORT-REAL-CUSTOMERS] Error importing customer ${record._ID}:`, error)
          errors++
        }
      }

      // Log progress
      console.log(`[IMPORT-REAL-CUSTOMERS] Processed ${Math.min(i + batchSize, records.length)}/${records.length} records...`)
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(finalCount[0].count)

    return NextResponse.json({
      success: true,
      message: "Customer import completed",
      results: {
        totalRecords: records.length,
        imported,
        skipped,
        errors,
        totalCustomers
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-REAL-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
