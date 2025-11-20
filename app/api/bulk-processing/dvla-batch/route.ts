import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { lookupVehicle } from "@/lib/dvla-api"

export async function POST(request: Request) {
  try {
    const { batchSize = 50, offset = 0, testMode = true } = await request.json()

    console.log(`[DVLA-BATCH] Starting batch processing: size=${batchSize}, offset=${offset}, testMode=${testMode}`)

    // Get vehicles that need DVLA data updates
    const vehicles = await sql`
      SELECT registration, make, model, year, color, fuel_type, engine_size, mot_status
      FROM vehicles
      WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
      ORDER BY registration
      LIMIT ${batchSize} OFFSET ${offset}
    `

    console.log(`[DVLA-BATCH] Processing ${vehicles.length} vehicles`)

    const results = {
      processed: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: []
    }

    for (const vehicle of vehicles) {
      try {
        console.log(`[DVLA-BATCH] Processing ${vehicle.registration}`)

        // In test mode, only process first 5 vehicles
        if (testMode && results.processed >= 5) {
          results.skipped++
          results.details.push({
            registration: vehicle.registration,
            status: 'skipped',
            reason: 'Test mode limit reached'
          })
          continue
        }

        // Get DVLA data
        const dvlaData = await lookupVehicle(vehicle.registration)

        if (!dvlaData) {
          results.failed++
          results.details.push({
            registration: vehicle.registration,
            status: 'failed',
            reason: 'No DVLA data returned'
          })
          continue
        }

        // Prepare update fields
        const updates = []
        const values = []
        let paramIndex = 1

        if (!vehicle.year && dvlaData.yearOfManufacture) {
          updates.push(`year = $${paramIndex++}`)
          values.push(dvlaData.yearOfManufacture)
        }

        if (!vehicle.color && dvlaData.colour) {
          updates.push(`color = $${paramIndex++}`)
          values.push(dvlaData.colour)
        }

        if (!vehicle.fuel_type && dvlaData.fuelType) {
          updates.push(`fuel_type = $${paramIndex++}`)
          values.push(dvlaData.fuelType)
        }

        if (!vehicle.engine_size && dvlaData.engineCapacity) {
          updates.push(`engine_size = $${paramIndex++}`)
          values.push(dvlaData.engineCapacity)
        }

        // Always update MOT and tax status (most current)
        updates.push(`mot_status = $${paramIndex++}`)
        values.push(dvlaData.motStatus)

        if (dvlaData.motExpiryDate) {
          updates.push(`mot_expiry_date = $${paramIndex++}`)
          values.push(dvlaData.motExpiryDate)
        }

        if (dvlaData.taxStatus) {
          updates.push(`tax_status = $${paramIndex++}`)
          values.push(dvlaData.taxStatus)
        }

        if (dvlaData.taxDueDate) {
          updates.push(`tax_due_date = $${paramIndex++}`)
          values.push(dvlaData.taxDueDate)
        }

        updates.push(`mot_last_checked = NOW()`)
        updates.push(`updated_at = NOW()`)

        if (updates.length > 2) { // More than just timestamps
          values.push(vehicle.registration)

          const updateQuery = `
            UPDATE vehicles
            SET ${updates.join(', ')}
            WHERE registration = $${paramIndex}
          `

          await sql.query(updateQuery, values)

          // Create MOT history if we have data
          if (dvlaData.motExpiryDate) {
            try {
              const testDate = new Date(new Date(dvlaData.motExpiryDate).getTime() - 365*24*60*60*1000).toISOString().split('T')[0]
              const testResult = dvlaData.motStatus === 'Valid' ? 'PASS' :
                                dvlaData.motStatus === 'Not valid' ? 'EXPIRED' : 'UNKNOWN'

              await sql`
                INSERT INTO mot_history (
                  vehicle_registration,
                  test_date,
                  test_result,
                  expiry_date,
                  created_at
                ) VALUES (
                  ${vehicle.registration},
                  ${testDate},
                  ${testResult},
                  ${dvlaData.motExpiryDate},
                  NOW()
                )
                ON CONFLICT DO NOTHING
              `
            } catch (motError) {
              console.log(`[DVLA-BATCH] MOT history creation failed for ${vehicle.registration}:`, motError)
            }
          }

          results.updated++
          results.details.push({
            registration: vehicle.registration,
            status: 'updated',
            fields_updated: updates.length - 2,
            dvla_data: {
              year: dvlaData.yearOfManufacture,
              color: dvlaData.colour,
              fuel_type: dvlaData.fuelType,
              engine_size: dvlaData.engineCapacity,
              mot_status: dvlaData.motStatus,
              mot_expiry: dvlaData.motExpiryDate
            }
          })
        } else {
          results.skipped++
          results.details.push({
            registration: vehicle.registration,
            status: 'skipped',
            reason: 'No new data to update'
          })
        }

        results.processed++

        // Rate limiting - wait 1 second between DVLA calls
        if (!testMode) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        results.failed++
        results.details.push({
          registration: vehicle.registration,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`[DVLA-BATCH] Error processing ${vehicle.registration}:`, error)
      }
    }

    // Get remaining count
    const remainingCount = await sql`
      SELECT COUNT(*) as count FROM vehicles
      WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
    `

    return NextResponse.json({
      success: true,
      batch_results: results,
      batch_info: {
        batch_size: batchSize,
        offset,
        test_mode: testMode,
        vehicles_in_batch: vehicles.length,
        remaining_vehicles: parseInt(remainingCount[0].count)
      },
      next_batch: {
        recommended_offset: offset + batchSize,
        estimated_remaining_time_minutes: Math.ceil(parseInt(remainingCount[0].count) * 2 / 60)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DVLA-BATCH] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process DVLA batch",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
