import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CRITICAL-WITH-CUSTOMERS] Checking critical MOTs with customer connections...")

    // Get critical MOTs with customer data
    const criticalWithCustomers = await sql`
      SELECT
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date,
        CASE
          WHEN v.mot_expiry_date < CURRENT_DATE THEN 'expired'
          WHEN v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'expiring_soon'
          ELSE 'other'
        END as mot_urgency,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address_line1,
        c.city,
        c.postcode
      FROM vehicles v
      INNER JOIN customers c ON v.owner_id = c.id
      WHERE v.mot_expiry_date IS NOT NULL
      AND (
        -- Expired within last 6 months
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        -- Expiring in next 14 days
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
      ORDER BY v.mot_expiry_date ASC
    `

    // Get critical MOTs without customer data
    const criticalWithoutCustomers = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      WHERE v.mot_expiry_date IS NOT NULL
      AND v.owner_id IS NULL
      AND (
        -- Expired within last 6 months
        (v.mot_expiry_date >= CURRENT_DATE - INTERVAL '6 months' AND v.mot_expiry_date < CURRENT_DATE)
        OR
        -- Expiring in next 14 days
        (v.mot_expiry_date >= CURRENT_DATE AND v.mot_expiry_date <= CURRENT_DATE + INTERVAL '14 days')
      )
    `

    const withCustomers = criticalWithCustomers.length
    const withoutCustomers = parseInt(criticalWithoutCustomers[0].count)
    const total = withCustomers + withoutCustomers

    return NextResponse.json({
      success: true,
      summary: {
        totalCritical: total,
        withCustomers,
        withoutCustomers,
        customerConnectionRate: Math.round((withCustomers / total) * 100)
      },
      criticalVehiclesWithCustomers: criticalWithCustomers.slice(0, 10), // First 10 for display
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CRITICAL-WITH-CUSTOMERS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check critical MOTs with customers",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
