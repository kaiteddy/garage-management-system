import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-FIX-LOGIC] Analyzing why fix keeps finding same vehicles...")

    // Check vehicles by status and expiry date presence
    const statusAnalysis = await sql`
      SELECT 
        mot_status,
        COUNT(*) as total,
        COUNT(CASE WHEN mot_expiry_date IS NULL THEN 1 END) as missing_expiry,
        COUNT(CASE WHEN mot_expiry_date IS NOT NULL THEN 1 END) as has_expiry
      FROM vehicles 
      WHERE mot_status IS NOT NULL
      GROUP BY mot_status
      ORDER BY total DESC
    `

    // Check what the fix script is currently targeting
    const fixTargets = await sql`
      SELECT 
        COUNT(*) as count,
        array_agg(registration ORDER BY mot_last_checked DESC) FILTER (WHERE registration IS NOT NULL) as sample_registrations
      FROM vehicles 
      WHERE mot_status IN ('Valid', 'VALID', 'valid')
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
    `

    // Check if there are vehicles with other statuses missing expiry dates
    const otherStatusMissing = await sql`
      SELECT 
        mot_status,
        COUNT(*) as count,
        array_agg(registration ORDER BY mot_last_checked DESC) FILTER (WHERE registration IS NOT NULL) as sample_registrations
      FROM vehicles 
      WHERE mot_status NOT IN ('Valid', 'VALID', 'valid')
      AND mot_status IS NOT NULL
      AND mot_expiry_date IS NULL
      AND registration IS NOT NULL
      AND registration != ''
      GROUP BY mot_status
      ORDER BY count DESC
    `

    // Check the last few vehicles that were processed
    const recentlyProcessed = await sql`
      SELECT 
        registration,
        mot_status,
        mot_expiry_date,
        mot_last_checked,
        updated_at
      FROM vehicles 
      WHERE mot_last_checked IS NOT NULL
      ORDER BY mot_last_checked DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      analysis: {
        statusBreakdown: statusAnalysis,
        currentFixTargets: {
          count: parseInt(fixTargets[0].count),
          sampleRegistrations: fixTargets[0].sample_registrations?.slice(0, 5) || []
        },
        otherStatusesMissingExpiry: otherStatusMissing,
        recentlyProcessed
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-FIX-LOGIC] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug fix logic",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
