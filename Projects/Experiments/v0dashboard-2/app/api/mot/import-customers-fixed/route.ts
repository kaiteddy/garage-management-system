import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[IMPORT-CUSTOMERS-FIXED] Starting fixed customer import handling duplicate emails...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    
    const fileContent = fs.readFileSync(customersPath, 'utf-8')
    const lines = fileContent.split('\n')
    
    console.log(`[IMPORT-CUSTOMERS-FIXED] Processing ${lines.length} lines`)
    
    // Get header and find column positions
    const headerLine = lines[0]
    const headerFields = headerLine.split(',')
    
    const findColumnIndex = (columnName: string) => {
      return headerFields.findIndex(field => 
        field.toLowerCase().replace(/"/g, '').trim() === columnName.toLowerCase()
      )
    }

    const columnIndices = {
      id: findColumnIndex('_ID'),
      forename: findColumnIndex('nameForename'),
      surname: findColumnIndex('nameSurname'),
      email: findColumnIndex('contactEmail'),
      telephone: findColumnIndex('contactTelephone'),
      mobile: findColumnIndex('contactMobile'),
      houseNo: findColumnIndex('addressHouseNo'),
      road: findColumnIndex('addressRoad'),
      town: findColumnIndex('addressTown'),
      postcode: findColumnIndex('addressPostCode'),
      company: findColumnIndex('nameCompany')
    }

    // Clear existing customers
    await sql`DELETE FROM customers`
    console.log('[IMPORT-CUSTOMERS-FIXED] Cleared existing customers')

    let imported = 0
    let skipped = 0
    let errors = 0
    let emailDuplicates = 0
    
    const seenEmails = new Set()
    const seenIds = new Set()

    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Parse CSV line - handle quotes properly
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

        // Extract customer data
        const customerId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : ''
        
        if (!customerId || customerId.length < 5) {
          skipped++
          continue
        }

        // Skip duplicate IDs
        if (seenIds.has(customerId)) {
          skipped++
          continue
        }
        seenIds.add(customerId)

        let email = fields[columnIndices.email] ? fields[columnIndices.email].replace(/"/g, '').trim() : ''
        
        // Handle duplicate emails by making them unique
        if (email && seenEmails.has(email)) {
          email = `${email}.duplicate.${customerId.substring(0, 8)}`
          emailDuplicates++
        } else if (email) {
          seenEmails.add(email)
        }

        // If no email, create a placeholder
        if (!email) {
          email = `noemail.${customerId}@placeholder.com`
        }

        const customer = {
          id: customerId,
          first_name: fields[columnIndices.forename] ? fields[columnIndices.forename].replace(/"/g, '').trim() : '',
          last_name: fields[columnIndices.surname] ? fields[columnIndices.surname].replace(/"/g, '').trim() : '',
          email: email,
          phone: (fields[columnIndices.telephone] || fields[columnIndices.mobile] || '').replace(/"/g, '').trim(),
          address_line1: [
            fields[columnIndices.houseNo] ? fields[columnIndices.houseNo].replace(/"/g, '').trim() : '',
            fields[columnIndices.road] ? fields[columnIndices.road].replace(/"/g, '').trim() : ''
          ].filter(Boolean).join(' ').trim(),
          city: fields[columnIndices.town] ? fields[columnIndices.town].replace(/"/g, '').trim() : '',
          postcode: fields[columnIndices.postcode] ? fields[columnIndices.postcode].replace(/"/g, '').trim() : ''
        }

        // Clean phone number
        if (customer.phone) {
          customer.phone = customer.phone.replace(/[^0-9+]/g, '')
          if (customer.phone.length < 10 || customer.phone.length > 15) {
            customer.phone = null
          }
        }

        // Import customer
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, email, phone, 
            address_line1, city, postcode
          ) VALUES (
            ${customer.id},
            ${customer.first_name || ''},
            ${customer.last_name || ''},
            ${customer.email},
            ${customer.phone || null},
            ${customer.address_line1 || null},
            ${customer.city || null},
            ${customer.postcode || null}
          )
        `
        imported++

        if (imported % 1000 === 0) {
          console.log(`[IMPORT-CUSTOMERS-FIXED] Imported ${imported} customers...`)
        }

      } catch (error) {
        errors++
        if (errors <= 10) {
          console.error(`[IMPORT-CUSTOMERS-FIXED] Error on line ${i + 1}:`, error)
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
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Fixed customer import completed",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors,
        emailDuplicates,
        totalCustomersInDatabase: totalCustomers,
        importRate: Math.round((imported / (lines.length - 1)) * 100),
        targetAchieved: totalCustomers >= 6000
      },
      sampleCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-CUSTOMERS-FIXED] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import customers with fixes",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
