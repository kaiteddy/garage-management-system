import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[FRESH-CUSTOMER-IMPORT] Starting fresh import of all customers...")

    const filePath = '/Users/adamrutstein/v0dashboard-2/data/Customers.csv'
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: "Customers.csv file not found",
        filePath
      }, { status: 404 })
    }

    // First, clear all existing customers and reset vehicle connections
    console.log("[FRESH-CUSTOMER-IMPORT] Clearing existing customer data...")
    await sql`UPDATE vehicles SET owner_id = NULL WHERE owner_id IS NOT NULL`
    await sql`DELETE FROM customers`
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: false
    })

    console.log(`[FRESH-CUSTOMER-IMPORT] Successfully parsed ${records.length} customer records`)

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

          // Clean and prepare customer data
          const customer = {
            id: record._ID.trim(),
            first_name: (record.nameForename || '').trim(),
            last_name: (record.nameSurname || '').trim(),
            email: (record.contactEmail || '').trim(),
            phone: (record.contactTelephone || record.contactMobile || '').trim(),
            address_line1: [
              (record.addressHouseNo || '').trim(),
              (record.addressRoad || '').trim()
            ].filter(Boolean).join(' ').trim(),
            city: (record.addressTown || '').trim(),
            postcode: (record.addressPostCode || '').trim(),
            company_name: (record.nameCompany || '').trim()
          }

          // Only import if we have some meaningful data
          if (customer.first_name || customer.last_name || customer.company_name || customer.email) {
            await sql`
              INSERT INTO customers (
                id, first_name, last_name, email, phone, 
                address_line1, city, postcode
              ) VALUES (
                ${customer.id},
                ${customer.first_name || ''},
                ${customer.last_name || ''},
                ${customer.email || ''},
                ${customer.phone || null},
                ${customer.address_line1 || null},
                ${customer.city || null},
                ${customer.postcode || null}
              )
            `
            imported++
          } else {
            skipped++
          }

        } catch (error) {
          console.error(`[FRESH-CUSTOMER-IMPORT] Error importing customer ${record._ID}:`, error)
          errors++
        }
      }

      // Log progress every 1000 records
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= records.length) {
        console.log(`[FRESH-CUSTOMER-IMPORT] Processed ${Math.min(i + batchSize, records.length)}/${records.length} records... (Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors})`)
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(finalCount[0].count)

    // Get sample customers to verify
    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, email, phone, city
      FROM customers 
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Fresh customer import completed",
      results: {
        totalRecordsInFile: records.length,
        imported,
        skipped,
        errors,
        totalCustomersInDatabase: totalCustomers,
        importRate: Math.round((imported / records.length) * 100)
      },
      sampleCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FRESH-CUSTOMER-IMPORT] Error:", error)
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
