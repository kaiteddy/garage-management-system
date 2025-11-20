import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-VEHICLE-CUSTOMER-CONNECTION] Analyzing vehicle-customer relationships...")

    // Check the actual table structure for vehicles
    const vehicleColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    // Check the actual table structure for customers
    const customerColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    // Check if customers exist
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const totalCustomers = parseInt(customerCount[0].count)

    // Get sample customers
    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, email, phone
      FROM customers
      LIMIT 5
    `

    // Check vehicle connection fields
    const vehicleConnectionCheck = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as with_owner_id
      FROM vehicles
    `

    // Get sample vehicles to see their structure
    const sampleVehicles = await sql`
      SELECT registration, owner_id, make, model
      FROM vehicles
      WHERE registration IS NOT NULL
      LIMIT 5
    `

    // Check if there are any successful joins
    const successfulJoins = await sql`
      SELECT
        v.registration,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE c.id IS NOT NULL
      LIMIT 5
    `

    // Check if vehicles have any customer reference fields that might contain customer IDs
    const vehicleCustomerFields = await sql`
      SELECT registration, owner_id
      FROM vehicles
      WHERE owner_id IS NOT NULL
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      analysis: {
        vehicleColumns: vehicleColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
        customerColumns: customerColumns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable })),
        totalCustomers,
        sampleCustomers,
        vehicleConnectionCheck: vehicleConnectionCheck[0],
        sampleVehicles,
        successfulJoins,
        vehicleCustomerFields
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-VEHICLE-CUSTOMER-CONNECTION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check vehicle-customer connections",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
