import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log(`[DEBUG-LN64XFG] Checking LN64XFG vehicle and customer connection`)

    // Get the specific vehicle LN64XFG
    const vehicle = await sql`
      SELECT *
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      LIMIT 1
    `

    // Check if Adam Rutstein exists in customers table
    const adamCustomer = await sql`
      SELECT *
      FROM customers
      WHERE id = 'OOTOSBT1OWYUHR1B81UY'
      LIMIT 1
    `

    // Check documents for this vehicle
    const documents = await sql`
      SELECT *
      FROM documents
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = 'LN64XFG'
      LIMIT 5
    `

    // Check if there are any customers with customer_id or owner_id matching the vehicle
    let customerByCustomerId = null
    let customerByOwnerId = null

    if (vehicle.length > 0) {
      if (vehicle[0].customer_id) {
        const customerQuery = await sql`
          SELECT *
          FROM customers
          WHERE id = ${vehicle[0].customer_id}
          LIMIT 1
        `
        customerByCustomerId = customerQuery[0] || null
      }

      if (vehicle[0].owner_id) {
        const ownerQuery = await sql`
          SELECT *
          FROM customers
          WHERE id = ${vehicle[0].owner_id}
          LIMIT 1
        `
        customerByOwnerId = ownerQuery[0] || null
      }
    }

    return NextResponse.json({
      success: true,
      vehicle: vehicle[0] || null,
      adamCustomer: adamCustomer[0] || null,
      documents: documents,
      customerByCustomerId,
      customerByOwnerId,
      analysis: {
        vehicleExists: vehicle.length > 0,
        adamExists: adamCustomer.length > 0,
        vehicleHasCustomerId: vehicle.length > 0 && !!vehicle[0].customer_id,
        vehicleHasOwnerId: vehicle.length > 0 && !!vehicle[0].owner_id,
        customerFound: !!(customerByCustomerId || customerByOwnerId),
        documentCount: documents.length,
        needsConnection: vehicle.length > 0 && adamCustomer.length > 0 && !customerByCustomerId && !customerByOwnerId
      }
    })

  } catch (error) {
    console.error('[DEBUG-LN64XFG] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error.message
    }, { status: 500 })
  }
}
