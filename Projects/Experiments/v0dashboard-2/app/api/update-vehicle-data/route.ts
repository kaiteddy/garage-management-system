import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

export async function POST(request: NextRequest) {
  try {
    const { registrations } = await request.json()

    if (!registrations || !Array.isArray(registrations)) {
      return NextResponse.json(
        { success: false, error: "Registrations array is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 Updating vehicle data for ${registrations.length} registrations...`)

    const results = []
    let successCount = 0
    let failCount = 0

    for (const registration of registrations) {
      console.log(`\n🔍 Processing: ${registration}`)

      try {
        // Get DVLA data
        const dvlaData = await lookupVehicle(registration)

        if (dvlaData && dvlaData.make) {
          console.log(`✅ DVLA found: ${dvlaData.make} ${dvlaData.model || 'MODEL NOT PROVIDED'}`)

          // Check if vehicle exists in vehicles table
          const existingVehicle = await sql`
            SELECT registration FROM vehicles
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
            results.push({
              registration,
              action: 'updated',
              make: dvlaData.make,
              model: dvlaData.model || 'MODEL NOT PROVIDED'
            })
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
            results.push({
              registration,
              action: 'created',
              make: dvlaData.make,
              model: dvlaData.model || 'MODEL NOT PROVIDED'
            })
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
        results.push({
          registration,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${registrations.length} vehicles`,
      summary: {
        total: registrations.length,
        successful: successCount,
        failed: failCount
      },
      results
    })

  } catch (error) {
    console.error('❌ Update vehicle data failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update vehicle data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
