import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[DEBUG-IMPORT-ERRORS] Debugging customer import errors...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    
    const fileContent = fs.readFileSync(customersPath, 'utf-8')
    const lines = fileContent.split('\n')
    
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

    let imported = 0
    let errors = 0
    let errorSamples = []
    let duplicateIds = new Set()
    let invalidIds = []

    // Process first 100 lines to debug
    const testLines = Math.min(100, lines.length)
    
    for (let i = 1; i < testLines; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Simple CSV parsing for debugging
        const fields = line.split(',').map(field => field.replace(/^"|"$/g, '').trim())
        
        const customerId = fields[columnIndices.id] || ''
        
        if (!customerId || customerId.length < 5) {
          invalidIds.push({ line: i + 1, id: customerId, preview: line.substring(0, 100) })
          continue
        }

        if (duplicateIds.has(customerId)) {
          errorSamples.push({
            line: i + 1,
            error: 'Duplicate ID',
            id: customerId,
            preview: line.substring(0, 100)
          })
          continue
        }
        duplicateIds.add(customerId)

        const customer = {
          id: customerId,
          first_name: fields[columnIndices.forename] || '',
          last_name: fields[columnIndices.surname] || '',
          email: fields[columnIndices.email] || '',
          phone: (fields[columnIndices.telephone] || fields[columnIndices.mobile] || '').replace(/[^0-9+]/g, ''),
          address_line1: [
            fields[columnIndices.houseNo] || '',
            fields[columnIndices.road] || ''
          ].filter(Boolean).join(' ').trim(),
          city: fields[columnIndices.town] || '',
          postcode: fields[columnIndices.postcode] || ''
        }

        // Debug first few customers
        if (imported < 5) {
          console.log(`[DEBUG-IMPORT-ERRORS] Customer ${imported + 1}:`, {
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`.trim(),
            email: customer.email,
            phone: customer.phone,
            address: customer.address_line1,
            city: customer.city
          })
        }

        // Try to insert
        await sql`
          INSERT INTO customers (
            id, first_name, last_name, email, phone, 
            address_line1, city, postcode
          ) VALUES (
            ${customer.id},
            ${customer.first_name},
            ${customer.last_name},
            ${customer.email},
            ${customer.phone || null},
            ${customer.address_line1 || null},
            ${customer.city || null},
            ${customer.postcode || null}
          )
        `
        imported++

      } catch (error) {
        errors++
        if (errorSamples.length < 10) {
          errorSamples.push({
            line: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            preview: line.substring(0, 100)
          })
        }
      }
    }

    // Check database constraints
    const tableInfo = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    return NextResponse.json({
      success: true,
      debug: {
        testLines: testLines - 1,
        imported,
        errors,
        columnIndices,
        errorSamples,
        invalidIds: invalidIds.slice(0, 5),
        tableConstraints: tableInfo,
        duplicateCount: duplicateIds.size
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-IMPORT-ERRORS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug import errors",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
