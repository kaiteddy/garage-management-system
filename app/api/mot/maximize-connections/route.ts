import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function POST() {
  try {
    console.log("[MAXIMIZE-CONNECTIONS] Maximizing vehicle-customer connections with existing data...")

    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv'
    
    // Get all existing customers in our database
    const existingCustomers = await sql`
      SELECT id FROM customers
    `
    const existingCustomerIds = new Set(existingCustomers.map(c => c.id))
    console.log(`[MAXIMIZE-CONNECTIONS] Found ${existingCustomerIds.size} existing customers in database`)

    // Read vehicles CSV
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

    console.log(`[MAXIMIZE-CONNECTIONS] Processing ${vehicleRecords.length} vehicle records`)

    let connected = 0
    let skipped = 0
    let customerNotFound = 0
    let vehicleNotFound = 0
    let alreadyConnected = 0

    // Clear existing connections first to start fresh
    await sql`UPDATE vehicles SET owner_id = NULL WHERE owner_id IS NOT NULL`

    // Process all vehicles and connect them to existing customers
    const batchSize = 100
    for (let i = 0; i < vehicleRecords.length; i += batchSize) {
      const batch = vehicleRecords.slice(i, i + batchSize)
      
      for (const record of batch) {
        try {
          if (!record.Registration || !record._ID_Customer || 
              record.Registration.trim() === '' || record._ID_Customer.trim() === '') {
            skipped++
            continue
          }

          const registration = record.Registration.trim().toUpperCase().replace(/\\s/g, '')
          const customerId = record._ID_Customer.trim()

          // Check if customer exists in our database
          if (!existingCustomerIds.has(customerId)) {
            customerNotFound++
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
            if (connected % 500 === 0) {
              console.log(`[MAXIMIZE-CONNECTIONS] Connected ${connected} vehicles...`)
            }
          } else {
            vehicleNotFound++
          }

        } catch (error) {
          console.error(`[MAXIMIZE-CONNECTIONS] Error processing vehicle ${record.Registration}:`, error)
          skipped++
        }
      }

      if ((i + batchSize) % 1000 === 0 || i + batchSize >= vehicleRecords.length) {
        console.log(`[MAXIMIZE-CONNECTIONS] Processed ${Math.min(i + batchSize, vehicleRecords.length)}/${vehicleRecords.length} records...`)
      }
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

    // Get sample connections to verify
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

    // Check critical MOTs with customers
    const criticalWithCustomers = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      INNER JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL 
      AND (
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '3 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle-customer connections maximized",
      results: {
        processing: {
          totalVehicleRecords: vehicleRecords.length,
          connected,
          skipped,
          customerNotFound,
          vehicleNotFound,
          alreadyConnected
        },
        final: {
          totalVehicles: parseInt(stats.total_vehicles),
          vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
          totalCustomers: parseInt(stats.total_customers),
          connectionRate: Math.round((parseInt(stats.vehicles_with_customers) / parseInt(stats.total_vehicles)) * 100),
          criticalMOTsWithCustomers: parseInt(criticalWithCustomers[0].count)
        }
      },
      sampleConnections,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[MAXIMIZE-CONNECTIONS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to maximize connections",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
