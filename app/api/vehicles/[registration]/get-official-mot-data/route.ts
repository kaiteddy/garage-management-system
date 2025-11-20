import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"
import { getDVSAAccessToken } from "@/lib/dvsa-auth"

export async function POST(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    console.log(`[GET-OFFICIAL-MOT] 🔍 Getting OFFICIAL MOT data for ${registration}`)

    const cleanReg = registration.toUpperCase().replace(/\s/g, '')
    
    // Get DVSA API credentials
    const dvsaApiKey = process.env.DVSA_API_KEY
    if (!dvsaApiKey) {
      return NextResponse.json({
        success: false,
        error: "DVSA API key not configured",
        note: "Cannot fetch official MOT data without proper API credentials"
      })
    }

    // Get access token
    console.log(`[GET-OFFICIAL-MOT] 🔑 Getting DVSA access token...`)
    const accessToken = await getDVSAAccessToken()
    
    // Call official DVSA MOT History API
    console.log(`[GET-OFFICIAL-MOT] 📡 Calling official DVSA MOT History API for ${cleanReg}`)
    
    const apiUrl = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-api-key": dvsaApiKey,
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "User-Agent": "OfficialMOTChecker/1.0",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[GET-OFFICIAL-MOT] ❌ DVSA API error: ${response.status} - ${errorText}`)
      
      return NextResponse.json({
        success: false,
        error: `Official DVSA API returned ${response.status}`,
        details: errorText,
        registration: registration,
        note: "This is the official DVSA MOT History API - if it returns an error, the vehicle may not be found in their system or there may be API access issues."
      })
    }

    const officialData = await response.json()
    console.log(`[GET-OFFICIAL-MOT] ✅ Official DVSA data received for ${cleanReg}:`, officialData)

    // Clear existing MOT history for this vehicle
    await sql`
      DELETE FROM mot_history 
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
    `

    let inserted = 0
    
    // Process official MOT test history
    if (officialData.motTestHistory && officialData.motTestHistory.length > 0) {
      console.log(`[GET-OFFICIAL-MOT] 📊 Processing ${officialData.motTestHistory.length} official MOT tests`)
      
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
              has_failures,
              has_advisories,
              defects,
              advisories
            ) VALUES (
              ${registration},
              ${test.completedDate},
              ${test.expiryDate},
              ${test.testResult},
              ${test.odometerValue ? parseInt(test.odometerValue.toString()) : null},
              ${test.odometerUnit || 'mi'},
              ${test.motTestNumber},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) : false},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'ADVISORY') : false},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) || [])},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'ADVISORY') || [])}
            )
          `
          inserted++
        } catch (error) {
          console.error(`[GET-OFFICIAL-MOT] ❌ Error inserting official MOT test:`, error)
        }
      }
    }

    // Update vehicle with latest official MOT information
    const latestTest = officialData.motTestHistory?.[0]
    if (latestTest) {
      await sql`
        UPDATE vehicles 
        SET 
          mot_status = ${latestTest.testResult === 'PASSED' ? 'Valid' : latestTest.testResult === 'FAILED' ? 'Invalid' : 'Unknown'},
          mot_expiry_date = ${latestTest.expiryDate},
          mot_test_date = ${latestTest.completedDate},
          mot_test_number = ${latestTest.motTestNumber},
          mot_test_result = ${latestTest.testResult},
          mot_odometer_value = ${latestTest.odometerValue ? parseInt(latestTest.odometerValue.toString()) : null},
          mot_odometer_unit = ${latestTest.odometerUnit || 'mi'},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
      `
    }

    console.log(`[GET-OFFICIAL-MOT] ✅ Successfully imported ${inserted} official MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} official MOT records from DVSA API`,
      registration: registration,
      motHistoryCount: inserted,
      officialData: {
        source: "OFFICIAL_DVSA_MOT_HISTORY_API",
        vehicleInfo: {
          make: officialData.make,
          model: officialData.model,
          primaryColour: officialData.primaryColour,
          fuelType: officialData.fuelType,
          yearOfManufacture: officialData.yearOfManufacture
        },
        testCount: officialData.motTestHistory?.length || 0,
        latestTest: latestTest ? {
          testDate: latestTest.completedDate,
          result: latestTest.testResult,
          expiryDate: latestTest.expiryDate,
          mileage: latestTest.odometerValue,
          testNumber: latestTest.motTestNumber,
          defectsCount: latestTest.rfrAndComments?.filter((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous).length || 0,
          advisoriesCount: latestTest.rfrAndComments?.filter((c: any) => c.type === 'ADVISORY').length || 0
        } : null
      },
      note: "This is OFFICIAL data from the DVSA MOT History API - completely authentic and exact."
    })

  } catch (error) {
    console.error("[GET-OFFICIAL-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get official MOT data",
      details: error instanceof Error ? error.message : "Unknown error",
      note: "Only official DVSA API data is used - no fake or estimated data."
    }, { status: 500 })
  }
}
