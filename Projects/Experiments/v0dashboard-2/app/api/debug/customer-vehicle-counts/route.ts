import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-CUSTOMER-COUNTS] Analyzing customer vehicle count issues...")

    // Check for duplicate counting issue
    const duplicateAnalysis = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        COUNT(*) as total_joins,
        COUNT(DISTINCT v.registration) as unique_vehicles,
        COUNT(CASE WHEN v.owner_id = c.id THEN 1 END) as owner_matches,
        COUNT(CASE WHEN v.customer_id = c.id THEN 1 END) as customer_matches,
        COUNT(CASE WHEN v.owner_id = c.id AND v.customer_id = c.id THEN 1 END) as both_matches
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.owner_id OR c.id = v.customer_id)
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(*) > COUNT(DISTINCT v.registration)
      ORDER BY total_joins DESC
      LIMIT 10
    `

    // Get correct counts using DISTINCT
    const correctCounts = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        COUNT(DISTINCT v.registration) as correct_vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.owner_id OR c.id = v.customer_id)
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(DISTINCT v.registration) > 0
      ORDER BY correct_vehicle_count DESC
      LIMIT 10
    `

    // Check which field is more commonly used
    const fieldUsage = await sql`
      SELECT 
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id = customer_id THEN 1 END) as vehicles_where_both_same,
        COUNT(*) as total_vehicles
      FROM vehicles
    `

    // Sample vehicles showing the issue
    const sampleVehicles = await sql`
      SELECT 
        registration,
        owner_id,
        customer_id,
        make,
        model
      FROM vehicles
      WHERE owner_id IS NOT NULL AND customer_id IS NOT NULL
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      analysis: {
        duplicate_counting_customers: duplicateAnalysis,
        correct_counts: correctCounts,
        field_usage: fieldUsage[0],
        sample_vehicles: sampleVehicles,
        issue_summary: {
          problem: "Vehicles table has both owner_id and customer_id, causing double counting",
          solution: "Use DISTINCT in COUNT or choose one primary relationship field",
          recommendation: "Use owner_id as primary relationship since it's more commonly used"
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [DEBUG-CUSTOMER-COUNTS] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
