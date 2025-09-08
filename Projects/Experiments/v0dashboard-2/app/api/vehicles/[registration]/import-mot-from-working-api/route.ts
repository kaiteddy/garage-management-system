import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"

export async function POST(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    console.log(`[IMPORT-MOT-WORKING-API] 🔍 Importing real MOT data for ${registration}`)

    // Use the working MOT API function
    const motData = await checkMOTStatus(registration)

    if (!motData) {
      return NextResponse.json({
        success: false,
        error: "No MOT data found for this vehicle",
        details: "The DVSA/DVLA APIs returned no data for this registration"
      })
    }

    console.log(`[IMPORT-MOT-WORKING-API] ✅ MOT data received:`, motData)

    // Clear existing MOT history for this vehicle
    const cleanReg = registration.toUpperCase().replace(/\s/g, '')
    await sql`
      DELETE FROM mot_history
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
    `

    let inserted = 0

    // Process MOT test history if available
    if (motData.motTests && motData.motTests.length > 0) {
      console.log(`[IMPORT-MOT-WORKING-API] 📊 Processing ${motData.motTests.length} MOT tests`)

      for (const test of motData.motTests) {
        try {
          // Insert MOT test record
          await sql`
            INSERT INTO mot_history (
              vehicle_registration,
              test_date,
              expiry_date,
              test_result,
              odometer_value,
              odometer_unit,
              test_number,
              has_failures,
              has_advisories,
              defects,
              advisories
            ) VALUES (
              ${registration},
              ${test.completedDate},
              ${test.expiryDate},
              ${test.testResult},
              ${test.odometerValue ? parseInt(test.odometerValue) : null},
              ${test.odometerUnit || 'mi'},
              ${test.motTestNumber || 'Unknown'},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) : false},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'ADVISORY') : false},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) || [])},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'ADVISORY') || [])}
            )
          `
          inserted++
        } catch (error) {
          console.error(`[IMPORT-MOT-WORKING-API] ❌ Error inserting MOT test:`, error)
        }
      }
    } else {
      // If no detailed MOT tests, create a basic record from the summary data
      console.log(`[IMPORT-MOT-WORKING-API] 📊 No detailed MOT tests, creating summary record`)

      try {
        await sql`
          INSERT INTO mot_history (
            vehicle_registration,
            test_date,
            expiry_date,
            test_result,
            odometer_value,
            odometer_unit,
            test_number,
            has_failures,
            has_advisories,
            defects,
            advisories
          ) VALUES (
            ${registration},
            ${motData.motTestDate || new Date().toISOString()},
            ${motData.motExpiry},
            ${motData.motStatus === 'expired' ? 'EXPIRED' : motData.motStatus === 'valid' ? 'PASSED' : 'UNKNOWN'},
            ${motData.mileage || null},
            ${'mi'},
            ${motData.motTestNumber || 'Unknown'},
            ${false},
            ${false},
            ${JSON.stringify([])},
            ${JSON.stringify([])}
          )
        `
        inserted++
      } catch (error) {
        console.error(`[IMPORT-MOT-WORKING-API] ❌ Error inserting summary MOT record:`, error)
      }
    }

    // Update vehicle with latest MOT information
    await sql`
      UPDATE vehicles
      SET
        mot_status = ${motData.motStatus || 'Unknown'},
        mot_expiry_date = ${motData.motExpiry},
        mot_test_date = ${motData.motTestDate},
        mot_test_number = ${motData.motTestNumber},
        mot_test_result = ${motData.motStatus === 'expired' ? 'EXPIRED' : motData.motStatus === 'valid' ? 'PASSED' : 'UNKNOWN'},
        mot_odometer_value = ${motData.mileage},
        mot_odometer_unit = ${'mi'},
        mot_last_checked = NOW(),
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
    `

    console.log(`[IMPORT-MOT-WORKING-API] ✅ Successfully imported ${inserted} MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} MOT records from DVSA/DVLA APIs`,
      registration: registration,
      motHistoryCount: inserted,
      motData: {
        motStatus: motData.motStatus,
        motExpiry: motData.motExpiry,
        make: motData.make,
        model: motData.model,
        yearOfManufacture: motData.yearOfManufacture,
        testCount: motData.motTests?.length || 0
      }
    })

  } catch (error) {
    console.error("[IMPORT-MOT-WORKING-API] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to import MOT data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
