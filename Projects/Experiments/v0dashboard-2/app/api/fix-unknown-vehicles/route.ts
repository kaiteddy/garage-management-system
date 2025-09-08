import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

export async function POST() {
  console.log('🔍 Starting fix for unknown vehicles...')

  try {
    // Get vehicles that are showing as unknown in job sheets
    const vehiclesNeedingUpdate = await sql`
      SELECT DISTINCT cd.vehicle_registration
      FROM customer_documents cd
      LEFT JOIN vehicles v ON UPPER(cd.vehicle_registration) = UPPER(v.registration)
      WHERE cd.vehicle_registration IS NOT NULL 
        AND cd.vehicle_registration != ''
        AND cd.document_type IN ('ES', 'JS', 'ESTIMATE', 'INVOICE')
        AND (
          v.make IS NULL 
          OR v.model IS NULL 
          OR TRIM(v.make) = '' 
          OR TRIM(v.model) = ''
          OR v.make = 'UNKNOWN'
          OR v.model = 'UNKNOWN'
        )
      ORDER BY cd.vehicle_registration
      LIMIT 20
    `

    console.log(`📋 Found ${vehiclesNeedingUpdate.length} vehicles needing updates`)

    const results = []
    let successCount = 0
    let failCount = 0

    for (const vehicle of vehiclesNeedingUpdate) {
      const registration = vehicle.vehicle_registration
      console.log(`🔍 Processing: ${registration}`)

      try {
        // Get DVLA data
        const dvlaData = await lookupVehicle(registration)
        
        if (dvlaData && dvlaData.make) {
          console.log(`✅ DVLA found: ${dvlaData.make} ${dvlaData.model || 'MODEL NOT PROVIDED'}`)

          // Check if vehicle exists in vehicles table
          const existingVehicle = await sql`
            SELECT id FROM vehicles 
            WHERE UPPER(registration) = UPPER(${registration})
          `

          if (existingVehicle.length > 0) {
            // Update existing vehicle
            await sql`
              UPDATE vehicles 
              SET 
                make = ${dvlaData.make},
                model = ${dvlaData.model || null},
                year = ${dvlaData.yearOfManufacture || null},
                color = ${dvlaData.colour || null},
                fuel_type = ${dvlaData.fuelType || null},
                engine_size = ${dvlaData.engineCapacity || null},
                mot_status = ${dvlaData.motStatus || null},
                mot_expiry_date = ${dvlaData.motExpiryDate || null},
                tax_status = ${dvlaData.taxStatus || null},
                tax_due_date = ${dvlaData.taxDueDate || null},
                updated_at = NOW()
              WHERE UPPER(registration) = UPPER(${registration})
            `
            results.push({ registration, action: 'updated', make: dvlaData.make, model: dvlaData.model })
          } else {
            // Create new vehicle record
            await sql`
              INSERT INTO vehicles (
                registration, make, model, year, color, fuel_type,
                engine_size, mot_status, mot_expiry_date, tax_status, tax_due_date,
                created_at, updated_at
              ) VALUES (
                ${registration.toUpperCase()},
                ${dvlaData.make},
                ${dvlaData.model || null},
                ${dvlaData.yearOfManufacture || null},
                ${dvlaData.colour || null},
                ${dvlaData.fuelType || null},
                ${dvlaData.engineCapacity || null},
                ${dvlaData.motStatus || null},
                ${dvlaData.motExpiryDate || null},
                ${dvlaData.taxStatus || null},
                ${dvlaData.taxDueDate || null},
                NOW(),
                NOW()
              )
            `
            results.push({ registration, action: 'created', make: dvlaData.make, model: dvlaData.model })
          }

          successCount++
        } else {
          console.log(`❌ No DVLA data found for: ${registration}`)
          results.push({ registration, action: 'failed', error: 'No DVLA data found' })
          failCount++
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`❌ Error processing ${registration}:`, error)
        results.push({ registration, action: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${vehiclesNeedingUpdate.length} vehicles`,
      summary: {
        total: vehiclesNeedingUpdate.length,
        successful: successCount,
        failed: failCount
      },
      results
    })

  } catch (error) {
    console.error('❌ Fix unknown vehicles failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix unknown vehicles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
