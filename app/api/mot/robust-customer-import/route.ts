import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[ROBUST-CUSTOMER-IMPORT] Starting robust customer import with manual parsing...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    
    // Read file as text and parse manually
    const fileContent = fs.readFileSync(customersPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[ROBUST-CUSTOMER-IMPORT] File has ${lines.length} lines`)
    
    // Get header to understand column positions
    const headerLine = lines[0]
    const headerColumns = headerLine.split(',').map(col => col.replace(/"/g, '').trim())
    
    // Find important column indices
    const idIndex = headerColumns.indexOf('_ID')
    const forenameIndex = headerColumns.indexOf('nameForename')
    const surnameIndex = headerColumns.indexOf('nameSurname')
    const emailIndex = headerColumns.indexOf('contactEmail')
    const phoneIndex = headerColumns.indexOf('contactTelephone')
    const mobileIndex = headerColumns.indexOf('contactMobile')
    const houseNoIndex = headerColumns.indexOf('addressHouseNo')
    const roadIndex = headerColumns.indexOf('addressRoad')
    const townIndex = headerColumns.indexOf('addressTown')
    const postcodeIndex = headerColumns.indexOf('addressPostCode')
    const companyIndex = headerColumns.indexOf('nameCompany')
    
    console.log(`[ROBUST-CUSTOMER-IMPORT] Column indices: ID=${idIndex}, Forename=${forenameIndex}, Surname=${surnameIndex}, Email=${emailIndex}`)

    let imported = 0
    let skipped = 0
    let errors = 0

    // Clear existing customers
    await sql`DELETE FROM customers`

    // Process each line manually
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Manual CSV parsing - handle quotes and commas properly
        const values = []
        let current = ''
        let inQuotes = false
        let escapeNext = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          
          if (escapeNext) {
            current += char
            escapeNext = false
          } else if (char === '\\\\') {
            escapeNext = true
          } else if (char === '"') {
            if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
              // Double quote - add single quote to current
              current += '"'
              j++ // Skip next quote
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Add the last value

        // Extract customer data using column indices
        const customerId = values[idIndex] ? values[idIndex].replace(/"/g, '').trim() : ''
        
        if (!customerId) {
          skipped++
          continue
        }

        const customer = {
          id: customerId,
          first_name: values[forenameIndex] ? values[forenameIndex].replace(/"/g, '').trim() : '',
          last_name: values[surnameIndex] ? values[surnameIndex].replace(/"/g, '').trim() : '',
          email: values[emailIndex] ? values[emailIndex].replace(/"/g, '').trim() : '',
          phone: (values[phoneIndex] || values[mobileIndex] || '').replace(/"/g, '').trim(),
          address_line1: [
            values[houseNoIndex] ? values[houseNoIndex].replace(/"/g, '').trim() : '',
            values[roadIndex] ? values[roadIndex].replace(/"/g, '').trim() : ''
          ].filter(Boolean).join(' ').trim(),
          city: values[townIndex] ? values[townIndex].replace(/"/g, '').trim() : '',
          postcode: values[postcodeIndex] ? values[postcodeIndex].replace(/"/g, '').trim() : '',
          company_name: values[companyIndex] ? values[companyIndex].replace(/"/g, '').trim() : ''
        }

        // Import customer (be more lenient about what constitutes valid data)
        if (customer.id && (customer.first_name || customer.last_name || customer.company_name || customer.email || customer.phone)) {
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
          
          if (imported % 1000 === 0) {
            console.log(`[ROBUST-CUSTOMER-IMPORT] Imported ${imported} customers...`)
          }
        } else {
          skipped++
        }

      } catch (error) {
        errors++
        if (errors < 10) {
          console.error(`[ROBUST-CUSTOMER-IMPORT] Error on line ${i + 1}:`, error)
        }
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(finalCount[0].count)

    // Get sample customers
    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, email, phone, city
      FROM customers 
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Robust customer import completed",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors,
        totalCustomersInDatabase: totalCustomers,
        importRate: Math.round((imported / (lines.length - 1)) * 100)
      },
      sampleCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ROBUST-CUSTOMER-IMPORT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import customers robustly",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
