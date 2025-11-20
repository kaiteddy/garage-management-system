import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: Request,
  { params }: { params: { registration: string } }
) {
  try {
    const registration = decodeURIComponent(params.registration)
    console.log(`[FETCH-COMPLETE-MOT] 🔍 Fetching complete MOT history for ${registration}`)

    // First, let's try to get MOT data from the DVSA API
    const motCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://f17fee16adb2.ngrok-free.app'}/api/mot-check?registration=${encodeURIComponent(registration)}`)
    
    if (!motCheckResponse.ok) {
      console.log(`[FETCH-COMPLETE-MOT] ❌ MOT check API failed with status ${motCheckResponse.status}`)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch MOT data from DVSA",
        details: `API returned status ${motCheckResponse.status}`
      })
    }

    const motData = await motCheckResponse.json()
    console.log(`[FETCH-COMPLETE-MOT] 📊 MOT check response:`, motData)

    if (!motData.success) {
      console.log(`[FETCH-COMPLETE-MOT] ❌ MOT check failed:`, motData.error)
      return NextResponse.json({
        success: false,
        error: "MOT check failed",
        details: motData.error,
        apiErrors: motData.apiErrors
      })
    }

    // If we have MOT history, let's store it in the database
    if (motData.motHistory && motData.motHistory.length > 0) {
      console.log(`[FETCH-COMPLETE-MOT] ✅ Found ${motData.motHistory.length} MOT records`)
      
      // Clear existing MOT history for this vehicle
      await sql`
        DELETE FROM mot_history 
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, '')}
      `

      // Insert new MOT history records
      let inserted = 0
      for (const test of motData.motHistory) {
        try {
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
              ${test.testDate || test.completedDate},
              ${test.expiryDate},
              ${test.testResult || test.result},
              ${test.odometerValue || test.mileage || 0},
              ${test.odometerUnit || 'mi'},
              ${test.testNumber || test.motTestNumber || 'Unknown'},
              ${test.defects && test.defects.length > 0},
              ${test.advisories && test.advisories.length > 0},
              ${JSON.stringify(test.defects || [])},
              ${JSON.stringify(test.advisories || [])}
            )
          `
          inserted++
        } catch (error) {
          console.error(`[FETCH-COMPLETE-MOT] ❌ Error inserting MOT record:`, error)
        }
      }

      console.log(`[FETCH-COMPLETE-MOT] ✅ Inserted ${inserted} MOT records`)

      // Update vehicle with latest MOT info
      const latestTest = motData.motHistory[0]
      if (latestTest) {
        await sql`
          UPDATE vehicles 
          SET 
            mot_status = ${motData.motStatus || 'Unknown'},
            mot_expiry_date = ${latestTest.expiryDate},
            mot_test_date = ${latestTest.testDate || latestTest.completedDate},
            mot_test_number = ${latestTest.testNumber || latestTest.motTestNumber},
            mot_test_result = ${latestTest.testResult || latestTest.result},
            mot_odometer_value = ${latestTest.odometerValue || latestTest.mileage},
            mot_odometer_unit = ${latestTest.odometerUnit || 'mi'},
            mot_last_checked = NOW(),
            updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, '')}
        `
      }

      return NextResponse.json({
        success: true,
        message: `Successfully fetched and stored complete MOT history for ${registration}`,
        motHistoryCount: inserted,
        motStatus: motData.motStatus,
        latestTest: latestTest
      })

    } else {
      console.log(`[FETCH-COMPLETE-MOT] ❌ No MOT history found in response`)
      return NextResponse.json({
        success: false,
        error: "No MOT history found",
        details: "DVSA API returned no MOT test records for this vehicle"
      })
    }

  } catch (error) {
    console.error("[FETCH-COMPLETE-MOT] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch complete MOT history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
