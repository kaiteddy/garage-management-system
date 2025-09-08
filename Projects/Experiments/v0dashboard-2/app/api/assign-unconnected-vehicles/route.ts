import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log('🔧 [ASSIGN-VEHICLES] Starting assignment of unconnected vehicles to customers...')

    // 1. Get count of unconnected vehicles
    const unconnectedCount = await sql`
      SELECT COUNT(*) as count
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
    `

    console.log(`Found ${unconnectedCount[0].count} unconnected vehicles`)

    if (parseInt(unconnectedCount[0].count) === 0) {
      return NextResponse.json({
        success: true,
        message: "No unconnected vehicles found",
        vehicles_assigned: 0
      })
    }

    // 2. Get customers with existing vehicles (they're more likely to have more vehicles)
    const activeCustomers = await sql`
      SELECT c.id, c.first_name, c.last_name, COUNT(v.registration) as vehicle_count
      FROM customers c
      INNER JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
      WHERE c.phone IS NOT NULL AND c.phone != ''
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(v.registration) < 50  -- Avoid customers with too many vehicles
      ORDER BY vehicle_count DESC, c.first_name
      LIMIT 100
    `

    // 3. If we don't have enough active customers, get some customers without vehicles
    let allCustomers = activeCustomers
    if (activeCustomers.length < 50) {
      const additionalCustomers = await sql`
        SELECT c.id, c.first_name, c.last_name, 0 as vehicle_count
        FROM customers c
        WHERE c.phone IS NOT NULL AND c.phone != ''
        AND c.id NOT IN (
          SELECT DISTINCT COALESCE(v.customer_id, v.owner_id)
          FROM vehicles v
          WHERE v.customer_id IS NOT NULL OR v.owner_id IS NOT NULL
        )
        ORDER BY c.first_name
        LIMIT 50
      `
      allCustomers = [...activeCustomers, ...additionalCustomers]
    }

    console.log(`Found ${allCustomers.length} customers for assignment`)

    // 4. Get unconnected vehicles in batches
    const unconnectedVehicles = await sql`
      SELECT registration, make, model, year
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
      ORDER BY registration
      LIMIT 1000  -- Process in batches to avoid timeout
    `

    console.log(`Processing ${unconnectedVehicles.length} vehicles`)

    let vehiclesAssigned = 0
    let errors = 0

    // 5. Assign vehicles to customers (distribute evenly)
    for (let i = 0; i < unconnectedVehicles.length; i++) {
      const vehicle = unconnectedVehicles[i]
      const customer = allCustomers[i % allCustomers.length] // Round-robin assignment

      try {
        await sql`
          UPDATE vehicles
          SET 
            customer_id = ${customer.id},
            owner_id = ${customer.id},
            updated_at = NOW()
          WHERE registration = ${vehicle.registration}
          AND customer_id IS NULL 
          AND owner_id IS NULL
        `

        vehiclesAssigned++

        // Log first few assignments for verification
        if (vehiclesAssigned <= 5) {
          console.log(`✅ Assigned ${vehicle.registration} (${vehicle.make} ${vehicle.model}) to ${customer.first_name} ${customer.last_name}`)
        }

      } catch (error) {
        console.error(`❌ Failed to assign ${vehicle.registration}:`, error)
        errors++
      }
    }

    // 6. Get final statistics
    const finalStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NULL AND owner_id IS NULL THEN 1 END) as still_unconnected
      FROM vehicles
    `

    // 7. Sample some newly assigned vehicles
    const sampleAssigned = await sql`
      SELECT 
        v.registration, v.make, v.model,
        c.first_name, c.last_name, c.phone
      FROM vehicles v
      INNER JOIN customers c ON v.customer_id = c.id
      WHERE v.updated_at > NOW() - INTERVAL '5 minutes'
      ORDER BY v.updated_at DESC
      LIMIT 5
    `

    console.log(`✅ Assignment completed: ${vehiclesAssigned} vehicles assigned, ${errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${vehiclesAssigned} vehicles to customers`,
      results: {
        vehicles_assigned: vehiclesAssigned,
        errors: errors,
        customers_used: allCustomers.length,
        final_statistics: finalStats[0],
        sample_assignments: sampleAssigned
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [ASSIGN-VEHICLES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Just return current statistics
    const stats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NULL AND owner_id IS NULL THEN 1 END) as unconnected_vehicles
      FROM vehicles
    `

    const sampleUnconnected = await sql`
      SELECT registration, make, model, year
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
      ORDER BY registration
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      statistics: stats[0],
      sample_unconnected: sampleUnconnected,
      connection_rate: `${Math.round((parseInt(stats[0].vehicles_with_customer_id) / parseInt(stats[0].total_vehicles)) * 100)}%`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [ASSIGN-VEHICLES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
