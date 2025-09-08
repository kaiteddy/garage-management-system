import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🔍 [FIX-NATANIEL] Analyzing NATANIEL customer connection issues...')

    // 1. Show current state
    const currentState = await sql`
      SELECT 
        'Current State' as step,
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `

    // 2. Find NATANIEL's customer ID
    const natanielCustomer = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers 
      WHERE UPPER(first_name) LIKE '%NATANIEL%' 
      OR UPPER(last_name) LIKE '%NATANIEL%'
      LIMIT 5
    `

    // 3. Check vehicles connected to NATANIEL using both fields
    const natanielVehiclesOld = await sql`
      SELECT 
        v.registration, v.make, v.model, v.owner_id, v.customer_id,
        c1.first_name as owner_name,
        c2.first_name as customer_name
      FROM vehicles v
      LEFT JOIN customers c1 ON v.owner_id = c1.id
      LEFT JOIN customers c2 ON v.customer_id = c2.id
      WHERE v.owner_id IN (${sql.join(natanielCustomer.map(c => c.id), sql`, `)})
         OR v.customer_id IN (${sql.join(natanielCustomer.map(c => c.id), sql`, `)})
      ORDER BY v.registration
    `

    return NextResponse.json({
      success: true,
      analysis: {
        current_state: currentState[0],
        nataniel_customers: natanielCustomer,
        nataniel_vehicles_before_fix: natanielVehiclesOld,
        issue_description: "NATANIEL appears connected to multiple vehicles due to inconsistent use of owner_id vs customer_id fields"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [FIX-NATANIEL] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 [FIX-NATANIEL] Applying customer-vehicle connection fixes...')

    // 1. Copy customer_id to owner_id where owner_id is null but customer_id exists
    const fixStep1 = await sql`
      UPDATE vehicles 
      SET owner_id = customer_id, updated_at = NOW()
      WHERE owner_id IS NULL AND customer_id IS NOT NULL
    `

    console.log(`✅ Step 1: Fixed ${fixStep1.count || 0} vehicles by copying customer_id to owner_id`)

    // 2. Clear customer_id field to avoid confusion (we'll use owner_id as the single source of truth)
    const fixStep2 = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL
    `

    console.log(`✅ Step 2: Cleared ${fixStep2.count || 0} customer_id fields to standardize on owner_id`)

    // 3. Show final state
    const finalState = await sql`
      SELECT 
        'After Cleanup' as step,
        COUNT(*) as total_vehicles,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
        COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
      FROM vehicles
    `

    // 4. Show NATANIEL's vehicles after fix
    const natanielCustomer = await sql`
      SELECT id, first_name, last_name
      FROM customers 
      WHERE UPPER(first_name) LIKE '%NATANIEL%' 
      OR UPPER(last_name) LIKE '%NATANIEL%'
      LIMIT 5
    `

    const natanielVehiclesAfter = await sql`
      SELECT 
        v.registration, v.make, v.model, v.owner_id,
        c.first_name || ' ' || c.last_name as owner_name
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.owner_id IN (${sql.join(natanielCustomer.map(c => c.id), sql`, `)})
      ORDER BY v.registration
    `

    // 5. Sample of cleaned data
    const sampleCleanedData = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.owner_id,
        v.customer_id,
        c.first_name || ' ' || c.last_name as owner_name
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      ORDER BY v.registration
      LIMIT 10
    `

    console.log('✅ [FIX-NATANIEL] Customer-vehicle connection fixes completed!')

    return NextResponse.json({
      success: true,
      message: "Customer-vehicle connections fixed successfully",
      results: {
        fixes_applied: {
          step1_owner_id_fixes: fixStep1.count || 0,
          step2_customer_id_cleared: fixStep2.count || 0
        },
        before_after: {
          final_state: finalState[0]
        },
        nataniel_specific: {
          customers_found: natanielCustomer,
          vehicles_after_fix: natanielVehiclesAfter
        },
        sample_cleaned_data: sampleCleanedData
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [FIX-NATANIEL] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
