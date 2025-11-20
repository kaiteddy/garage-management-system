import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[CONNECT-VEHICLES-CUSTOMERS] Starting vehicle-customer connection process...")

    const filePath = '/Users/adamrutstein/v0dashboard-2/data/Vehicles.csv'
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: "Vehicles.csv file not found",
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

    console.log(`[CONNECT-VEHICLES-CUSTOMERS] Found ${records.length} vehicle records`)

    let connected = 0
    let skipped = 0
    let errors = 0
    let notFound = 0

    // Process vehicles in batches
    const batchSize = 50
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          // Skip if no registration or customer ID
          if (!record.Registration || !record._ID_Customer || 
              record.Registration.trim() === '' || record._ID_Customer.trim() === '') {
            skipped++
            continue
          }

          const registration = record.Registration.trim().toUpperCase().replace(/\\s/g, '')
          const customerId = record._ID_Customer.trim()

          // Debug first few records
          if (connected < 3) {
            console.log(`[CONNECT-VEHICLES-CUSTOMERS] Sample connection ${connected + 1}:`, {
              registration,
              customerId,
              make: record.Make,
              model: record.Model
            })
          }

          // Check if customer exists
          const customerExists = await sql`
            SELECT id FROM customers WHERE id = ${customerId}
          `

          if (customerExists.length === 0) {
            notFound++
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
            connected++
            if (connected % 100 === 0) {
              console.log(`[CONNECT-VEHICLES-CUSTOMERS] Connected ${connected} vehicles...`)
            }
          } else {
            // Vehicle not found in database
            skipped++
          }

        } catch (error) {
          console.error(`[CONNECT-VEHICLES-CUSTOMERS] Error connecting vehicle ${record.Registration}:`, error)
          errors++
        }
      }

      // Log progress
      console.log(`[CONNECT-VEHICLES-CUSTOMERS] Processed ${Math.min(i + batchSize, records.length)}/${records.length} records...`)
    }

    // Get final statistics
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_customers,
        (SELECT COUNT(*) FROM customers) as total_customers
      FROM vehicles
    `

    const stats = finalStats[0]

    // Get some sample connections to verify
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
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle-customer connection completed",
      results: {
        totalRecords: records.length,
        connected,
        skipped,
        errors,
        customersNotFound: notFound,
        totalVehicles: parseInt(stats.total_vehicles),
        vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
        totalCustomers: parseInt(stats.total_customers),
        connectionRate: Math.round((parseInt(stats.vehicles_with_customers) / parseInt(stats.total_vehicles)) * 100)
      },
      sampleConnections,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CONNECT-VEHICLES-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect vehicles to customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
