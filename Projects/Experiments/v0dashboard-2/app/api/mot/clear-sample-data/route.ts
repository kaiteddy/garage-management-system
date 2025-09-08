import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[CLEAR-SAMPLE-DATA] Clearing sample data and resetting to original customers...")

    // First, disconnect all vehicles from sample customers
    await sql`
      UPDATE vehicles 
      SET owner_id = NULL 
      WHERE owner_id IS NOT NULL
    `

    // Keep only the original customers from Customers.csv (IDs 1, 2, 3)
    // These appear to be the real customers based on their data structure
    const originalCustomers = await sql`
      SELECT id, first_name, last_name, email, phone
      FROM customers 
      WHERE id IN ('1', '2', '3')
      ORDER BY id
    `

    console.log("[CLEAR-SAMPLE-DATA] Original customers to keep:", originalCustomers)

    // Delete all sample customers (ID > 3)
    const deletedCustomers = await sql`
      DELETE FROM customers 
      WHERE CAST(id AS INTEGER) > 3
      RETURNING id
    `

    console.log(`[CLEAR-SAMPLE-DATA] Deleted ${deletedCustomers.length} sample customers`)

    // Get final counts
    const finalStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers
    `

    const stats = finalStats[0]

    return NextResponse.json({
      success: true,
      message: "Successfully cleared sample data",
      results: {
        originalCustomersKept: originalCustomers.length,
        sampleCustomersDeleted: deletedCustomers.length,
        totalCustomers: parseInt(stats.total_customers),
        totalVehicles: parseInt(stats.total_vehicles),
        vehiclesWithCustomers: parseInt(stats.vehicles_with_customers)
      },
      originalCustomers: originalCustomers,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[CLEAR-SAMPLE-DATA] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear sample data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
