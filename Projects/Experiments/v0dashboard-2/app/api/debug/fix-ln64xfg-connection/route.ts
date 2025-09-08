import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    console.log(`[FIX-LN64XFG] Attempting to connect LN64XFG to Adam Rutstein`)

    // First verify both exist
    const vehicle = await sql`
      SELECT registration, customer_id, owner_id
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

    if (vehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Vehicle LN64XFG not found'
      })
    }

    if (customer.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer OOTOSBT1OWYUHR1B81UY (Adam Rutstein) not found'
      })
    }

    // Update the vehicle to connect it to Adam Rutstein
    const updateResult = await sql`
      UPDATE vehicles
      SET 
        customer_id = 'OOTOSBT1OWYUHR1B81UY',
        owner_id = 'OOTOSBT1OWYUHR1B81UY',
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
    `

    // Verify the update
    const updatedVehicle = await sql`
      SELECT registration, customer_id, owner_id
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      message: 'Successfully connected LN64XFG to Adam Rutstein',
      before: {
        vehicle: vehicle[0],
        customer: customer[0]
      },
      after: {
        vehicle: updatedVehicle[0]
      },
      updateResult: updateResult
    })

  } catch (error) {
    console.error('[FIX-LN64XFG] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error.message
    }, { status: 500 })
  }
}
