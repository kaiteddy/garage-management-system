import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[ANALYZE-RELATIONSHIPS] Analyzing customer-vehicle relationships...")

    // 1. Check total counts
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_owner,
        (SELECT COUNT(DISTINCT owner_id) FROM vehicles WHERE owner_id IS NOT NULL) as unique_owners
    `

    // 2. Check sample vehicle owner_id values
    const vehicleSample = await sql`
      SELECT registration, owner_id, make, model
      FROM vehicles 
      WHERE registration IS NOT NULL
      ORDER BY CASE WHEN owner_id IS NOT NULL THEN 0 ELSE 1 END, registration
      LIMIT 10
    `

    // 3. Check sample customer IDs
    const customerSample = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers 
      ORDER BY created_at DESC
      LIMIT 5
    `

    // 4. Try to find any successful joins
    const successfulJoins = await sql`
      SELECT 
        v.registration,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      INNER JOIN customers c ON v.owner_id = c.id
      LIMIT 5
    `

    // 5. Check if there are any patterns in owner_id format vs customer id format
    const ownerIdSample = await sql`
      SELECT DISTINCT owner_id, COUNT(*) as vehicle_count
      FROM vehicles 
      WHERE owner_id IS NOT NULL
      GROUP BY owner_id
      ORDER BY vehicle_count DESC
      LIMIT 10
    `

    // 6. Check customer ID format
    const customerIdSample = await sql`
      SELECT id, first_name, last_name
      FROM customers
      ORDER BY created_at DESC
      LIMIT 10
    `

    // 7. Check if we can match by registration patterns or other fields
    const registrationAnalysis = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as without_owner_id,
        COUNT(CASE WHEN LENGTH(registration) > 0 THEN 1 END) as with_registration
      FROM vehicles
    `

    return NextResponse.json({
      success: true,
      analysis: {
        counts: counts[0],
        vehicleSample,
        customerSample,
        successfulJoins,
        ownerIdSample,
        customerIdSample,
        registrationAnalysis: registrationAnalysis[0]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ANALYZE-RELATIONSHIPS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze customer relationships",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
