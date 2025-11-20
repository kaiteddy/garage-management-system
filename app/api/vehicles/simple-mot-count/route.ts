import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Simple counts
    const [totalVehicles, totalMotRecords, exampleChecks] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL`,
      sql`SELECT COUNT(*) as count FROM mot_history`,
      sql`
        SELECT 
          'FV10SFK' as reg,
          (SELECT COUNT(*) FROM mot_history WHERE vehicle_registration = 'FV10SFK') as mot_count
        UNION ALL
        SELECT 
          'FP63MTK' as reg,
          (SELECT COUNT(*) FROM mot_history WHERE vehicle_registration = 'FP63MTK') as mot_count
        UNION ALL
        SELECT 
          'NG07LML' as reg,
          (SELECT COUNT(*) FROM mot_history WHERE vehicle_registration = 'NG07 LML') as mot_count
      `
    ])

    return NextResponse.json({
      success: true,
      totalVehicles: parseInt(totalVehicles[0].count),
      totalMotRecords: parseInt(totalMotRecords[0].count),
      examples: exampleChecks
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
