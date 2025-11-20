import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'NG07 LML'
    
    console.log(`[DEBUG-MOT-HISTORY] 🔍 Checking MOT history table for ${registration}`)

    // Check if mot_history table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'mot_history'
      )
    `

    if (!tableExists[0].exists) {
      return NextResponse.json({
        success: false,
        error: "mot_history table does not exist"
      })
    }

    // Get all MOT history for this vehicle
    const motHistory = await sql`
      SELECT 
        id,
        registration,
        test_date,
        expiry_date,
        test_result,
        odometer_value,
        odometer_unit,
        test_number,
        has_failures,
        has_advisories,
        created_at
      FROM mot_history
      WHERE UPPER(REPLACE(registration, ' ', '')) = ${registration.toUpperCase().replace(/\s/g, '')}
      ORDER BY test_date DESC
    `

    // Get total count in table
    const totalCount = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    // Get sample of all registrations in table
    const allRegistrations = await sql`
      SELECT DISTINCT registration, COUNT(*) as test_count
      FROM mot_history
      GROUP BY registration
      ORDER BY test_count DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      tableExists: true,
      registration: registration,
      motHistoryCount: motHistory.length,
      motHistory: motHistory,
      totalRecordsInTable: totalCount[0].count,
      sampleRegistrations: allRegistrations
    })

  } catch (error) {
    console.error("[DEBUG-MOT-HISTORY] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check MOT history table",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
