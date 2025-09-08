import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🔍 [DIAGNOSE] Starting comprehensive customer-vehicle connection analysis...')

    // 1. Check table schemas
    const vehicleSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    const customerSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    // 2. Get connection statistics
    const connectionStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NOT NULL OR owner_id IS NOT NULL THEN 1 END) as vehicles_with_any_connection,
        COUNT(CASE WHEN customer_id IS NULL AND owner_id IS NULL THEN 1 END) as vehicles_without_connection
      FROM vehicles
    `

    // 3. Get customer statistics
    const customerStats = await sql`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as customers_with_phone,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email NOT LIKE '%placeholder%' THEN 1 END) as customers_with_real_email
      FROM customers
    `

    // 4. Sample vehicles without connections
    const unconnectedVehicles = await sql`
      SELECT registration, make, model, year, color, created_at
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `

    // 5. Sample vehicles with connections
    const connectedVehicles = await sql`
      SELECT 
        v.registration, v.make, v.model, v.year,
        c.first_name, c.last_name, c.phone,
        CASE 
          WHEN v.customer_id IS NOT NULL THEN 'customer_id'
          WHEN v.owner_id IS NOT NULL THEN 'owner_id'
          ELSE 'none'
        END as connection_type
      FROM vehicles v
      LEFT JOIN customers c ON (v.customer_id = c.id OR v.owner_id = c.id)
      WHERE v.customer_id IS NOT NULL OR v.owner_id IS NOT NULL
      ORDER BY v.created_at DESC
      LIMIT 10
    `

    // 6. Check for data inconsistencies
    const inconsistencies = await sql`
      SELECT 
        v.registration,
        v.customer_id,
        v.owner_id,
        c1.first_name as customer_id_name,
        c2.first_name as owner_id_name,
        CASE 
          WHEN v.customer_id IS NOT NULL AND v.owner_id IS NOT NULL AND v.customer_id != v.owner_id THEN 'different_ids'
          WHEN v.customer_id IS NOT NULL AND c1.id IS NULL THEN 'customer_id_invalid'
          WHEN v.owner_id IS NOT NULL AND c2.id IS NULL THEN 'owner_id_invalid'
          ELSE 'ok'
        END as issue_type
      FROM vehicles v
      LEFT JOIN customers c1 ON v.customer_id = c1.id
      LEFT JOIN customers c2 ON v.owner_id = c2.id
      WHERE (v.customer_id IS NOT NULL AND c1.id IS NULL)
         OR (v.owner_id IS NOT NULL AND c2.id IS NULL)
         OR (v.customer_id IS NOT NULL AND v.owner_id IS NOT NULL AND v.customer_id != v.owner_id)
      LIMIT 20
    `

    // 7. Get top customers by vehicle count
    const topCustomers = await sql`
      SELECT 
        c.id, c.first_name, c.last_name, c.phone,
        COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      HAVING COUNT(v.registration) > 0
      ORDER BY vehicle_count DESC
      LIMIT 10
    `

    // 8. Check for duplicate customer records
    const duplicateCustomers = await sql`
      SELECT phone, COUNT(*) as count, 
             STRING_AGG(first_name || ' ' || last_name, ', ') as names
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `

    console.log('✅ [DIAGNOSE] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {
        schemas: {
          vehicle_columns: vehicleSchema.length,
          customer_columns: customerSchema.length,
          vehicle_connection_fields: vehicleSchema.filter(col => 
            col.column_name.includes('customer') || col.column_name.includes('owner')
          )
        },
        statistics: {
          vehicles: connectionStats[0],
          customers: customerStats[0]
        },
        samples: {
          unconnected_vehicles: unconnectedVehicles,
          connected_vehicles: connectedVehicles,
          top_customers: topCustomers
        },
        issues: {
          data_inconsistencies: inconsistencies,
          duplicate_customers: duplicateCustomers
        }
      }
    })

  } catch (error) {
    console.error('❌ [DIAGNOSE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 [FIX] Starting customer-vehicle connection fixes...')

    let fixesApplied = 0

    // 1. Fix vehicles with customer_id but no owner_id
    const fixCustomerIdOnly = await sql`
      UPDATE vehicles 
      SET owner_id = customer_id, updated_at = NOW()
      WHERE customer_id IS NOT NULL AND owner_id IS NULL
    `
    fixesApplied += fixCustomerIdOnly.count || 0

    // 2. Fix vehicles with owner_id but no customer_id
    const fixOwnerIdOnly = await sql`
      UPDATE vehicles 
      SET customer_id = owner_id, updated_at = NOW()
      WHERE owner_id IS NOT NULL AND customer_id IS NULL
    `
    fixesApplied += fixOwnerIdOnly.count || 0

    // 3. Remove invalid customer_id references
    const removeInvalidCustomerIds = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL 
      AND customer_id NOT IN (SELECT id FROM customers)
    `

    // 4. Remove invalid owner_id references
    const removeInvalidOwnerIds = await sql`
      UPDATE vehicles 
      SET owner_id = NULL, updated_at = NOW()
      WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT id FROM customers)
    `

    // 5. Get final statistics
    const finalStats = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NOT NULL OR owner_id IS NOT NULL THEN 1 END) as vehicles_with_any_connection,
        COUNT(CASE WHEN customer_id IS NULL AND owner_id IS NULL THEN 1 END) as vehicles_without_connection
      FROM vehicles
    `

    console.log('✅ [FIX] Connection fixes completed')

    return NextResponse.json({
      success: true,
      message: "Customer-vehicle connections fixed",
      fixes_applied: fixesApplied,
      invalid_references_removed: {
        customer_ids: removeInvalidCustomerIds.count || 0,
        owner_ids: removeInvalidOwnerIds.count || 0
      },
      final_statistics: finalStats[0],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [FIX] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
