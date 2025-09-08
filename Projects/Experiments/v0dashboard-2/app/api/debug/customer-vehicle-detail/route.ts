import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id') || '1CHQC4PGI25MIF05ZUCJD5T'

    console.log(`[DEBUG-CUSTOMER-DETAIL] Analyzing customer: ${customerId}`)

    // Get customer info
    const customer = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers 
      WHERE id = ${customerId}
    `

    // Get vehicles using owner_id only
    const vehiclesOwnerOnly = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles 
      WHERE owner_id = ${customerId}
      ORDER BY registration
    `

    // Get vehicles using customer_id only
    const vehiclesCustomerOnly = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles 
      WHERE customer_id = ${customerId}
      ORDER BY registration
    `

    // Get vehicles using OR condition (old way)
    const vehiclesOldWay = await sql`
      SELECT registration, make, model, year, owner_id, customer_id
      FROM vehicles 
      WHERE owner_id = ${customerId} OR customer_id = ${customerId}
      ORDER BY registration
    `

    // Count distinct vehicles
    const distinctVehicles = await sql`
      SELECT COUNT(DISTINCT registration) as count
      FROM vehicles 
      WHERE owner_id = ${customerId} OR customer_id = ${customerId}
    `

    // Check for duplicates
    const duplicateAnalysis = await sql`
      SELECT 
        registration,
        COUNT(*) as duplicate_count,
        STRING_AGG(DISTINCT owner_id, ', ') as owner_ids,
        STRING_AGG(DISTINCT customer_id, ', ') as customer_ids
      FROM vehicles 
      WHERE owner_id = ${customerId} OR customer_id = ${customerId}
      GROUP BY registration
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      customer_info: customer[0] || null,
      analysis: {
        vehicles_by_owner_id: vehiclesOwnerOnly.length,
        vehicles_by_customer_id: vehiclesCustomerOnly.length,
        vehicles_old_way_total: vehiclesOldWay.length,
        distinct_vehicles: parseInt(distinctVehicles[0].count),
        has_duplicates: duplicateAnalysis.length > 0
      },
      vehicles: {
        owner_id_only: vehiclesOwnerOnly.slice(0, 5),
        customer_id_only: vehiclesCustomerOnly.slice(0, 5),
        old_way_sample: vehiclesOldWay.slice(0, 5)
      },
      duplicates: duplicateAnalysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ [DEBUG-CUSTOMER-DETAIL] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
