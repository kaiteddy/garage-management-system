import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-CUSTOMER-CONNECTION] Checking vehicle-customer relationships...")

    // Check the actual table structure
    const vehicleColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      AND (column_name LIKE '%customer%' OR column_name LIKE '%owner%')
      ORDER BY ordinal_position
    `

    const customerColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    // Check sample vehicle data to see what relationship columns exist
    const sampleVehicles = await sql`
      SELECT
        registration,
        owner_id,
        make,
        model
      FROM vehicles
      WHERE registration IS NOT NULL
      LIMIT 5
    `

    // Check sample customer data
    const sampleCustomers = await sql`
      SELECT
        id,
        forename,
        surname,
        first_name,
        last_name,
        phone,
        telephone,
        mobile,
        email
      FROM customers
      LIMIT 5
    `

    // Try different join approaches to see which works
    const joinTest1 = await sql`
      SELECT
        v.registration,
        v.owner_id,
        c.forename,
        c.surname,
        c.first_name,
        c.last_name,
        c.phone,
        c.telephone,
        c.mobile,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration IS NOT NULL
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      debug: {
        vehicleColumns,
        customerColumns,
        sampleVehicles,
        sampleCustomers,
        joinTest: joinTest1
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DEBUG-CUSTOMER-CONNECTION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to debug customer connection",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
