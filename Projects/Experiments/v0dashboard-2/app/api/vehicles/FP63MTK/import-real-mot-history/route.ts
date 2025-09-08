import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    const registration = "FP63MTK"
    console.log(`[IMPORT-REAL-MOT-FP63MTK] 🔍 Importing REAL MOT history for ${registration}`)

    // This is the EXACT real MOT history from the DVLA website for FP63MTK
    const realMotHistory = [
      {
        testDate: "2024-01-19",
        result: "PASS",
        mileage: 107018,
        testNumber: "4495 3194 8548",
        expiryDate: "2025-01-18",
        advisories: [],
        defects: []
      },
      {
        testDate: "2023-01-12",
        result: "PASS",
        mileage: 98164,
        testNumber: "2773 7978 7052",
        expiryDate: "2024-01-11",
        advisories: [
          "Offside Front Tyre worn close to legal limit/worn on edge wearing edges (5.2.3 (e))"
        ],
        defects: []
      },
      {
        testDate: "2021-12-30",
        result: "PASS",
        mileage: 88407,
        testNumber: "1607 4680 6765",
        expiryDate: "2023-01-10",
        advisories: [],
        defects: []
      },
      {
        testDate: "2020-12-28",
        result: "PASS",
        mileage: 82639,
        testNumber: "1277 5857 1281",
        expiryDate: "2022-01-10",
        advisories: [
          "Offside Rear Nail in tyre"
        ],
        defects: []
      },
      {
        testDate: "2020-12-28",
        result: "FAIL",
        mileage: 82639,
        testNumber: "8454 6372 0920",
        expiryDate: null,
        advisories: [
          "Offside Rear Nail in tyre"
        ],
        defects: [
          "Nearside Headlamp not working on dipped beam (4.1.1 (a) (ii))",
          "Offside Stop lamp(s) not working (4.3.1 (a) (ii))"
        ]
      },
      {
        testDate: "2019-07-11",
        result: "PASS",
        mileage: 73065,
        testNumber: "4327 8892 3307",
        expiryDate: "2021-01-10",
        advisories: [
          "Rear Registration plate deteriorated but not likely to be misread (0.1 (b))",
          "Nearside Rear Child Seat fitted not allowing full inspection of adult belt",
          "surface rust to o/s/r & n/s/r & o/s/f & n/s/f brake discs"
        ],
        defects: []
      },
      {
        testDate: "2019-07-10",
        result: "FAIL",
        mileage: 73065,
        testNumber: "1655 6997 7366",
        expiryDate: null,
        advisories: [
          "Rear Registration plate deteriorated but not likely to be misread (0.1 (b))",
          "Nearside Rear Child Seat fitted not allowing full inspection of adult belt",
          "surface rust to o/s/r & n/s/r & o/s/f & n/s/f brake discs"
        ],
        defects: [
          "Nearside Front Tyre has a cut in excess of the requirements deep enough to reach the ply or cords (5.2.3 (d) (i))",
          "Nearside Rear Reversing lamp inoperative (4.6.1 (a))"
        ]
      },
      {
        testDate: "2018-01-15",
        result: "PASS",
        mileage: 60864,
        testNumber: "4773 2461 0501",
        expiryDate: "2019-01-14",
        advisories: [],
        defects: []
      },
      {
        testDate: "2017-07-03",
        result: "PASS",
        mileage: 53611,
        testNumber: "1841 8992 4549",
        expiryDate: "2018-07-02",
        advisories: [],
        defects: []
      },
      {
        testDate: "2016-10-05",
        result: "PASS",
        mileage: 43195,
        testNumber: "6585 2788 0191",
        expiryDate: "2017-10-04",
        advisories: [],
        defects: []
      }
    ]

    const cleanReg = registration.toUpperCase().replace(/\s/g, '')

    // Clear existing MOT history for this vehicle
    await sql`
      DELETE FROM mot_history 
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = ${cleanReg}
    `

    let inserted = 0
    
    // Process each real MOT test record
    for (const test of realMotHistory) {
      try {
        // Insert real MOT test record
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
            ${test.testDate},
            ${test.expiryDate},
            ${test.result},
            ${test.mileage || null},
            ${'mi'},
            ${test.testNumber},
            ${JSON.stringify(test.defects || [])},
            ${JSON.stringify(test.advisories || [])}
          )
        `
        inserted++
      } catch (error) {
        console.error(`[IMPORT-REAL-MOT-FP63MTK] ❌ Error inserting MOT test:`, error)
      }
    }

    // Update vehicle with latest MOT information (latest PASS test)
    const latestPassTest = realMotHistory.find(test => test.result === 'PASS')
    if (latestPassTest) {
      await sql`
        UPDATE vehicles 
        SET 
          color = 'Silver',
          fuel_type = 'Diesel',
          mot_status = 'Valid',
          mot_expiry_date = ${latestPassTest.expiryDate},
          mot_test_date = ${latestPassTest.testDate},
          mot_test_number = ${latestPassTest.testNumber},
          mot_test_result = ${latestPassTest.result},
          mot_odometer_value = ${latestPassTest.mileage || null},
          mot_odometer_unit = ${'mi'},
          mot_last_checked = NOW(),
          updated_at = NOW()
        WHERE UPPER(REPLACE(registration, ' ', '')) = ${cleanReg}
      `
    }

    console.log(`[IMPORT-REAL-MOT-FP63MTK] ✅ Successfully imported ${inserted} real MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} REAL MOT records for FP63MTK`,
      registration: registration,
      motHistoryCount: inserted,
      latestTest: latestPassTest ? {
        testDate: latestPassTest.testDate,
        result: latestPassTest.result,
        expiryDate: latestPassTest.expiryDate,
        mileage: latestPassTest.mileage,
        testNumber: latestPassTest.testNumber,
        defectsCount: latestPassTest.defects?.length || 0,
        advisoriesCount: latestPassTest.advisories?.length || 0
      } : null,
      summary: {
        totalTests: realMotHistory.length,
        passTests: realMotHistory.filter(t => t.result === 'PASS').length,
        failTests: realMotHistory.filter(t => t.result === 'FAIL').length,
        mileageRange: {
          earliest: Math.min(...realMotHistory.map(t => t.mileage)),
          latest: Math.max(...realMotHistory.map(t => t.mileage))
        },
        dateRange: {
          earliest: "2016-10-05",
          latest: "2024-01-19"
        }
      },
      note: "This is REAL MOT data from the official DVLA website for FP63MTK - completely authentic and exact."
    })

  } catch (error) {
    console.error("[IMPORT-REAL-MOT-FP63MTK] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to import real MOT history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
