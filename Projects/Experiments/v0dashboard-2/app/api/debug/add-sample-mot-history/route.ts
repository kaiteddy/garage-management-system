import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[ADD-SAMPLE-MOT] Adding sample MOT history data...")

    // Add sample MOT history data for testing the visualization
    const motHistoryData = [
      // 2024 MOT Test (Most Recent)
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2024-02-13',
        expiry_date: '2025-02-13',
        test_result: 'PASSED',
        odometer_value: 118500,
        odometer_unit: 'mi',
        mot_test_number: '202402131234567',
        has_failures: false,
        has_advisories: true
      },
      // 2023 MOT Test
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2023-02-15',
        expiry_date: '2024-02-15',
        test_result: 'PASSED',
        odometer_value: 106200,
        odometer_unit: 'mi',
        mot_test_number: '202302151234568',
        has_failures: false,
        has_advisories: false
      },
      // 2022 MOT Test
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2022-02-18',
        expiry_date: '2023-02-18',
        test_result: 'PASSED',
        odometer_value: 94800,
        odometer_unit: 'mi',
        mot_test_number: '202202181234569',
        has_failures: false,
        has_advisories: true
      },
      // 2021 MOT Test (Failed)
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2021-02-20',
        expiry_date: '2022-02-20',
        test_result: 'FAILED',
        odometer_value: 83400,
        odometer_unit: 'mi',
        mot_test_number: '202102201234570',
        has_failures: true,
        has_advisories: false
      },
      // 2021 Retest (Passed)
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2021-02-25',
        expiry_date: '2022-02-25',
        test_result: 'PASSED',
        odometer_value: 83420,
        odometer_unit: 'mi',
        mot_test_number: '202102251234571',
        has_failures: false,
        has_advisories: true
      },
      // 2020 MOT Test
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2020-02-22',
        expiry_date: '2021-02-22',
        test_result: 'PASSED',
        odometer_value: 72100,
        odometer_unit: 'mi',
        mot_test_number: '202002221234572',
        has_failures: false,
        has_advisories: false
      },
      // 2019 MOT Test (First MOT)
      {
        registration: 'HY66DNJ',
        vehicle_registration: 'HY66 DNJ',
        test_date: '2019-02-25',
        expiry_date: '2020-02-25',
        test_result: 'PASSED',
        odometer_value: 58900,
        odometer_unit: 'mi',
        mot_test_number: '201902251234573',
        has_failures: false,
        has_advisories: true
      }
    ]

    // Insert MOT history records
    let insertedCount = 0
    for (const record of motHistoryData) {
      try {
        await sql`
          INSERT INTO mot_history (
            vehicle_registration,
            test_date,
            expiry_date,
            test_result,
            odometer_value,
            odometer_unit,
            mot_test_number
          ) VALUES (
            ${record.vehicle_registration},
            ${record.test_date},
            ${record.expiry_date},
            ${record.test_result},
            ${record.odometer_value},
            ${record.odometer_unit},
            ${record.mot_test_number}
          )
        `
        insertedCount++
      } catch (error) {
        console.log(`Skipping duplicate record: ${record.mot_test_number}`)
      }
    }

    // Update the main vehicle record with current MOT status
    await sql`
      UPDATE vehicles
      SET
        mot_status = 'Valid',
        mot_expiry_date = '2025-02-13',
        mot_test_date = '2024-02-13',
        mot_test_number = '202402131234567',
        mot_last_checked = NOW(),
        tax_status = 'Valid',
        tax_due_date = '2025-04-01'
      WHERE registration = 'HY66DNJ' OR registration = 'HY66 DNJ'
    `

    return NextResponse.json({
      success: true,
      message: `Added ${insertedCount} MOT history records and updated vehicle status`,
      data: {
        recordsInserted: insertedCount,
        vehicleUpdated: true
      }
    })

  } catch (error) {
    console.error("[ADD-SAMPLE-MOT] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add sample MOT history",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
