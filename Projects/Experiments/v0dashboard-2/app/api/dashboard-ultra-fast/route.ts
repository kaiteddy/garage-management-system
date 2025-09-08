import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[ULTRA-FAST-DASHBOARD] ⚡ Loading ultra-fast dashboard")
    
    const startTime = Date.now()

    // Single optimized query for all critical dashboard data
    const dashboardData = await sql`
      WITH vehicle_stats AS (
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN mot_expiry_date < CURRENT_DATE THEN 1 END) as expired_mot,
          COUNT(CASE WHEN mot_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_soon,
          COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_customers
        FROM vehicles 
        WHERE registration IS NOT NULL AND registration != ''
      ),
      customer_stats AS (
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as sms_ready,
          COUNT(CASE WHEN last_contact_date > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recently_contacted
        FROM customers
      ),
      business_stats AS (
        SELECT 
          COUNT(*) as active_customers,
          COALESCE(SUM(total_spent::numeric), 0) as total_revenue,
          COALESCE(AVG(total_spent::numeric), 0) as avg_customer_value
        FROM customer_activity
      )
      SELECT 
        v.total_vehicles,
        v.expired_mot,
        v.due_soon,
        v.vehicles_with_customers,
        c.total_customers,
        c.sms_ready,
        c.recently_contacted,
        b.active_customers,
        b.total_revenue,
        b.avg_customer_value
      FROM vehicle_stats v, customer_stats c, business_stats b
    `

    // Get top urgent vehicles (limit 5 for speed)
    const urgentVehicles = await sql`
      SELECT 
        registration,
        make,
        model,
        mot_expiry_date,
        CASE 
          WHEN mot_expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
          ELSE 'OK'
        END as urgency_level
      FROM vehicles 
      WHERE mot_expiry_date IS NOT NULL 
        AND mot_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND registration IS NOT NULL
      ORDER BY mot_expiry_date ASC
      LIMIT 5
    `

    // Get top customers by value (limit 3 for speed)
    const topCustomers = await sql`
      SELECT 
        ca.customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        ca.total_spent,
        ca.total_documents
      FROM customer_activity ca
      JOIN customers c ON ca.customer_id = c.id
      ORDER BY ca.total_spent::numeric DESC
      LIMIT 3
    `

    const executionTime = Date.now() - startTime
    const stats = dashboardData[0]

    return NextResponse.json({
      success: true,
      executionTime: `${executionTime}ms`,
      dashboard: {
        summary: {
          totalVehicles: parseInt(stats.total_vehicles),
          totalCustomers: parseInt(stats.total_customers),
          activeCustomers: parseInt(stats.active_customers),
          smsReadyCustomers: parseInt(stats.sms_ready),
          vehiclesWithCustomers: parseInt(stats.vehicles_with_customers),
          recentlyContacted: parseInt(stats.recently_contacted)
        },
        motAlerts: {
          expired: parseInt(stats.expired_mot),
          dueSoon: parseInt(stats.due_soon),
          urgentVehicles: urgentVehicles
        },
        business: {
          totalRevenue: parseFloat(stats.total_revenue),
          avgCustomerValue: parseFloat(stats.avg_customer_value),
          topCustomers: topCustomers
        }
      },
      performance: {
        queryTime: `${executionTime}ms`,
        optimized: true,
        cacheRecommended: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ULTRA-FAST-DASHBOARD] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load ultra-fast dashboard",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
