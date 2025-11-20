import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DASHBOARD-API] Fetching live dashboard data...")

    // Get all core statistics in parallel for better performance
    const [
      customerCount,
      vehicleCount,
      documentCount,
      motCriticalCount,
      motDueSoonCount,
      motThisMonthCount,
      totalRevenue
    ] = await Promise.all([
      // Core counts
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE registration IS NOT NULL AND registration != ''`,
      
      // Document count
      sql`SELECT COUNT(*) as count FROM documents`,
      
      // MOT Critical (expired or expiring within 30 days)
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND mot_expiry_date < CURRENT_DATE + INTERVAL '30 days'
      `,
      
      // MOT Due Soon (30-60 days)
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND mot_expiry_date >= CURRENT_DATE + INTERVAL '30 days'
        AND mot_expiry_date <= CURRENT_DATE + INTERVAL '60 days'
      `,
      
      // MOT This Month (current month)
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE mot_expiry_date IS NOT NULL
        AND EXTRACT(YEAR FROM mot_expiry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM mot_expiry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      `,
      
      // Total revenue from documents
      sql`
        SELECT COALESCE(SUM(total_gross), 0) as total_revenue
        FROM documents
        WHERE total_gross IS NOT NULL
      `
    ])

    // Calculate derived metrics
    const customers = parseInt(customerCount[0].count)
    const vehicles = parseInt(vehicleCount[0].count)
    const documents = parseInt(documentCount[0].count)
    const criticalMots = parseInt(motCriticalCount[0].count)
    const dueSoonMots = parseInt(motDueSoonCount[0].count)
    const thisMonthMots = parseInt(motThisMonthCount[0].count)
    const revenue = parseFloat(totalRevenue[0].total_revenue) || 0

    // Calculate valid MOTs (vehicles with MOT dates that are not critical or due soon)
    const validMots = Math.max(0, vehicles - criticalMots - dueSoonMots)

    console.log(`[DASHBOARD-API] Stats: ${customers} customers, ${vehicles} vehicles, ${criticalMots} critical MOTs`)

    return NextResponse.json({
      success: true,
      systemStatus: {
        customers,
        vehicles,
        documents,
        criticalMots,
        dueSoonMots,
        thisMonthMots,
        totalRevenue: revenue
      },
      liveMetrics: {
        totalCustomers: customers,
        totalVehicles: vehicles,
        totalJobs: documents,
        totalRevenue: revenue,
        motStats: {
          expired: criticalMots,
          expiringSoon: dueSoonMots,
          dueThisMonth: thisMonthMots,
          valid: validMots
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DASHBOARD-API] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch dashboard data",
      details: error instanceof Error ? error.message : "Unknown error",
      systemStatus: {
        customers: 0,
        vehicles: 0,
        documents: 0,
        criticalMots: 0,
        dueSoonMots: 0,
        thisMonthMots: 0,
        totalRevenue: 0
      }
    }, { status: 500 })
  }
}
