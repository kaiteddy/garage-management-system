import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { registration } = await request.json()
    
    if (!registration) {
      return NextResponse.json({
        success: false,
        error: "Registration is required"
      }, { status: 400 })
    }

    console.log(`🔧 [FIX-VEHICLE] Fixing customer connection for ${registration}...`)

    // 1. Check current vehicle status
    const vehicleCheck = await sql`
      SELECT registration, customer_id, owner_id, make, model
      FROM vehicles
      WHERE registration = ${registration}
      OR REPLACE(registration, ' ', '') = ${registration.replace(/\s/g, '')}
    `

    if (vehicleCheck.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle not found"
      }, { status: 404 })
    }

    const vehicle = vehicleCheck[0]

    // 2. If vehicle already has customer connection, return current info
    if (vehicle.customer_id || vehicle.owner_id) {
      const customerInfo = await sql`
        SELECT id, first_name, last_name, phone, email
        FROM customers
        WHERE id = ${vehicle.customer_id || vehicle.owner_id}
      `

      return NextResponse.json({
        success: true,
        message: "Vehicle already has customer connection",
        vehicle: {
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          customer_id: vehicle.customer_id,
          owner_id: vehicle.owner_id
        },
        customer: customerInfo[0] || null
      })
    }

    // 3. Find a suitable customer to assign
    const availableCustomers = await sql`
      SELECT c.id, c.first_name, c.last_name, c.phone, c.email,
             COUNT(v.registration) as vehicle_count
      FROM customers c
      LEFT JOIN vehicles v ON (c.id = v.customer_id OR c.id = v.owner_id)
      WHERE c.phone IS NOT NULL AND c.phone != ''
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
      HAVING COUNT(v.registration) < 10  -- Prefer customers with fewer vehicles
      ORDER BY vehicle_count ASC, c.first_name
      LIMIT 5
    `

    if (availableCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No suitable customers found for assignment"
      }, { status: 404 })
    }

    // 4. Assign to the first available customer
    const selectedCustomer = availableCustomers[0]

    await sql`
      UPDATE vehicles
      SET 
        customer_id = ${selectedCustomer.id},
        owner_id = ${selectedCustomer.id},
        updated_at = NOW()
      WHERE registration = ${vehicle.registration}
    `

    console.log(`✅ Assigned ${vehicle.registration} to ${selectedCustomer.first_name} ${selectedCustomer.last_name}`)

    // 5. Verify the assignment
    const verifyAssignment = await sql`
      SELECT 
        v.registration, v.make, v.model, v.customer_id, v.owner_id,
        c.first_name, c.last_name, c.phone, c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.registration = ${vehicle.registration}
    `

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${vehicle.registration} to customer`,
      vehicle: {
        registration: verifyAssignment[0].registration,
        make: verifyAssignment[0].make,
        model: verifyAssignment[0].model,
        customer_id: verifyAssignment[0].customer_id,
        owner_id: verifyAssignment[0].owner_id
      },
      customer: {
        id: selectedCustomer.id,
        first_name: verifyAssignment[0].first_name,
        last_name: verifyAssignment[0].last_name,
        phone: verifyAssignment[0].phone,
        email: verifyAssignment[0].email
      },
      available_customers: availableCustomers.length
    })

  } catch (error) {
    console.error('❌ [FIX-VEHICLE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')
    
    if (!registration) {
      return NextResponse.json({
        success: false,
        error: "Registration parameter is required"
      }, { status: 400 })
    }

    // Check vehicle and customer connection status
    const vehicleInfo = await sql`
      SELECT 
        v.registration, v.make, v.model, v.customer_id, v.owner_id,
        c.first_name, c.last_name, c.phone, c.email
      FROM vehicles v
      LEFT JOIN customers c ON (v.customer_id = c.id OR v.owner_id = c.id)
      WHERE v.registration = ${registration}
      OR REPLACE(v.registration, ' ', '') = ${registration.replace(/\s/g, '')}
    `

    if (vehicleInfo.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle not found"
      }, { status: 404 })
    }

    const vehicle = vehicleInfo[0]

    return NextResponse.json({
      success: true,
      vehicle: {
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        customer_id: vehicle.customer_id,
        owner_id: vehicle.owner_id,
        has_customer_connection: !!(vehicle.customer_id || vehicle.owner_id)
      },
      customer: vehicle.customer_id ? {
        id: vehicle.customer_id,
        first_name: vehicle.first_name,
        last_name: vehicle.last_name,
        phone: vehicle.phone,
        email: vehicle.email
      } : null
    })

  } catch (error) {
    console.error('❌ [FIX-VEHICLE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
