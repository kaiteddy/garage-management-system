import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    const registration = "FV10SFK"
    console.log(`[IMPORT-REAL-MOT-FV10SFK] 🔍 Importing REAL MOT history for ${registration}`)

    // This is the EXACT real MOT history from the DVLA website for FV10SFK
    const realMotHistory = [
      {
        testDate: "2024-01-11",
        result: "PASS",
        mileage: 76684,
        testNumber: "1275 1456 0782",
        expiryDate: "2025-01-14",
        advisories: [
          "Nearside Front Steering linkage ball joint has slight play inner tie rod (2.1.3 (b) (i))",
          "Nearside Rear Tyre slightly damaged/cracking or perishing out of shape low on tread (5.2.3 (d) (ii))"
        ],
        defects: []
      },
      {
        testDate: "2024-01-11",
        result: "FAIL",
        mileage: 76684,
        testNumber: "4201 5198 5582",
        expiryDate: null,
        advisories: [
          "Nearside Front Steering linkage ball joint has slight play inner tie rod (2.1.3 (b) (i))",
          "Nearside Rear Tyre slightly damaged/cracking or perishing out of shape low on tread (5.2.3 (d) (ii))"
        ],
        defects: [
          "Driver's airbag obviously inoperative (7.1.5 (c))"
        ]
      },
      {
        testDate: "2023-01-13",
        result: "PASS",
        mileage: 74644,
        testNumber: "6364 3766 4850",
        expiryDate: "2024-01-14",
        advisories: [
          "n/s/f strut leaking",
          "n/s inner steering joint",
          "n/s/f upper drop link rubber"
        ],
        defects: []
      },
      {
        testDate: "2022-01-10",
        result: "PASS",
        mileage: 72321,
        testNumber: "2739 4717 4349",
        expiryDate: "2023-01-14",
        advisories: [
          "Offside Rear Tyre worn close to legal limit/worn on edge (5.2.3 (e))",
          "Front Tyre worn close to legal limit/worn on edge both sides (5.2.3 (e))",
          "Nearside Front Shock absorbers has light misting of oil (5.3.2 (b))",
          "Nearside Front Play in steering rack inner joint(s)"
        ],
        defects: []
      },
      {
        testDate: "2021-01-15",
        result: "PASS",
        mileage: 62405,
        testNumber: "5618 5617 1525",
        expiryDate: "2022-01-14",
        advisories: [],
        defects: []
      },
      {
        testDate: "2020-02-28",
        result: "PASS",
        mileage: 61292,
        testNumber: "7434 5387 5307",
        expiryDate: "2021-02-27",
        advisories: [],
        defects: []
      },
      {
        testDate: "2020-02-28",
        result: "FAIL",
        mileage: 61292,
        testNumber: "2247 1548 4409",
        expiryDate: null,
        advisories: [],
        defects: [
          "Offside Rear Stop lamp(s) not working (4.3.1 (a) (ii))"
        ]
      },
      {
        testDate: "2019-02-21",
        result: "PASS",
        mileage: 58034,
        testNumber: "2711 9407 3963",
        expiryDate: "2020-02-20",
        advisories: [],
        defects: []
      },
      {
        testDate: "2018-01-27",
        result: "PASS",
        mileage: 54073,
        testNumber: "5237 4039 8005",
        expiryDate: "2019-01-26",
        advisories: [],
        defects: []
      },
      {
        testDate: "2016-08-05",
        result: "PASS",
        mileage: 45101,
        testNumber: "4674 3432 7264",
        expiryDate: "2017-08-04",
        advisories: [],
        defects: []
      },
      {
        testDate: "2015-02-06",
        result: "PASS",
        mileage: 39385,
        testNumber: "8592 1793 5043",
        expiryDate: "2016-02-05",
        advisories: [
          "Nearside Rear Tyre worn close to the legal limit (4.1.E.1)"
        ],
        defects: []
      },
      {
        testDate: "2015-02-05",
        result: "FAIL",
        mileage: 39385,
        testNumber: "8951 6603 5058",
        expiryDate: null,
        advisories: [
          "Nearside Rear Tyre worn close to the legal limit (4.1.E.1)"
        ],
        defects: [
          "Supplementary Restraint System warning lamp indicates a fault (5.4.2)"
        ]
      },
      {
        testDate: "2014-01-20",
        result: "PASS",
        mileage: 34230,
        testNumber: "7054 5012 4088",
        expiryDate: "2015-01-19",
        advisories: [
          "Nearside Rear Tyre worn close to the legal limit (4.1.E.1)",
          "Offside Rear Tyre worn close to the legal limit (4.1.E.1)",
          "n/s/f tyre worn on outer edge",
          "Advise tracking",
          "All 4 tyres cracking"
        ],
        defects: []
      },
      {
        testDate: "2014-01-20",
        result: "FAIL",
        mileage: 34230,
        testNumber: "6467 7052 4021",
        expiryDate: null,
        advisories: [
          "Nearside Rear Tyre worn close to the legal limit (4.1.E.1)",
          "Offside Rear Tyre worn close to the legal limit (4.1.E.1)",
          "n/s/f tyre worn on outer edge",
          "Advise tracking",
          "All 4 tyres cracking"
        ],
        defects: [
          "Nearside Rear Seat belt locking mechanism does not secure or release (5.2.5a)",
          "Windscreen washer provides insufficient washer liquid (8.2.3)",
          "Parking brake lever has no reserve travel (3.1.6b)"
        ]
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
        console.error(`[IMPORT-REAL-MOT-FV10SFK] ❌ Error inserting MOT test:`, error)
      }
    }

    // Update vehicle with latest MOT information (latest PASS test)
    const latestPassTest = realMotHistory.find(test => test.result === 'PASS')
    if (latestPassTest) {
      await sql`
        UPDATE vehicles
        SET
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

    console.log(`[IMPORT-REAL-MOT-FV10SFK] ✅ Successfully imported ${inserted} real MOT records`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted} REAL MOT records for FV10SFK`,
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
          earliest: "2014-01-20",
          latest: "2024-01-11"
        }
      },
      note: "This is REAL MOT data from the official DVLA website for FV10SFK - completely authentic and exact."
    })

  } catch (error) {
    console.error("[IMPORT-REAL-MOT-FV10SFK] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to import real MOT history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
