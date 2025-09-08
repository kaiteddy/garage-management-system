import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[TEST-CUSTOMER-CREATION] Testing customer creation...")

    // Get just one vehicle for testing
    const vehicles = await sql`
      SELECT registration, make, model, mot_expiry_date
      FROM vehicles
      WHERE mot_expiry_date IS NOT NULL
      AND owner_id IS NULL
      AND registration IS NOT NULL
      AND registration != ''
      LIMIT 1
    `

    console.log(`[TEST-CUSTOMER-CREATION] Found ${vehicles.length} vehicles`)
    console.log(`[TEST-CUSTOMER-CREATION] Vehicle:`, vehicles[0])

    if (vehicles.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No vehicles found for testing"
      })
    }

    const vehicle = vehicles[0]

    // Generate customer data
    const firstName = "John"
    const lastName = "Smith"
    const phone = "07123456789"
    const email = "john.smith@example.com"
    const address = "123 Test Street"
    const city = "London"
    const postcode = "SW1A 1AA"

    console.log(`[TEST-CUSTOMER-CREATION] Creating customer: ${firstName} ${lastName}`)

    // Get next customer ID
    const maxIdResult = await sql`
      SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 as next_id
      FROM customers
    `
    const nextId = maxIdResult[0].next_id.toString()

    // Create customer
    const newCustomer = await sql`
      INSERT INTO customers (
        id, first_name, last_name, phone, email,
        address_line1, city, postcode
      ) VALUES (
        ${nextId},
        ${firstName},
        ${lastName},
        ${phone},
        ${email},
        ${address},
        ${city},
        ${postcode}
      )
      RETURNING id, first_name, last_name
    `

    console.log(`[TEST-CUSTOMER-CREATION] Customer created:`, newCustomer[0])

    const customerId = newCustomer[0].id

    // Link vehicle to customer
    const updateResult = await sql`
      UPDATE vehicles
      SET
        owner_id = ${customerId},
        updated_at = NOW()
      WHERE registration = ${vehicle.registration}
      RETURNING registration, owner_id
    `

    console.log(`[TEST-CUSTOMER-CREATION] Vehicle updated:`, updateResult[0])

    // Verify the relationship
    const verification = await sql`
      SELECT
        v.registration,
        v.owner_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE v.registration = ${vehicle.registration}
    `

    console.log(`[TEST-CUSTOMER-CREATION] Verification:`, verification[0])

    return NextResponse.json({
      success: true,
      message: "Test customer creation successful",
      results: {
        vehicle: vehicle,
        customer: newCustomer[0],
        update: updateResult[0],
        verification: verification[0]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[TEST-CUSTOMER-CREATION] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test customer creation",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
