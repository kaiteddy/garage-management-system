import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🔍 [QUICK-CHECK] Analyzing customer-vehicle connections...')

    // 1. Get basic statistics
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL) as vehicles_with_customer_id,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_owner_id,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL AND owner_id IS NULL) as unconnected_vehicles
    `

    // 2. Sample unconnected vehicles
    const unconnectedSample = await sql`
      SELECT registration, make, model, year, color
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
      ORDER BY registration
      LIMIT 5
    `

    // 3. Sample connected vehicles
    const connectedSample = await sql`
      SELECT 
        v.registration, v.make, v.model,
        c.first_name, c.last_name, c.phone
      FROM vehicles v
      LEFT JOIN customers c ON (v.customer_id = c.id OR v.owner_id = c.id)
      WHERE v.customer_id IS NOT NULL OR v.owner_id IS NOT NULL
      ORDER BY v.registration
      LIMIT 5
    `

    // 4. Check for inconsistencies
    const inconsistencies = await sql`
      SELECT 
        v.registration,
        v.customer_id,
        v.owner_id,
        CASE 
          WHEN v.customer_id IS NOT NULL AND v.owner_id IS NOT NULL AND v.customer_id != v.owner_id THEN 'different_customer_owner'
          WHEN v.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id = v.customer_id) THEN 'invalid_customer_id'
          WHEN v.owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id = v.owner_id) THEN 'invalid_owner_id'
          ELSE 'ok'
        END as issue
      FROM vehicles v
      WHERE (v.customer_id IS NOT NULL AND v.owner_id IS NOT NULL AND v.customer_id != v.owner_id)
         OR (v.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id = v.customer_id))
         OR (v.owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id = v.owner_id))
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      statistics: stats[0],
      samples: {
        unconnected_vehicles: unconnectedSample,
        connected_vehicles: connectedSample
      },
      issues: inconsistencies,
      summary: {
        total_vehicles: parseInt(stats[0].total_vehicles),
        total_customers: parseInt(stats[0].total_customers),
        connection_rate: `${Math.round((parseInt(stats[0].vehicles_with_customer_id) + parseInt(stats[0].vehicles_with_owner_id)) / parseInt(stats[0].total_vehicles) * 100)}%`,
        unconnected_count: parseInt(stats[0].unconnected_vehicles),
        issues_found: inconsistencies.length
      }
    })

  } catch (error) {
    console.error('❌ [QUICK-CHECK] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 [QUICK-FIX] Applying basic customer-vehicle connection fixes...')

    let fixesApplied = 0

    // 1. Sync customer_id and owner_id fields
    const syncResult1 = await sql`
      UPDATE vehicles 
      SET owner_id = customer_id, updated_at = NOW()
      WHERE customer_id IS NOT NULL AND owner_id IS NULL
    `
    fixesApplied += syncResult1.count || 0

    const syncResult2 = await sql`
      UPDATE vehicles 
      SET customer_id = owner_id, updated_at = NOW()
      WHERE owner_id IS NOT NULL AND customer_id IS NULL
    `
    fixesApplied += syncResult2.count || 0

    // 2. Clean up invalid references
    const cleanupResult1 = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL 
      AND customer_id NOT IN (SELECT id FROM customers)
    `

    const cleanupResult2 = await sql`
      UPDATE vehicles 
      SET owner_id = NULL, updated_at = NOW()
      WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT id FROM customers)
    `

    // 3. Get final statistics
    const finalStats = await sql`
      SELECT
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NOT NULL) as vehicles_with_customer_id,
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_owner_id,
        (SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL AND owner_id IS NULL) as unconnected_vehicles
    `

    return NextResponse.json({
      success: true,
      message: "Basic customer-vehicle connection fixes applied",
      fixes_applied: fixesApplied,
      invalid_references_cleaned: {
        customer_ids: cleanupResult1.count || 0,
        owner_ids: cleanupResult2.count || 0
      },
      final_statistics: finalStats[0],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [QUICK-FIX] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
