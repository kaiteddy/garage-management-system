import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    console.log(`[IMPORT-REAL-MOT] 🔍 Importing real MOT history for ${registration}`)

    // Use the DVLA Open Data API for MOT history
    const cleanReg = registration.toUpperCase().replace(/\s/g, '')
    
    // First try the DVLA vehicle enquiry API
    const dvlaApiKey = process.env.DVLA_API_KEY
    if (!dvlaApiKey) {
      return NextResponse.json({
        success: false,
        error: "DVLA API key not configured"
      })
    }

    console.log(`[IMPORT-REAL-MOT] 📡 Calling DVLA API for ${cleanReg}`)
    
    // Call DVLA vehicle enquiry API
    const dvlaResponse = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": dvlaApiKey,
        "User-Agent": "MOTHistoryImporter/1.0",
      },
      body: JSON.stringify({
        registrationNumber: cleanReg,
      }),
    })

    if (!dvlaResponse.ok) {
      console.error(`[IMPORT-REAL-MOT] ❌ DVLA API error: ${dvlaResponse.status}`)
      return NextResponse.json({
        success: false,
        error: `DVLA API error: ${dvlaResponse.status}`,
        details: await dvlaResponse.text()
      })
    }

    const dvlaData = await dvlaResponse.json()
    console.log(`[IMPORT-REAL-MOT] ✅ DVLA data received:`, dvlaData)

    // Now try the DVSA MOT History API
    const dvsaApiKey = process.env.DVSA_API_KEY
    if (!dvsaApiKey) {
      return NextResponse.json({
        success: false,
        error: "DVSA API key not configured"
      })
    }

    // Get DVSA access token
    const tokenResponse = await fetch("https://login.microsoftonline.com/6c448d90-4ca1-4caf-ab59-0a2aa67d7801/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DVSA_CLIENT_ID || "",
        client_secret: process.env.DVSA_CLIENT_SECRET || "",
        scope: "https://mot-history.api.gov.uk/.default",
        grant_type: "client_credentials",
      }),
    })

    if (!tokenResponse.ok) {
      console.error(`[IMPORT-REAL-MOT] ❌ DVSA token error: ${tokenResponse.status}`)
      return NextResponse.json({
        success: false,
        error: "Failed to get DVSA access token"
      })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log(`[IMPORT-REAL-MOT] 📡 Calling DVSA MOT History API for ${cleanReg}`)

    // Call DVSA MOT History API
    const motResponse = await fetch(`https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${cleanReg}`, {
      method: "GET",
      headers: {
        "x-api-key": dvsaApiKey,
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "User-Agent": "MOTHistoryImporter/1.0",
      },
    })

    if (!motResponse.ok) {
      console.error(`[IMPORT-REAL-MOT] ❌ DVSA MOT API error: ${motResponse.status}`)
      return NextResponse.json({
        success: false,
        error: `DVSA MOT API error: ${motResponse.status}`,
        details: await motResponse.text()
      })
    }

    const motData = await motResponse.json()
    console.log(`[IMPORT-REAL-MOT] ✅ DVSA MOT data received:`, motData)

    // Clear existing MOT history for this vehicle
    await sql`
      DELETE FROM mot_history 
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
    `

    let inserted = 0
    
    // Process MOT test history
    if (motData.motTestHistory && motData.motTestHistory.length > 0) {
      console.log(`[IMPORT-REAL-MOT] 📊 Processing ${motData.motTestHistory.length} MOT tests`)
      
      for (const test of motData.motTestHistory) {
        try {
          // Insert MOT test record
          await sql`
            INSERT INTO mot_history (
              registration,
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
              ${test.motTestNumber},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) : false},
              ${test.rfrAndComments ? test.rfrAndComments.some((c: any) => c.type === 'ADVISORY') : false},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'FAIL' || c.type === 'MAJOR' || c.dangerous) || [])},
              ${JSON.stringify(test.rfrAndComments?.filter((c: any) => c.type === 'ADVISORY') || [])}
            )
          `
          inserted++
        } catch (error) {
          console.error(`[IMPORT-REAL-MOT] ❌ Error inserting MOT test:`, error)
        }
      }
    }

    // Update vehicle with latest MOT information
    const latestTest = motData.motTestHistory?.[0]
    if (latestTest) {
      await sql`
        UPDATE vehicles 
        SET 
          mot_status = ${dvlaData.motStatus || 'Unknown'},
          mot_expiry_date = ${dvlaData.motExpiryDate || latestTest.expiryDate},
          mot_test_date = ${latestTest.completedDate},
          mot_test_number = ${latestTest.motTestNumber},
          mot_test_result = ${latestTest.testResult},
          mot_odometer_value = ${latestTest.odometerValue ? parseInt(latestTest.odometerValue) : null},
          mot_odometer_unit = ${latestTest.odometerUnit || 'mi'},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
      `
    }

    console.log(`[IMPORT-REAL-MOT] ✅ Successfully imported ${inserted} real MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} real MOT records from DVSA`,
      registration: registration,
      motHistoryCount: inserted,
      dvlaData: {
        motStatus: dvlaData.motStatus,
        motExpiryDate: dvlaData.motExpiryDate,
        make: dvlaData.make,
        model: dvlaData.model,
        yearOfManufacture: dvlaData.yearOfManufacture
      },
      latestTest: latestTest ? {
        testDate: latestTest.completedDate,
        result: latestTest.testResult,
        expiryDate: latestTest.expiryDate,
        mileage: latestTest.odometerValue,
        testNumber: latestTest.motTestNumber
      } : null
    })

  } catch (error) {
    console.error("[IMPORT-REAL-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to import real MOT history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
