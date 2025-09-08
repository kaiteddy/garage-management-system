import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-COLUMNS] Checking vehicle table structure...")

    // Get table structure
    const columnsResult = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    // Check for vehicles with MOT-related data
    const motDataResult = await sql`
      SELECT 
        registration,
        mot_status,
        mot_expiry_date,
        mot_last_checked,
        mot_test_date,
        mot_test_result,
        mot_test_number,
        updated_at
      FROM vehicles 
      WHERE mot_status IS NOT NULL
      AND (mot_expiry_date IS NOT NULL OR mot_test_date IS NOT NULL)
      LIMIT 5
    `

    // Check for any vehicles with test dates but no expiry dates
    const testDateOnlyResult = await sql`
      SELECT COUNT(*) as count
      FROM vehicles 
      WHERE mot_test_date IS NOT NULL 
      AND mot_expiry_date IS NULL
    `

    return NextResponse.json({
      success: true,
      data: {
        tableColumns: columnsResult,
        sampleMOTData: motDataResult,
        vehiclesWithTestDateOnly: parseInt(testDateOnlyResult[0].count)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-COLUMNS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug columns",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
