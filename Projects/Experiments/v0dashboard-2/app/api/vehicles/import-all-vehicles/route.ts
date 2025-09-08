import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import fs from 'fs'

export async function POST() {
  try {
    console.log("[IMPORT-ALL-VEHICLES] Starting comprehensive import of all vehicles...")

    const vehiclesPath = '/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports/Vehicles.csv'

    // Read file with proper encoding handling
    const fileContent = fs.readFileSync(vehiclesPath, 'utf-8')
    const lines = fileContent.split('\n')

    console.log(`[IMPORT-ALL-VEHICLES] Processing ${lines.length} lines`)

    // Get header and find column positions
    const headerLine = lines[0]
    const headerFields = headerLine.split(',')

    // Find column indices (case insensitive)
    const findColumnIndex = (columnName: string) => {
      return headerFields.findIndex(field =>
        field.toLowerCase().replace(/"/g, '').trim() === columnName.toLowerCase()
      )
    }

    const columnIndices = {
      id: findColumnIndex('_ID'),
      registration: findColumnIndex('Registration'),
      make: findColumnIndex('Make'),
      model: findColumnIndex('Model'),
      year: findColumnIndex('DateofReg'),
      color: findColumnIndex('Colour'),
      fuelType: findColumnIndex('FuelType'),
      engineSize: findColumnIndex('EngineCC'),
      vin: findColumnIndex('VIN'),
      customerId: findColumnIndex('_ID_Customer'),
      motStatus: findColumnIndex('status_LastInvoiceDate'),
      motExpiry: findColumnIndex('DateofReg')
    }

    console.log('[IMPORT-ALL-VEHICLES] Column indices:', columnIndices)

    let imported = 0
    let skipped = 0
    let errors = 0
    let duplicateRegistrations = 0

    const seenRegistrations = new Set()
    const seenIds = new Set()

    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length === 0) continue

      try {
        // Parse CSV line manually to handle quotes properly
        const fields = []
        let current = ''
        let inQuotes = false
        let j = 0

        while (j < line.length) {
          const char = line[j]

          if (char === '"') {
            if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
              // Escaped quote
              current += '"'
              j += 2
            } else {
              // Toggle quote state
              inQuotes = !inQuotes
              j++
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator
            fields.push(current.trim())
            current = ''
            j++
          } else {
            current += char
            j++
          }
        }
        fields.push(current.trim()) // Add last field

        // Extract vehicle data
        const vehicleId = fields[columnIndices.id] ? fields[columnIndices.id].replace(/"/g, '').trim() : ''

        if (!vehicleId || vehicleId.length < 5) {
          skipped++
          continue
        }

        // Skip duplicate IDs
        if (seenIds.has(vehicleId)) {
          skipped++
          continue
        }
        seenIds.add(vehicleId)

        let registration = fields[columnIndices.registration] ? fields[columnIndices.registration].replace(/"/g, '').trim().toUpperCase() : ''

        // Clean registration format
        if (registration) {
          registration = registration.replace(/[^A-Z0-9]/g, '')
          if (registration.length < 4 || registration.length > 8) {
            registration = ''
          }
        }

        if (!registration) {
          skipped++
          continue
        }

        // Handle duplicate registrations by making them unique
        if (seenRegistrations.has(registration)) {
          registration = `${registration}_DUP_${vehicleId.substring(0, 6)}`
          duplicateRegistrations++
        } else {
          seenRegistrations.add(registration)
        }

        // Get customer ID and validate it exists
        const customerId = fields[columnIndices.customerId] ? fields[columnIndices.customerId].replace(/"/g, '').trim() : ''
        let validCustomerId = null

        if (customerId) {
          try {
            const customerCheck = await sql`
              SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
            `
            if (customerCheck.length > 0) {
              validCustomerId = customerId
            }
          } catch (error) {
            // Customer doesn't exist, leave as null
          }
        }

        // Parse year
        let year = null
        const yearStr = fields[columnIndices.year] ? fields[columnIndices.year].replace(/"/g, '').trim() : ''
        if (yearStr) {
          const parsedYear = parseInt(yearStr)
          if (parsedYear >= 1900 && parsedYear <= new Date().getFullYear() + 1) {
            year = parsedYear
          }
        }

        // Parse MOT expiry date
        let motExpiryDate = null
        const motExpiryStr = fields[columnIndices.motExpiry] ? fields[columnIndices.motExpiry].replace(/"/g, '').trim() : ''
        if (motExpiryStr) {
          try {
            const date = new Date(motExpiryStr)
            if (!isNaN(date.getTime())) {
              motExpiryDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            // Invalid date, leave as null
          }
        }

        const vehicle = {
          id: vehicleId,
          owner_id: validCustomerId,
          registration: registration,
          make: fields[columnIndices.make] ? fields[columnIndices.make].replace(/"/g, '').trim() : '',
          model: fields[columnIndices.model] ? fields[columnIndices.model].replace(/"/g, '').trim() : '',
          year: year,
          color: fields[columnIndices.color] ? fields[columnIndices.color].replace(/"/g, '').trim() : '',
          fuel_type: fields[columnIndices.fuelType] ? fields[columnIndices.fuelType].replace(/"/g, '').trim() : '',
          engine_size: fields[columnIndices.engineSize] ? fields[columnIndices.engineSize].replace(/"/g, '').trim() : '',
          vin: fields[columnIndices.vin] ? fields[columnIndices.vin].replace(/"/g, '').trim() : '',
          mot_status: fields[columnIndices.motStatus] ? fields[columnIndices.motStatus].replace(/"/g, '').trim() : '',
          mot_expiry_date: motExpiryDate
        }

        // Import vehicle with duplicate handling
        await sql`
          INSERT INTO vehicles (
            owner_id, registration, make, model, year, color,
            fuel_type, engine_size, vin, mot_status, mot_expiry_date
          ) VALUES (
            ${vehicle.owner_id},
            ${vehicle.registration},
            ${vehicle.make || ''},
            ${vehicle.model || ''},
            ${vehicle.year},
            ${vehicle.color || ''},
            ${vehicle.fuel_type || ''},
            ${vehicle.engine_size || ''},
            ${vehicle.vin || ''},
            ${vehicle.mot_status || ''},
            ${vehicle.mot_expiry_date}
          )
          ON CONFLICT (registration) DO UPDATE SET
            owner_id = EXCLUDED.owner_id,
            registration = EXCLUDED.registration,
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            color = EXCLUDED.color,
            fuel_type = EXCLUDED.fuel_type,
            engine_size = EXCLUDED.engine_size,
            vin = EXCLUDED.vin,
            mot_status = EXCLUDED.mot_status,
            mot_expiry_date = EXCLUDED.mot_expiry_date,
            updated_at = NOW()
        `
        imported++

        if (imported % 1000 === 0) {
          console.log(`[IMPORT-ALL-VEHICLES] Imported ${imported} vehicles...`)
        }

      } catch (error) {
        errors++
        if (errors <= 10) {
          console.error(`[IMPORT-ALL-VEHICLES] Error on line ${i + 1}:`, error)
        }
      }
    }

    // Get final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const totalVehicles = parseInt(finalCount[0].count)

    // Get vehicles with customers
    const withCustomers = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE owner_id IS NOT NULL
    `
    const vehiclesWithCustomers = parseInt(withCustomers[0].count)

    // Get sample vehicles
    const sampleVehicles = await sql`
      SELECT
        v.registration, v.make, v.model, v.year,
        v.owner_id, c.first_name, c.last_name
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      ORDER BY v.created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Comprehensive vehicle import completed",
      results: {
        totalLines: lines.length - 1,
        imported,
        skipped,
        errors,
        duplicateRegistrations,
        totalVehiclesInDatabase: totalVehicles,
        vehiclesWithCustomers,
        connectionRate: Math.round((vehiclesWithCustomers / totalVehicles) * 100),
        importRate: Math.round((imported / (lines.length - 1)) * 100),
        targetAchieved: totalVehicles >= 8000
      },
      sampleVehicles,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-ALL-VEHICLES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import all vehicles",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
