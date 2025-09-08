import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ registration: string }> }
) {
  try {
    const { registration: rawRegistration } = await params
    const registration = decodeURIComponent(rawRegistration)
    console.log(`[FETCH-EXACT-MOT] 🚀 EMERGENCY VERSION - Fetching EXACT MOT history for ${registration} from DVSA/DVLA APIs - v3.0`)
    console.log(`[FETCH-EXACT-MOT] 🔧 CRITICAL FIX ACTIVE - Emergency data extraction enabled`)

    const startTime = Date.now()
    const cleanReg = registration.toUpperCase().replace(/\s/g, '')

    // Try multiple approaches to get MOT history
    let motData = null
    let dataSource = 'unknown'

    // First, try the DVSA MOT History API with OAuth2 authentication
    const dvsaApiKey = process.env.DVSA_API_KEY || process.env.MOT_HISTORY_API_KEY
    const clientId = process.env.DVSA_CLIENT_ID || process.env.TAPI_CLIENT_ID
    const clientSecret = process.env.DVSA_CLIENT_SECRET || process.env.TAPI_CLIENT_SECRET
    const tenantId = process.env.DVSA_TENANT_ID

    if (dvsaApiKey && clientId && clientSecret && tenantId) {
      console.log(`[FETCH-EXACT-MOT] 🔑 Trying DVSA MOT History API with OAuth2...`)

      try {
        // Get OAuth2 token
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://tapi.dvsa.gov.uk/.default",
            grant_type: "client_credentials",
          }),
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          console.log(`[FETCH-EXACT-MOT] ✅ OAuth2 token obtained`)

          // Now fetch MOT history
          const motHistoryUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`
          console.log(`[FETCH-EXACT-MOT] 📡 Calling DVSA MOT History API: ${motHistoryUrl}`)

          const motResponse = await fetch(motHistoryUrl, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${tokenData.access_token}`,
              "X-API-Key": dvsaApiKey,
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
          })

          if (motResponse.ok) {
            motData = await motResponse.json()
            dataSource = 'DVSA_MOT_HISTORY_API'
            console.log(`[FETCH-EXACT-MOT] ✅ DVSA MOT History API success`)
            console.log(`[FETCH-EXACT-MOT] 📊 DVSA data structure:`, JSON.stringify(motData, null, 2))

            // CRITICAL FIX: Use the same approach as the working /api/mot endpoint
            if (motData && motData.motTests && Array.isArray(motData.motTests)) {
              console.log(`[FETCH-EXACT-MOT] 🚀 SUCCESS: Found ${motData.motTests.length} MOT tests in DVSA response`)
              // Continue to process and insert the data instead of returning early
            }
          } else {
            const errorText = await motResponse.text()
            console.log(`[FETCH-EXACT-MOT] ⚠️ DVSA MOT History API error: ${motResponse.status} - ${errorText}`)
          }
        } else {
          const tokenError = await tokenResponse.text()
          console.log(`[FETCH-EXACT-MOT] ⚠️ OAuth2 token error: ${tokenResponse.status} - ${tokenError}`)
        }
      } catch (error) {
        console.log(`[FETCH-EXACT-MOT] ⚠️ DVSA MOT History API failed:`, error)
      }
    }

    // If DVSA didn't work, try DVLA Vehicle Enquiry API
    if (!motData) {
      const dvlaApiKey = process.env.DVLA_API_KEY
      if (dvlaApiKey) {
        console.log(`[FETCH-EXACT-MOT] 🔄 Trying DVLA Vehicle Enquiry API...`)

        try {
          const dvlaResponse = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": dvlaApiKey,
              "Accept": "application/json",
            },
            body: JSON.stringify({
              registrationNumber: cleanReg,
            }),
          })

          if (dvlaResponse.ok) {
            const dvlaData = await dvlaResponse.json()
            console.log(`[FETCH-EXACT-MOT] ✅ DVLA Vehicle Enquiry data:`, dvlaData)

            // Update vehicle basic info in database
            await sql`
              UPDATE vehicles
              SET
                make = COALESCE(${dvlaData.make}, make),
                model = COALESCE(${dvlaData.model}, model),
                year = COALESCE(${dvlaData.yearOfManufacture}, year),
                color = COALESCE(${dvlaData.colour}, color),
                fuel_type = COALESCE(${dvlaData.fuelType}, fuel_type),
                engine_size = COALESCE(${dvlaData.engineCapacity}, engine_size),
                mot_status = COALESCE(${dvlaData.motStatus}, mot_status),
                mot_expiry_date = COALESCE(${dvlaData.motExpiryDate}, mot_expiry_date),
                tax_status = COALESCE(${dvlaData.taxStatus}, tax_status),
                tax_due_date = COALESCE(${dvlaData.taxDueDate}, tax_due_date),
                updated_at = NOW()
              WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
            `

            return NextResponse.json({
              success: true,
              message: "Vehicle information updated from DVLA",
              registration: registration,
              vehicleData: {
                make: dvlaData.make,
                model: dvlaData.model,
                year: dvlaData.yearOfManufacture,
                motStatus: dvlaData.motStatus,
                motExpiryDate: dvlaData.motExpiryDate,
                taxStatus: dvlaData.taxStatus,
                taxDueDate: dvlaData.taxDueDate,
                source: "DVLA_VEHICLE_ENQUIRY_API"
              },
              note: "Basic vehicle and MOT information updated. Trying to get detailed MOT history..."
            })
          } else {
            console.log(`[FETCH-EXACT-MOT] ⚠️ DVLA Vehicle Enquiry API error: ${dvlaResponse.status}`)
          }
        } catch (error) {
          console.log(`[FETCH-EXACT-MOT] ⚠️ DVLA Vehicle Enquiry API failed:`, error)
        }
      }
    }

    // If no data yet, try the open data endpoint (may have restrictions)
    if (!motData) {
      console.log(`[FETCH-EXACT-MOT] 🔄 Trying alternative MOT check...`)

      try {
        const openDataUrl = `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration=${cleanReg}`
        console.log(`[FETCH-EXACT-MOT] 📡 Calling: ${openDataUrl}`)

        const response = await fetch(openDataUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "MOTHistoryChecker/1.0",
          },
        })

        if (response.ok) {
          motData = await response.json()
          dataSource = 'DVLA_OPEN_DATA'
          console.log(`[FETCH-EXACT-MOT] ✅ Open data API success`)
        } else {
          console.log(`[FETCH-EXACT-MOT] ⚠️ Open data API returned: ${response.status}`)
        }
      } catch (error) {
        console.log(`[FETCH-EXACT-MOT] ⚠️ Open data API failed:`, error)
      }
    }

    // If no data found, return helpful message
    if (!motData || (!motData.length && !motData.motTests)) {
      const manualCheckUrl = `https://www.check-mot.service.gov.uk/results?registration=${cleanReg}`

      return NextResponse.json({
        success: false,
        error: "MOT history not available through API",
        details: "The vehicle's MOT history could not be retrieved from available APIs. This may be due to API restrictions or the vehicle not having MOT history.",
        registration: registration,
        suggestion: `You can check MOT history manually at: ${manualCheckUrl}`,
        manualCheckUrl: manualCheckUrl,
        note: "Some vehicles may not have MOT history available through public APIs."
      })
    }

    console.log(`[FETCH-EXACT-MOT] ✅ EMERGENCY VERSION - MOT data received from ${dataSource}`)
    console.log(`[FETCH-EXACT-MOT] 🔍 EMERGENCY - Raw motData type:`, typeof motData)
    console.log(`[FETCH-EXACT-MOT] 🔍 EMERGENCY - Raw motData keys:`, Object.keys(motData || {}))
    console.log(`[FETCH-EXACT-MOT] 🔧 EMERGENCY - Full motData structure:`, JSON.stringify(motData, null, 2))

    // Handle different API response structures
    let motTests = []
    if (dataSource === 'DVSA_MOT_HISTORY_API') {
      // DVSA API returns data in a different structure
      console.log(`[FETCH-EXACT-MOT] 🔍 DVSA API response structure:`, Object.keys(motData || {}))

      // Force extraction - the DVSA API definitely returns { motTests: [...] }
      if (motData && motData.motTests) {
        motTests = motData.motTests
        console.log(`[FETCH-EXACT-MOT] ✅ FORCE EXTRACTED motTests: ${motTests.length} tests`)
      } else {
        console.log(`[FETCH-EXACT-MOT] ⚠️ CRITICAL: motData.motTests not found!`)
        motTests = []
      }
    } else {
      // Open data API structure
      motTests = motData || []
    }

    console.log(`[FETCH-EXACT-MOT] 📋 Processing ${motTests.length} MOT tests from ${dataSource}`)

    // CRITICAL FIX: Force extraction if motTests is empty but motData has motTests
    if (motTests.length === 0 && dataSource === 'DVSA_MOT_HISTORY_API' && motData && motData.motTests) {
      console.log(`[FETCH-EXACT-MOT] 🔧 EMERGENCY FIX: Force extracting motTests from motData`)
      motTests = motData.motTests
      console.log(`[FETCH-EXACT-MOT] ✅ Emergency extraction successful: ${motTests.length} tests found`)
    }

    // Debug: Show first test structure
    if (motTests.length > 0) {
      console.log(`[FETCH-EXACT-MOT] 🔍 Sample test structure:`, JSON.stringify(motTests[0], null, 2))
    }

    if (motTests.length === 0) {
      console.log(`[FETCH-EXACT-MOT] ⚠️ No MOT tests found in API response`)
      return NextResponse.json({
        success: false,
        error: "MOT history not available through API",
        details: "The API returned no MOT test records for this vehicle",
        registration: registration,
        note: "This vehicle may not have MOT history available in the public APIs, or the registration may not be found."
      })
    }

    // Clear existing MOT history for this vehicle
    console.log(`[FETCH-EXACT-MOT] 🗑️ Clearing existing MOT history for ${cleanReg}`)
    await sql`
      DELETE FROM mot_history
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
    `

    let inserted = 0

    for (const test of motTests) {
      console.log(`[FETCH-EXACT-MOT] 📝 Processing test: ${test.motTestNumber} - ${test.testResult} (${test.completedDate})`)
      try {
        // Insert exact MOT test record
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
            ${registration},
            ${test.completedDate || test.testDate},
            ${test.expiryDate},
            ${test.testResult || test.result},
            ${test.odometerValue ? parseInt(test.odometerValue.toString()) : null},
            ${test.odometerUnit || 'mi'},
            ${test.motTestNumber || test.testNumber || 'Unknown'},
            ${JSON.stringify(test.defects || [])},
            ${JSON.stringify(test.defects?.filter((d: any) => d.type === 'ADVISORY') || [])}
          )
        `
        inserted++
        console.log(`[FETCH-EXACT-MOT] ✅ Inserted test ${test.motTestNumber}`)
      } catch (error) {
        console.error(`[FETCH-EXACT-MOT] ❌ Error inserting exact MOT test ${test.motTestNumber}:`, error)
      }
    }

    // Update vehicle with latest exact MOT information
    const latestTest = motTests[0]
    if (latestTest) {
      await sql`
        UPDATE vehicles
        SET
          mot_status = ${latestTest.testResult === 'PASSED' ? 'Valid' : latestTest.testResult === 'FAILED' ? 'Invalid' : 'Unknown'},
          mot_expiry_date = ${latestTest.expiryDate},
          mot_test_date = ${latestTest.completedDate || latestTest.testDate},
          mot_test_number = ${latestTest.motTestNumber || latestTest.testNumber},
          mot_test_result = ${latestTest.testResult || latestTest.result},
          mot_odometer_value = ${latestTest.odometerValue ? parseInt(latestTest.odometerValue.toString()) : null},
          mot_odometer_unit = ${latestTest.odometerUnit || 'mi'},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
      `
    }

    console.log(`[FETCH-EXACT-MOT] ✅ Successfully imported ${inserted} EXACT MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} EXACT MOT records from ${dataSource}`,
      registration: registration,
      motHistoryCount: inserted,
      exactData: {
        source: dataSource,
        testCount: motTests.length,
        latestTest: latestTest ? {
          testDate: latestTest.completedDate || latestTest.testDate,
          result: latestTest.testResult || latestTest.result,
          expiryDate: latestTest.expiryDate,
          mileage: latestTest.odometerValue,
          testNumber: latestTest.motTestNumber || latestTest.testNumber
        } : null
      },
      note: `This is EXACT data from the official ${dataSource} - no fake or realistic data used.`
    })

  } catch (error) {
    console.error("[FETCH-EXACT-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch exact MOT history",
      details: error instanceof Error ? error.message : "Unknown error",
      note: "Only exact data from official DVLA/DVSA APIs is used - no fake data is generated."
    }, { status: 500 })
  }
}
