import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-ALL-CUSTOMERS] Starting comprehensive customer import...")

    const filePath = '/Users/adamrutstein/v0dashboard-2/data/Customers.csv'
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: "Customers.csv file not found",
        filePath
      }, { status: 404 })
    }

    // Read and parse CSV with more robust settings
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
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
        skip_records_with_error: false, // Don't skip errors, handle them
        cast: false,
        ltrim: true,
        rtrim: true
      })
    } catch (parseError) {
      console.error("[IMPORT-ALL-CUSTOMERS] CSV Parse Error:", parseError)
      return NextResponse.json({
        success: false,
        error: "Failed to parse CSV file",
        details: parseError instanceof Error ? parseError.message : "Unknown parse error"
      }, { status: 400 })
    }

    console.log(`[IMPORT-ALL-CUSTOMERS] Successfully parsed ${records.length} customer records`)

    let imported = 0
    let skipped = 0
    let errors = 0
    let duplicates = 0

    // Clear existing customers first (optional - comment out if you want to keep existing)
    // await sql`DELETE FROM customers`

    // Process customers in smaller batches for better error handling
    const batchSize = 25
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
            company_name: (record.nameCompany || '').trim(),
            account_number: (record.AccountNumber || '').trim()
          }

          // Debug first few records
          if (imported < 5) {
            console.log(`[IMPORT-ALL-CUSTOMERS] Sample record ${imported + 1}:`, {
              id: customer.id,
              name: `${customer.first_name} ${customer.last_name}`.trim(),
              email: customer.email,
              phone: customer.phone,
              address: customer.address_line1,
              city: customer.city,
              postcode: customer.postcode
            })
          }

          // Insert customer (handle duplicates gracefully)
          try {
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
          } catch (insertError) {
            if (insertError instanceof Error && insertError.message.includes('duplicate key')) {
              duplicates++
            } else {
              throw insertError
            }
          }

        } catch (error) {
          console.error(`[IMPORT-ALL-CUSTOMERS] Error importing customer ${record._ID}:`, error)
          errors++
        }
      }

      // Log progress every 500 records
      if ((i + batchSize) % 500 === 0 || i + batchSize >= records.length) {
        console.log(`[IMPORT-ALL-CUSTOMERS] Processed ${Math.min(i + batchSize, records.length)}/${records.length} records... (Imported: ${imported}, Errors: ${errors})`)
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(finalCount[0].count)

    // Get sample customers to verify
    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, email, phone, city
      FROM customers 
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      message: "Comprehensive customer import completed",
      results: {
        totalRecordsInFile: records.length,
        imported,
        skipped,
        errors,
        duplicates,
        totalCustomersInDatabase: totalCustomers,
        importRate: Math.round((imported / records.length) * 100)
      },
      sampleCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ALL-CUSTOMERS] Error:", error)
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
