import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[FIX-LN64XFG] Starting fix for LN64XFG owner connection...")

    // 1. Find the customer with the most documents for this vehicle
    const primaryCustomer = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        COUNT(d.id) as document_count,
        MAX(d.doc_date_issued) as last_service_date
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
      ORDER BY COUNT(d.id) DESC, MAX(d.doc_date_issued) DESC
      LIMIT 1
    `

    if (primaryCustomer.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No customer found with documents for vehicle LN64XFG",
        action: "Manual customer assignment needed"
      })
    }

    const customer = primaryCustomer[0]
    console.log(`[FIX-LN64XFG] Found primary customer: ${customer.first_name} ${customer.last_name} (${customer.document_count} documents)`)

    // 2. Update the vehicle to link to this customer
    const updateResult = await sql`
      UPDATE vehicles
      SET 
        owner_id = ${customer.id},
        customer_id = ${customer.id},
        updated_at = NOW()
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
      RETURNING registration, make, model, owner_id
    `

    if (updateResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle LN64XFG not found in database"
      })
    }

    // 3. Verify the connection worked
    const verifyConnection = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.owner_id,
        v.customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = 'LN64XFG'
    `

    // 4. Get document count to confirm
    const documentCount = await sql`
      SELECT COUNT(*) as count
      FROM documents d
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      AND d._id_customer = ${customer.id}
    `

    return NextResponse.json({
      success: true,
      message: "Vehicle LN64XFG successfully linked to customer",
      details: {
        vehicle: {
          registration: verifyConnection[0].registration,
          make: verifyConnection[0].make,
          model: verifyConnection[0].model
        },
        customer: {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          phone: customer.phone,
          email: customer.email
        },
        connection_verified: verifyConnection[0].owner_id === customer.id,
        document_count: parseInt(documentCount[0].count),
        last_service: customer.last_service_date
      },
      next_steps: [
        "Refresh the vehicle page to see customer information",
        "Customer Records tab should now show service history",
        "MOT reminders can now be sent to this customer"
      ]
    })

  } catch (error) {
    console.error("[FIX-LN64XFG] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fix vehicle owner connection",
      details: error.message
    }, { status: 500 })
  }
}
