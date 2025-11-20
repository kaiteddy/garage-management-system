import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function GET() {
  try {
    console.log("[ANALYZE-CONNECTION-GAPS] Analyzing vehicle-customer connection gaps...")

    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv'
    
    // Read vehicles CSV to analyze customer references
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

    console.log(`[ANALYZE-CONNECTION-GAPS] Parsed ${vehicleRecords.length} vehicle records from CSV`)

    // Analyze the vehicle records
    let vehiclesWithCustomerIds = 0
    let vehiclesWithoutCustomerIds = 0
    let uniqueCustomerIds = new Set()
    let sampleVehiclesWithCustomers = []
    let sampleVehiclesWithoutCustomers = []

    for (const record of vehicleRecords) {
      if (record._ID_Customer && record._ID_Customer.trim() !== '') {
        vehiclesWithCustomerIds++
        uniqueCustomerIds.add(record._ID_Customer.trim())
        
        if (sampleVehiclesWithCustomers.length < 5) {
          sampleVehiclesWithCustomers.push({
            registration: record.Registration,
            customerId: record._ID_Customer,
            make: record.Make,
            model: record.Model
          })
        }
      } else {
        vehiclesWithoutCustomerIds++
        
        if (sampleVehiclesWithoutCustomers.length < 5) {
          sampleVehiclesWithoutCustomers.push({
            registration: record.Registration,
            customerId: record._ID_Customer || 'EMPTY',
            make: record.Make,
            model: record.Model
          })
        }
      }
    }

    // Check how many of these customer IDs exist in our database
    const customerIdsArray = Array.from(uniqueCustomerIds)
    let existingCustomers = 0
    let missingCustomers = 0
    let sampleMissingCustomerIds = []

    // Check in batches
    const batchSize = 100
    for (let i = 0; i < customerIdsArray.length; i += batchSize) {
      const batch = customerIdsArray.slice(i, i + batchSize)
      
      for (const customerId of batch) {
        const customerExists = await sql`
          SELECT id FROM customers WHERE id = ${customerId}
        `
        
        if (customerExists.length > 0) {
          existingCustomers++
        } else {
          missingCustomers++
          if (sampleMissingCustomerIds.length < 10) {
            sampleMissingCustomerIds.push(customerId)
          }
        }
      }
    }

    // Check current database connection status
    const dbStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_customers,
        (SELECT COUNT(*) FROM customers) as total_customers
      FROM vehicles
    `

    const stats = dbStats[0]

    // Check for registration mismatches
    const registrationMismatches = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      WHERE v.owner_id IS NULL
      AND EXISTS (
        SELECT 1 FROM vehicles v2 
        WHERE v2.owner_id IS NOT NULL 
        AND UPPER(REPLACE(v2.registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      )
    `

    return NextResponse.json({
      success: true,
      analysis: {
        csvAnalysis: {
          totalVehicleRecords: vehicleRecords.length,
          vehiclesWithCustomerIds,
          vehiclesWithoutCustomerIds,
          uniqueCustomerIdsInCSV: uniqueCustomerIds.size,
          percentageWithCustomerIds: Math.round((vehiclesWithCustomerIds / vehicleRecords.length) * 100)
        },
        customerIdAnalysis: {
          existingCustomers,
          missingCustomers,
          customerExistenceRate: Math.round((existingCustomers / uniqueCustomerIds.size) * 100),
          sampleMissingCustomerIds: sampleMissingCustomerIds.slice(0, 5)
        },
        databaseStatus: {
          totalVehicles: parseInt(stats.total_vehicles),
          vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
          totalCustomers: parseInt(stats.total_customers),
          connectionRate: Math.round((parseInt(stats.vehicles_with_customers) / parseInt(stats.total_vehicles)) * 100)
        },
        samples: {
          vehiclesWithCustomers: sampleVehiclesWithCustomers,
          vehiclesWithoutCustomers: sampleVehiclesWithoutCustomers
        },
        registrationMismatches: parseInt(registrationMismatches[0].count)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ANALYZE-CONNECTION-GAPS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze connection gaps",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
