import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-CONNECTIONS] Checking basic data connections...")

    // 1. Basic table counts
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`

    // 2. Check customer-vehicle connections
    const vehiclesWithCustomers = await sql`
      SELECT COUNT(*) as count FROM vehicles v
      WHERE v.owner_id IS NOT NULL
    `

    // 3. Check document connections
    const documentsWithCustomers = await sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE d._id_customer IS NOT NULL
    `

    const documentsWithVehicles = await sql`
      SELECT COUNT(*) as count FROM documents d
      WHERE d.vehicle_registration IS NOT NULL
    `

    // 4. Sample connected data
    const sampleData = await sql`
      SELECT 
        c.first_name, c.last_name, c.phone,
        v.registration, v.make, v.model
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      LIMIT 5
    `

    // 5. Check SMS readiness
    const smsReady = await sql`
      SELECT COUNT(*) as count FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      WHERE c.phone IS NOT NULL 
      AND c.phone != ''
      AND v.mot_expiry_date IS NOT NULL
    `

    return NextResponse.json({
      success: true,
      connections: {
        tables: {
          customers: parseInt(customerCount[0].count),
          vehicles: parseInt(vehicleCount[0].count),
          documents: parseInt(documentCount[0].count)
        },
        relationships: {
          vehiclesWithCustomers: parseInt(vehiclesWithCustomers[0].count),
          documentsWithCustomers: parseInt(documentsWithCustomers[0].count),
          documentsWithVehicles: parseInt(documentsWithVehicles[0].count)
        },
        smsReady: parseInt(smsReady[0].count),
        sampleConnectedData: sampleData
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CHECK-CONNECTIONS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check data connections",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
