import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[MOT-DASHBOARD] 🔍 Generating MOT management dashboard")

    // Get comprehensive MOT statistics
    const totalVehicles = await sql`
      SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''
    `

    const vehiclesWithMotHistory = await sql`
      SELECT COUNT(DISTINCT UPPER(REPLACE(vehicle_registration, ' ', ''))) as count FROM mot_history
    `

    const totalMotRecords = await sql`
      SELECT COUNT(*) as count FROM mot_history
    `

    const recentlyUpdated = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE mot_last_checked > NOW() - INTERVAL '24 hours'
    `

    const neverChecked = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE registration IS NOT NULL 
      AND registration != ''
      AND mot_last_checked IS NULL
    `

    // Get MOT status breakdown
    const motStatusBreakdown = await sql`
      SELECT 
        mot_status,
        COUNT(*) as count
      FROM vehicles 
      WHERE registration IS NOT NULL 
      AND registration != ''
      GROUP BY mot_status
      ORDER BY count DESC
    `

    // Get vehicles with most MOT history
    const vehiclesWithMostHistory = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.mot_status,
        v.mot_expiry_date,
        COUNT(mh.vehicle_registration) as mot_test_count,
        MAX(mh.test_date) as latest_test_date,
        MIN(mh.test_date) as earliest_test_date
      FROM vehicles v
      JOIN mot_history mh ON UPPER(REPLACE(mh.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      GROUP BY v.registration, v.make, v.model, v.mot_status, v.mot_expiry_date
      ORDER BY COUNT(mh.vehicle_registration) DESC
      LIMIT 10
    `

    // Get vehicles needing urgent attention
    const urgentVehicles = await sql`
      SELECT 
        registration,
        make,
        model,
        mot_status,
        mot_expiry_date,
        mot_last_checked,
        CASE 
          WHEN mot_expiry_date < NOW() THEN 'EXPIRED'
          WHEN mot_expiry_date < NOW() + INTERVAL '30 days' THEN 'EXPIRING_SOON'
          WHEN mot_last_checked IS NULL THEN 'NEVER_CHECKED'
          ELSE 'OK'
        END as urgency_level
      FROM vehicles
      WHERE registration IS NOT NULL 
      AND registration != ''
      AND (
        mot_expiry_date < NOW() + INTERVAL '30 days'
        OR mot_last_checked IS NULL
        OR mot_status IN ('Invalid', 'Expired', 'Not valid')
      )
      ORDER BY 
        CASE 
          WHEN mot_expiry_date < NOW() THEN 1
          WHEN mot_expiry_date < NOW() + INTERVAL '7 days' THEN 2
          WHEN mot_expiry_date < NOW() + INTERVAL '30 days' THEN 3
          WHEN mot_last_checked IS NULL THEN 4
          ELSE 5
        END,
        mot_expiry_date ASC
      LIMIT 20
    `

    // Get recent MOT test activity
    const recentMotActivity = await sql`
      SELECT 
        mh.vehicle_registration,
        mh.test_date,
        mh.test_result,
        mh.expiry_date,
        mh.odometer_value,
        v.make,
        v.model
      FROM mot_history mh
      JOIN vehicles v ON UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(mh.vehicle_registration, ' ', ''))
      ORDER BY mh.test_date DESC
      LIMIT 15
    `

    // Get API usage statistics
    const apiUsageStats = await sql`
      SELECT 
        DATE(mot_last_checked) as check_date,
        COUNT(*) as vehicles_checked
      FROM vehicles
      WHERE mot_last_checked IS NOT NULL
      AND mot_last_checked > NOW() - INTERVAL '7 days'
      GROUP BY DATE(mot_last_checked)
      ORDER BY check_date DESC
    `

    // Calculate coverage percentage
    const coveragePercentage = Math.round(
      (parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100
    )

    return NextResponse.json({
      success: true,
      dashboard: {
        overview: {
          totalVehicles: parseInt(totalVehicles[0].count),
          vehiclesWithMotHistory: parseInt(vehiclesWithMotHistory[0].count),
          totalMotRecords: parseInt(totalMotRecords[0].count),
          coveragePercentage: coveragePercentage,
          recentlyUpdated: parseInt(recentlyUpdated[0].count),
          neverChecked: parseInt(neverChecked[0].count)
        },
        motStatusBreakdown: motStatusBreakdown,
        topPerformers: vehiclesWithMostHistory,
        urgentAttention: urgentVehicles,
        recentActivity: recentMotActivity,
        apiUsage: apiUsageStats,
        recommendations: {
          priorityActions: [
            {
              action: "Update vehicles with no MOT history",
              count: parseInt(totalVehicles[0].count) - parseInt(vehiclesWithMotHistory[0].count),
              endpoint: "/api/vehicles/bulk-update-mot-history"
            },
            {
              action: "Check vehicles never scanned",
              count: parseInt(neverChecked[0].count),
              endpoint: "/api/vehicles/validate-mot-data"
            },
            {
              action: "Review expired MOT vehicles",
              count: urgentVehicles.filter(v => v.urgency_level === 'EXPIRED').length,
              endpoint: "/api/vehicles/mot-reminders"
            }
          ]
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: "Official DVSA MOT History API",
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("[MOT-DASHBOARD] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate MOT management dashboard",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
