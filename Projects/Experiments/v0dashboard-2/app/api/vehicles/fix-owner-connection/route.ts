import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: Request) {
  try {
    const { registration, customerInfo, customerId } = await request.json()

    if (!registration) {
      return NextResponse.json({
        success: false,
        error: "Vehicle registration is required"
      }, { status: 400 })
    }

    console.log(`[FIX-OWNER] Checking vehicle ${registration}...`)

    // First, check if the vehicle exists
    const vehicle = await sql`
      SELECT
        v.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
    `

    if (vehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Vehicle ${registration} not found in database`
      }, { status: 404 })
    }

    const vehicleData = vehicle[0]
    console.log(`[FIX-OWNER] Found vehicle:`, vehicleData)

    // Check if vehicle already has an owner
    if (vehicleData.owner_id || vehicleData.customer_id) {
      return NextResponse.json({
        success: true,
        message: "Vehicle already has an owner",
        vehicle: {
          registration: vehicleData.registration,
          make: vehicleData.make,
          model: vehicleData.model,
          owner: {
            name: `${vehicleData.first_name || ''} ${vehicleData.last_name || ''}`.trim(),
            phone: vehicleData.phone,
            email: vehicleData.email
          }
        }
      })
    }

    // If customerId provided directly, use it
    let finalCustomerId = customerId

    // If customerInfo provided, create or find customer
    if (!finalCustomerId && customerInfo) {
      // Try to find existing customer by phone or email
      const existingCustomer = await sql`
        SELECT id, first_name, last_name, phone, email
        FROM customers
        WHERE phone = ${customerInfo.phone}
        OR email = ${customerInfo.email}
        LIMIT 1
      `

      if (existingCustomer.length > 0) {
        finalCustomerId = existingCustomer[0].id
        console.log(`[FIX-OWNER] Found existing customer: ${finalCustomerId}`)
      } else {
        // Create new customer
        const newCustomer = await sql`
          INSERT INTO customers (
            id,
            first_name,
            last_name,
            phone,
            email,
            address_line1,
            postcode,
            created_at,
            updated_at
          ) VALUES (
            ${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)},
            ${customerInfo.firstName || ''},
            ${customerInfo.lastName || ''},
            ${customerInfo.phone || ''},
            ${customerInfo.email || ''},
            ${customerInfo.address || ''},
            ${customerInfo.postcode || ''},
            NOW(),
            NOW()
          )
          RETURNING id, first_name, last_name
        `
        finalCustomerId = newCustomer[0].id
        console.log(`[FIX-OWNER] Created new customer: ${finalCustomerId}`)
      }
    } else {
      // Look for customer in documents for this vehicle
      const customerFromDocs = await sql`
        SELECT DISTINCT
          c.id,
          c.first_name,
          c.last_name,
          c.phone,
          c.email,
          COUNT(d.id) as document_count
        FROM customers c
        INNER JOIN documents d ON c.id = d._id_customer
        WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
        GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
        ORDER BY COUNT(d.id) DESC
        LIMIT 1
      `

      if (customerFromDocs.length > 0) {
        finalCustomerId = customerFromDocs[0].id
        console.log(`[FIX-OWNER] Found customer from documents: ${finalCustomerId}`)
      }
    }

    if (!finalCustomerId) {
      return NextResponse.json({
        success: false,
        error: "No customer information provided and none found in documents",
        vehicle: {
          registration: vehicleData.registration,
          make: vehicleData.make,
          model: vehicleData.model
        },
        suggestion: "Please provide customer information to link this vehicle"
      })
    }

    // Update vehicle with owner
    console.log(`[FIX-OWNER] Updating vehicle ${registration} with customer ${finalCustomerId}`);
    const updateResult = await sql`
      UPDATE vehicles
      SET
        owner_id = ${finalCustomerId},
        customer_id = ${finalCustomerId},
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
    `
    console.log(`[FIX-OWNER] Update result:`, updateResult);

    // Get updated vehicle info
    const updatedVehicle = await sql`
      SELECT
        v.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle owner connection established successfully",
      updateResult: updateResult,
      vehicle: {
        registration: updatedVehicle[0].registration,
        make: updatedVehicle[0].make,
        model: updatedVehicle[0].model,
        year: updatedVehicle[0].year,
        color: updatedVehicle[0].color,
        mot_expiry_date: updatedVehicle[0].mot_expiry_date,
        owner: {
          id: updatedVehicle[0].owner_id,
          name: `${updatedVehicle[0].first_name || ''} ${updatedVehicle[0].last_name || ''}`.trim(),
          phone: updatedVehicle[0].phone,
          email: updatedVehicle[0].email
        }
      }
    })

  } catch (error) {
    console.error("[FIX-OWNER] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix vehicle owner connection",
      details: error.message
    }, { status: 500 })
  }
}
