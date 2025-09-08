import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { checkMOTStatus } from "@/lib/mot-api"
import { getDVSAAccessToken } from "@/lib/dvsa-auth"

export async function POST(request: Request) {
  try {
    const { limit = 50, forceUpdate = false } = await request.json().catch(() => ({}))

    console.log(`[BULK-MOT-UPDATE] 🔍 Starting bulk MOT history update (limit: ${limit}, force: ${forceUpdate})`)

    // Get all vehicles that need MOT history updates
    const vehicles = await sql`
      SELECT
        registration,
        make,
        model,
        year,
        mot_status,
        mot_expiry_date,
        mot_last_checked
      FROM vehicles
      WHERE registration IS NOT NULL
      AND registration != ''
      ${forceUpdate ? sql`` : sql`AND (mot_last_checked IS NULL OR mot_last_checked < NOW() - INTERVAL '7 days')`}
      ORDER BY
        CASE WHEN mot_last_checked IS NULL THEN 0 ELSE 1 END,
        mot_last_checked ASC
      LIMIT ${limit}
    `

    console.log(`[BULK-MOT-UPDATE] 📊 Found ${vehicles.length} vehicles to update`)

    const results = {
      total: vehicles.length,
      updated: 0,
      errors: 0,
      skipped: 0,
      details: [] as any[]
    }

    // Get DVSA credentials
    const dvsaApiKey = process.env.DVSA_API_KEY
    if (!dvsaApiKey) {
      return NextResponse.json({
        success: false,
        error: "DVSA API key not configured"
      })
    }

    // Process each vehicle
    for (const vehicle of vehicles) {
      try {
        console.log(`[BULK-MOT-UPDATE] 🚗 Processing ${vehicle.registration}`)

        const cleanReg = vehicle.registration.toUpperCase().replace(/\s/g, '')

        // Get DVSA access token
        const accessToken = await getDVSAAccessToken()

        // Call official DVSA MOT History API
        const apiUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "x-api-key": dvsaApiKey,
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json",
            "User-Agent": "BulkMOTUpdater/1.0",
          },
        })

        if (!response.ok) {
          console.error(`[BULK-MOT-UPDATE] ❌ DVSA API error for ${vehicle.registration}: ${response.status}`)
          results.errors++
          results.details.push({
            registration: vehicle.registration,
            status: 'error',
            error: `DVSA API returned ${response.status}`
          })
          continue
        }

        const officialData = await response.json()

        // Clear existing MOT history for this vehicle
        await sql`
          DELETE FROM mot_history
          WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
        `

        let inserted = 0

        // Process official MOT test history
        if (officialData.motTestHistory && officialData.motTestHistory.length > 0) {
          console.log(`[BULK-MOT-UPDATE] 📊 Processing ${officialData.motTestHistory.length} MOT tests for ${vehicle.registration}`)

          for (const test of officialData.motTestHistory) {
            try {
              // Insert official MOT test record
              await sql`
                INSERT INTO mot_history (
                  vehicle_registration,
                  test_date,
                  expiry_date,
                  test_result,
                  odometer_value,
                  odometer_unit,
                  mot_test_number,
                  defects,
                  advisories
                ) VALUES (
                  ${vehicle.registration},
                  ${test.completedDate},
                  ${test.expiryDate},
                  ${test.testResult},
                  ${test.odometerValue ? parseInt(test.odometerValue.toString()) : null},
                  ${test.odometerUnit || 'mi'},
                  ${test.motTestNumber},
                  ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) || [])},
                  ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'ADVISORY') || [])}
                )
              `
              inserted++
            } catch (error) {
              console.error(`[BULK-MOT-UPDATE] ❌ Error inserting MOT test for ${vehicle.registration}:`, error)
            }
          }
        }

        // Update vehicle with latest official MOT information
        const latestTest = officialData.motTestHistory?.[0]
        let motStatus = 'Unknown'

        if (latestTest) {
          if (latestTest.testResult === 'PASSED') {
            const expiryDate = new Date(latestTest.expiryDate)
            const now = new Date()
            motStatus = expiryDate > now ? 'Valid' : 'Expired'
          } else if (latestTest.testResult === 'FAILED') {
            motStatus = 'Invalid'
          }
        }

        await sql`
          UPDATE vehicles
          SET
            make = COALESCE(${officialData.make}, make),
            model = COALESCE(${officialData.model}, model),
            color = COALESCE(${officialData.primaryColour}, color),
            fuel_type = COALESCE(${officialData.fuelType}, fuel_type),
            mot_status = ${motStatus},
            mot_expiry_date = ${latestTest?.expiryDate || null},
            mot_test_date = ${latestTest?.completedDate || null},
            mot_test_number = ${latestTest?.motTestNumber || null},
            mot_test_result = ${latestTest?.testResult || null},
            mot_odometer_value = ${latestTest?.odometerValue ? parseInt(latestTest.odometerValue.toString()) : null},
            mot_odometer_unit = ${latestTest?.odometerUnit || 'mi'},
            mot_last_checked = NOW(),
            updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
        `

        results.updated++
        results.details.push({
          registration: vehicle.registration,
          status: 'updated',
          motTestsImported: inserted,
          vehicleInfo: {
            make: officialData.make,
            model: officialData.model,
            primaryColour: officialData.primaryColour,
            fuelType: officialData.fuelType
          },
          latestTest: latestTest ? {
            testDate: latestTest.completedDate,
            result: latestTest.testResult,
            expiryDate: latestTest.expiryDate,
            mileage: latestTest.odometerValue,
            testNumber: latestTest.motTestNumber
          } : null
        })

        console.log(`[BULK-MOT-UPDATE] ✅ Updated ${vehicle.registration} with ${inserted} MOT records`)

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`[BULK-MOT-UPDATE] ❌ Error processing ${vehicle.registration}:`, error)
        results.errors++
        results.details.push({
          registration: vehicle.registration,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Get summary statistics
    const totalMotRecords = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    const vehiclesWithMotHistory = await sql`
      SELECT COUNT(DISTINCT vehicle_registration) as count FROM mot_history
    `

    const recentlyUpdated = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE mot_last_checked > NOW() - INTERVAL '1 hour'
    `

    console.log(`[BULK-MOT-UPDATE] ✅ Bulk update completed: ${results.updated} updated, ${results.errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Bulk MOT history update completed`,
      results: results,
      statistics: {
        totalMotRecordsInDatabase: parseInt(totalMotRecords[0].count),
        vehiclesWithMotHistory: parseInt(vehiclesWithMotHistory[0].count),
        recentlyUpdatedVehicles: parseInt(recentlyUpdated[0].count)
      },
      note: "All data is from official DVSA MOT History API - completely authentic."
    })

  } catch (error) {
    console.error("[BULK-MOT-UPDATE] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to perform bulk MOT history update",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
