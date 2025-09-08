import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[IMPORT-ORIGINAL-SOURCE] Starting import from original Google Drive data source...")

    const customersPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Customers.csv'
    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv'
    
    // Check if files exist
    if (!fs.existsSync(customersPath)) {
      return NextResponse.json({
        success: false,
        error: "Original Customers.csv file not found",
        path: customersPath
      }, { status: 404 })
    }

    if (!fs.existsSync(vehiclesPath)) {
      return NextResponse.json({
        success: false,
        error: "Original Vehicles.csv file not found", 
        path: vehiclesPath
      }, { status: 404 })
    }

    // Clear existing data
    console.log("[IMPORT-ORIGINAL-SOURCE] Clearing existing data...")
    await sql`UPDATE vehicles SET owner_id = NULL WHERE owner_id IS NOT NULL`
    await sql`DELETE FROM customers`

    // Import customers first
    console.log("[IMPORT-ORIGINAL-SOURCE] Importing customers from original source...")
    const customersContent = fs.readFileSync(customersPath, 'utf-8')
    const customerRecords = parse(customersContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      skip_records_with_error: true // Skip problematic records for now
    })

    console.log(`[IMPORT-ORIGINAL-SOURCE] Parsed ${customerRecords.length} customer records`)

    let customersImported = 0
    let customersSkipped = 0
    let customersErrors = 0

    // Import customers in batches
    const batchSize = 100
    for (let i = 0; i < customerRecords.length; i += batchSize) {
      const batch = customerRecords.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          if (!record._ID || record._ID.trim() === '') {
            customersSkipped++
            continue
          }

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

          // Import if we have meaningful data
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
            customersImported++
          } else {
            customersSkipped++
          }

        } catch (error) {
          customersErrors++
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= customerRecords.length) {
        console.log(`[IMPORT-ORIGINAL-SOURCE] Customers: ${Math.min(i + batchSize, customerRecords.length)}/${customerRecords.length} processed...`)
      }
    }

    // Now establish vehicle-customer connections using the original vehicles file
    console.log("[IMPORT-ORIGINAL-SOURCE] Establishing vehicle-customer connections...")
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

    console.log(`[IMPORT-ORIGINAL-SOURCE] Parsed ${vehicleRecords.length} vehicle records`)

    let vehiclesConnected = 0
    let vehiclesSkipped = 0
    let vehiclesNotFound = 0
    let customersNotFound = 0

    // Connect vehicles to customers
    for (let i = 0; i < vehicleRecords.length; i += batchSize) {
      const batch = vehicleRecords.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          if (!record.Registration || !record._ID_Customer || 
              record.Registration.trim() === '' || record._ID_Customer.trim() === '') {
            vehiclesSkipped++
            continue
          }

          const registration = record.Registration.trim().toUpperCase().replace(/\\s/g, '')
          const customerId = record._ID_Customer.trim()

          // Check if customer exists
          const customerExists = await sql`
            SELECT id FROM customers WHERE id = ${customerId}
          `

          if (customerExists.length === 0) {
            customersNotFound++
            continue
          }

          // Update vehicle with customer connection
          const updateResult = await sql`
            UPDATE vehicles 
            SET 
              owner_id = ${customerId},
              updated_at = NOW()
            WHERE registration = ${registration}
            RETURNING registration
          `

          if (updateResult.length > 0) {
            vehiclesConnected++
          } else {
            vehiclesNotFound++
          }

        } catch (error) {
          vehiclesSkipped++
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= vehicleRecords.length) {
        console.log(`[IMPORT-ORIGINAL-SOURCE] Vehicles: ${Math.min(i + batchSize, vehicleRecords.length)}/${vehicleRecords.length} processed...`)
      }
    }

    // Get final statistics
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers
    `

    const stats = finalStats[0]

    // Get sample connections
    const sampleConnections = await sql`
      SELECT 
        v.registration,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      INNER JOIN customers c ON v.owner_id = c.id
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Import from original source completed",
      results: {
        customers: {
          totalRecords: customerRecords.length,
          imported: customersImported,
          skipped: customersSkipped,
          errors: customersErrors
        },
        vehicles: {
          totalRecords: vehicleRecords.length,
          connected: vehiclesConnected,
          skipped: vehiclesSkipped,
          vehiclesNotFound,
          customersNotFound
        },
        final: {
          totalCustomers: parseInt(stats.total_customers),
          totalVehicles: parseInt(stats.total_vehicles),
          vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
          connectionRate: Math.round((parseInt(stats.vehicles_with_customers) / parseInt(stats.total_vehicles)) * 100)
        }
      },
      sampleConnections,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ORIGINAL-SOURCE] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import from original source",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
