import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-HISTORY] Checking MOT history table...")

    // Check if mot_history table exists and has data
    const historyCountResult = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    // Get sample MOT history data
    const historySampleResult = await sql`
      SELECT 
        registration,
        test_date,
        test_result,
        expiry_date,
        created_at
      FROM mot_history 
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Check for vehicles that have history but no expiry date in main table
    const mismatchResult = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      WHERE v.mot_status IN ('Valid', 'VALID')
      AND v.mot_expiry_date IS NULL
      AND EXISTS (
        SELECT 1 FROM mot_history h 
        WHERE h.registration = v.registration 
        AND h.expiry_date IS NOT NULL
      )
    `

    // Get sample of vehicles that could be updated
    const updateCandidatesResult = await sql`
      SELECT 
        v.registration,
        v.mot_status,
        v.mot_expiry_date as current_expiry,
        h.expiry_date as history_expiry,
        h.test_result,
        h.test_date
      FROM vehicles v
      JOIN mot_history h ON h.registration = v.registration
      WHERE v.mot_status IN ('Valid', 'VALID')
      AND v.mot_expiry_date IS NULL
      AND h.expiry_date IS NOT NULL
      ORDER BY h.test_date DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      data: {
        historyRecordCount: parseInt(historyCountResult[0].count),
        historySample: historySampleResult,
        vehiclesWithMismatch: parseInt(mismatchResult[0].count),
        updateCandidates: updateCandidatesResult
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-HISTORY] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug MOT history",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
