import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-REFERENCED-CUSTOMERS] Importing customers that are actually referenced by vehicles...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv'
    
    // First, get all customer IDs that are referenced by vehicles
    console.log("[IMPORT-REFERENCED-CUSTOMERS] Getting customer IDs referenced by vehicles...")
    const vehiclesContent = fs.readFileSync(vehiclesPath, 'utf-8')
    const vehicleRecords = parse(vehiclesContent, {
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

    const referencedCustomerIds = new Set()
    for (const record of vehicleRecords) {
      if (record._ID_Customer && record._ID_Customer.trim() !== '') {
        referencedCustomerIds.add(record._ID_Customer.trim())
      }
    }

    console.log(`[IMPORT-REFERENCED-CUSTOMERS] Found ${referencedCustomerIds.size} unique customer IDs referenced by vehicles`)

    // Now read customers CSV with more lenient parsing
    console.log("[IMPORT-REFERENCED-CUSTOMERS] Reading customers CSV with lenient parsing...")
    const customersContent = fs.readFileSync(customersPath, 'utf-8')
    
    // Try multiple parsing strategies
    let customerRecords = []
    
    // Strategy 1: Standard parsing
    try {
      customerRecords = parse(customersContent, {
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
      console.log(`[IMPORT-REFERENCED-CUSTOMERS] Standard parsing: ${customerRecords.length} records`)
    } catch (error) {
      console.log("[IMPORT-REFERENCED-CUSTOMERS] Standard parsing failed, trying alternative...")
    }

    // Strategy 2: If standard parsing didn't work well, try line-by-line parsing
    if (customerRecords.length < 5000) {
      console.log("[IMPORT-REFERENCED-CUSTOMERS] Trying line-by-line parsing...")
      const lines = customersContent.split('\n')
      const header = lines[0]
      const headerColumns = header.split(',').map(col => col.replace(/"/g, '').trim())
      
      customerRecords = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.length === 0) continue
        
        try {
          // Simple CSV parsing for this specific case
          const values = []
          let current = ''
          let inQuotes = false
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          values.push(current.trim()) // Add the last value
          
          // Create record object
          const record = {}
          for (let k = 0; k < Math.min(headerColumns.length, values.length); k++) {
            record[headerColumns[k]] = values[k].replace(/^"|"$/g, '') // Remove surrounding quotes
          }
          
          customerRecords.push(record)
        } catch (error) {
          // Skip problematic lines
          continue
        }
      }
      console.log(`[IMPORT-REFERENCED-CUSTOMERS] Line-by-line parsing: ${customerRecords.length} records`)
    }

    let imported = 0
    let skipped = 0
    let errors = 0
    let notReferenced = 0

    // Import only customers that are referenced by vehicles
    const batchSize = 100
    for (let i = 0; i < customerRecords.length; i += batchSize) {
      const batch = customerRecords.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          if (!record._ID || record._ID.trim() === '') {
            skipped++
            continue
          }

          const customerId = record._ID.trim()
          
          // Only import if this customer is referenced by vehicles
          if (!referencedCustomerIds.has(customerId)) {
            notReferenced++
            continue
          }

          const customer = {
            id: customerId,
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

          // Import customer (more lenient - import even with minimal data)
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

        } catch (error) {
          errors++
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= customerRecords.length) {
        console.log(`[IMPORT-REFERENCED-CUSTOMERS] Processed ${Math.min(i + batchSize, customerRecords.length)}/${customerRecords.length} records... (Imported: ${imported})`)
      }
    }

    // Get final customer count
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(finalCount[0].count)

    return NextResponse.json({
      success: true,
      message: "Referenced customers import completed",
      results: {
        referencedCustomerIds: referencedCustomerIds.size,
        totalRecordsProcessed: customerRecords.length,
        imported,
        skipped,
        errors,
        notReferenced,
        totalCustomersInDatabase: totalCustomers,
        importRate: Math.round((imported / referencedCustomerIds.size) * 100)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-REFERENCED-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import referenced customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
