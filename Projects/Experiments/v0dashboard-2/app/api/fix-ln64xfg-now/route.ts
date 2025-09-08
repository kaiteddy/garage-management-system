import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log(`[FIX-LN64XFG-NOW] Starting immediate fix for LN64XFG`)

    // Step 1: Check current state
    const beforeVehicle = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    const customer = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers
      WHERE id = 'OOTOSBT1OWYUHR1B81UY'
      LIMIT 1
    `

    if (beforeVehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle LN64XFG not found'
      })
    }

    if (customer.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer Adam Rutstein (OOTOSBT1OWYUHR1B81UY) not found'
      })
    }

    // Step 2: Update the vehicle
    console.log(`[FIX-LN64XFG-NOW] Updating vehicle connection...`)
    
    const updateResult = await sql`
      UPDATE vehicles
      SET 
        customer_id = 'OOTOSBT1OWYUHR1B81UY',
        owner_id = 'OOTOSBT1OWYUHR1B81UY',
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
    `

    // Step 3: Verify the update
    const afterVehicle = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    // Step 4: Test the customer lookup API
    console.log(`[FIX-LN64XFG-NOW] Testing customer lookup API...`)
    
    let customerLookupResult = null
    try {
      const lookupResponse = await fetch(`${request.nextUrl.origin}/api/customers/by-vehicle-fixed?registration=LN64XFG`)
      if (lookupResponse.ok) {
        customerLookupResult = await lookupResponse.json()
      } else {
        customerLookupResult = { error: `HTTP ${lookupResponse.status}` }
      }
    } catch (error) {
      customerLookupResult = { error: error.message }
    }

    return NextResponse.json({
      success: true,
      message: 'LN64XFG successfully connected to Adam Rutstein',
      steps: {
        step1_verification: {
          vehicleFound: beforeVehicle.length > 0,
          customerFound: customer.length > 0
        },
        step2_update: {
          updateResult: updateResult,
          rowsAffected: updateResult.rowCount || 0
        },
        step3_verification: {
          before: beforeVehicle[0],
          after: afterVehicle[0],
          connectionEstablished: !!(afterVehicle[0]?.customer_id && afterVehicle[0]?.owner_id)
        },
        step4_api_test: {
          customerLookupResult: customerLookupResult,
          apiWorking: customerLookupResult?.success === true
        }
      },
      customer: customer[0]
    })

  } catch (error) {
    console.error('[FIX-LN64XFG-NOW] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error.message
    }, { status: 500 })
  }
}
