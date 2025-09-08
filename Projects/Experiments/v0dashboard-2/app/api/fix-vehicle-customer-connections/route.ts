import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    const { registration, customerId, mode } = await request.json()
    
    console.log(`[FIX-CONNECTIONS] Starting fix process - Mode: ${mode || 'single'}, Registration: ${registration}, Customer: ${customerId}`)

    if (mode === 'analyze') {
      // Analyze the current state of vehicle-customer connections
      const disconnectedVehicles = await sql`
        SELECT 
          v.registration,
          v.make,
          v.model,
          v.customer_id,
          v.owner_id,
          COUNT(d.id) as document_count
        FROM vehicles v
        LEFT JOIN documents d ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
        WHERE v.customer_id IS NULL AND v.owner_id IS NULL
        GROUP BY v.registration, v.make, v.model, v.customer_id, v.owner_id
        ORDER BY COUNT(d.id) DESC
        LIMIT 20
      `

      const connectedVehicles = await sql`
        SELECT 
          COUNT(*) as total_connected
        FROM vehicles v
        WHERE v.customer_id IS NOT NULL OR v.owner_id IS NOT NULL
      `

      const totalVehicles = await sql`
        SELECT COUNT(*) as total FROM vehicles
      `

      return NextResponse.json({
        success: true,
        analysis: {
          totalVehicles: totalVehicles[0].total,
          connectedVehicles: connectedVehicles[0].total_connected,
          disconnectedVehicles: disconnectedVehicles.length,
          disconnectedSample: disconnectedVehicles
        }
      })
    }

    if (mode === 'fix-all') {
      // Fix all vehicle-customer connections by matching through documents
      console.log(`[FIX-CONNECTIONS] Starting bulk fix process...`)
      
      const fixResults = []
      
      // Get vehicles that need connections and have documents
      const vehiclesNeedingFix = await sql`
        SELECT DISTINCT
          v.registration,
          v.make,
          v.model,
          d.customer_id,
          COUNT(d.id) as document_count
        FROM vehicles v
        INNER JOIN documents d ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
        WHERE (v.customer_id IS NULL OR v.owner_id IS NULL)
          AND d.customer_id IS NOT NULL
        GROUP BY v.registration, v.make, v.model, d.customer_id
        ORDER BY COUNT(d.id) DESC
        LIMIT 100
      `

      console.log(`[FIX-CONNECTIONS] Found ${vehiclesNeedingFix.length} vehicles to fix`)

      for (const vehicle of vehiclesNeedingFix) {
        try {
          // Verify customer exists
          const customerExists = await sql`
            SELECT id, first_name, last_name
            FROM customers
            WHERE id = ${vehicle.customer_id}
            LIMIT 1
          `

          if (customerExists.length > 0) {
            // Update the vehicle
            await sql`
              UPDATE vehicles
              SET 
                customer_id = ${vehicle.customer_id},
                owner_id = ${vehicle.customer_id},
                updated_at = NOW()
              WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${vehicle.registration}, ' ', ''))
            `

            fixResults.push({
              registration: vehicle.registration,
              customerId: vehicle.customer_id,
              customerName: `${customerExists[0].first_name} ${customerExists[0].last_name}`,
              status: 'fixed',
              documentCount: vehicle.document_count
            })
          } else {
            fixResults.push({
              registration: vehicle.registration,
              customerId: vehicle.customer_id,
              status: 'customer_not_found',
              documentCount: vehicle.document_count
            })
          }
        } catch (error) {
          fixResults.push({
            registration: vehicle.registration,
            customerId: vehicle.customer_id,
            status: 'error',
            error: error.message,
            documentCount: vehicle.document_count
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${fixResults.filter(r => r.status === 'fixed').length} vehicle connections`,
        results: fixResults,
        summary: {
          total: fixResults.length,
          fixed: fixResults.filter(r => r.status === 'fixed').length,
          errors: fixResults.filter(r => r.status === 'error').length,
          customerNotFound: fixResults.filter(r => r.status === 'customer_not_found').length
        }
      })
    }

    // Single vehicle fix mode
    if (!registration) {
      return NextResponse.json({
        success: false,
        error: 'Registration is required for single vehicle fix'
      }, { status: 400 })
    }

    console.log(`[FIX-CONNECTIONS] Fixing single vehicle: ${registration}`)

    // Get the vehicle
    const vehicle = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      LIMIT 1
    `

    if (vehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Vehicle ${registration} not found`
      })
    }

    let targetCustomerId = customerId

    // If no customer ID provided, try to find it through documents
    if (!targetCustomerId) {
      const customerFromDocs = await sql`
        SELECT 
          d.customer_id,
          c.first_name,
          c.last_name,
          COUNT(d.id) as document_count
        FROM documents d
        INNER JOIN customers c ON d.customer_id = c.id
        WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
        GROUP BY d.customer_id, c.first_name, c.last_name
        ORDER BY COUNT(d.id) DESC
        LIMIT 1
      `

      if (customerFromDocs.length > 0) {
        targetCustomerId = customerFromDocs[0].customer_id
        console.log(`[FIX-CONNECTIONS] Found customer through documents: ${targetCustomerId}`)
      }
    }

    // Special case for LN64XFG - we know it belongs to Adam Rutstein
    if (registration.toUpperCase().replace(/\s/g, '') === 'LN64XFG' && !targetCustomerId) {
      targetCustomerId = 'OOTOSBT1OWYUHR1B81UY'
      console.log(`[FIX-CONNECTIONS] Using known customer for LN64XFG: ${targetCustomerId}`)
    }

    if (!targetCustomerId) {
      return NextResponse.json({
        success: false,
        error: 'No customer ID provided and none found through documents',
        vehicle: vehicle[0]
      })
    }

    // Verify customer exists
    const customer = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers
      WHERE id = ${targetCustomerId}
      LIMIT 1
    `

    if (customer.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Customer ${targetCustomerId} not found`
      })
    }

    // Update the vehicle
    const updateResult = await sql`
      UPDATE vehicles
      SET 
        customer_id = ${targetCustomerId},
        owner_id = ${targetCustomerId},
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
    `

    // Verify the update
    const updatedVehicle = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      LIMIT 1
    `

    // Test the customer lookup API
    let customerLookupTest = null
    try {
      const testResponse = await fetch(`${request.nextUrl.origin}/api/customers/by-vehicle-fixed?registration=${encodeURIComponent(registration)}`)
      if (testResponse.ok) {
        customerLookupTest = await testResponse.json()
      }
    } catch (error) {
      console.log(`[FIX-CONNECTIONS] Customer lookup test failed:`, error)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully connected ${registration} to ${customer[0].first_name} ${customer[0].last_name}`,
      before: {
        vehicle: vehicle[0]
      },
      after: {
        vehicle: updatedVehicle[0],
        customer: customer[0]
      },
      customerLookupTest: customerLookupTest,
      updateResult: updateResult
    })

  } catch (error) {
    console.error('[FIX-CONNECTIONS] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error.message
    }, { status: 500 })
  }
}
