import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CURRENT-CRITICAL] Finding vehicles with current MOT requirements...")

    // Get vehicles that are likely to have current MOT requirements
    // Focus on vehicles from 2020 onwards (3+ years old, need MOT)
    const currentVehicles = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.year,
        v.mot_status,
        v.mot_expiry_date,
        v.mot_last_checked,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        CASE
          WHEN v.year >= 2021 THEN 'likely_needs_mot'
          WHEN v.year >= 2018 THEN 'definitely_needs_mot'
          WHEN v.year IS NULL THEN 'unknown_age'
          ELSE 'old_vehicle'
        END as mot_requirement_status,
        CASE
          WHEN v.mot_expiry_date IS NOT NULL AND v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date IS NOT NULL AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'due_soon'
          WHEN v.mot_expiry_date IS NOT NULL THEN 'valid'
          ELSE 'no_data'
        END as current_status
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration IS NOT NULL
        AND v.registration != ''
        AND (
          v.year >= 2018
          OR v.year IS NULL
        )
        AND (
          v.mot_expiry_date IS NULL
          OR v.mot_expiry_date < CURRENT_DATE + INTERVAL '30 days'
          OR v.mot_last_checked IS NULL
          OR v.mot_last_checked < CURRENT_DATE - INTERVAL '30 days'
        )
      ORDER BY
        CASE
          WHEN v.mot_expiry_date IS NOT NULL AND v.mot_expiry_date < CURRENT_DATE THEN 1
          WHEN v.mot_expiry_date IS NOT NULL AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 2
          WHEN v.mot_last_checked IS NULL THEN 3
          ELSE 4
        END,
        v.year DESC,
        v.mot_expiry_date ASC
      LIMIT 200
    `

    // Get summary statistics
    const summary = {
      total: currentVehicles.length,
      expired: currentVehicles.filter(v => v.current_status === 'expired').length,
      dueSoon: currentVehicles.filter(v => v.current_status === 'due_soon').length,
      noData: currentVehicles.filter(v => v.current_status === 'no_data').length,
      valid: currentVehicles.filter(v => v.current_status === 'valid').length,
      likelyNeedsMot: currentVehicles.filter(v => v.mot_requirement_status === 'likely_needs_mot').length,
      definitelyNeedsMot: currentVehicles.filter(v => v.mot_requirement_status === 'definitely_needs_mot').length,
      withCustomers: currentVehicles.filter(v => v.first_name && v.last_name).length
    }

    // Get vehicles by year for analysis
    const yearAnalysis = await sql`
      SELECT
        v.year,
        COUNT(*) as total_vehicles,
        COUNT(v.mot_expiry_date) as with_mot_data,
        COUNT(CASE WHEN v.mot_expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' AND v.mot_expiry_date >= CURRENT_DATE THEN 1 END) as due_soon
      FROM vehicles v
      WHERE v.year IS NOT NULL
        AND v.year >= 2015
      GROUP BY v.year
      ORDER BY v.year DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      message: "Found current vehicles that need MOT attention",
      summary,
      vehicles: currentVehicles,
      yearAnalysis,
      recommendations: {
        priorityVehicles: currentVehicles.filter(v =>
          v.current_status === 'expired' ||
          v.current_status === 'due_soon' ||
          (v.current_status === 'no_data' && v.year >= 2020)
        ).slice(0, 50),
        needsDataUpdate: currentVehicles.filter(v =>
          v.current_status === 'no_data' && v.year >= 2018
        ).slice(0, 100)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CURRENT-CRITICAL] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get current critical vehicles",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
