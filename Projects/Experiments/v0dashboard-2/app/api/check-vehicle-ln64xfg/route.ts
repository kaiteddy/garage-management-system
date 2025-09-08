import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[CHECK-LN64XFG] Checking vehicle LN64XFG...")

    // Check if vehicle exists
    const vehicle = await sql`
      SELECT 
        v.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON (v.owner_id = c.id OR v.customer_id = c.id)
      WHERE UPPER(REPLACE(v.registration, ' ', '')) = 'LN64XFG'
    `

    if (vehicle.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Vehicle LN64XFG not found in database",
        action_needed: "Vehicle needs to be imported or added to database"
      })
    }

    const vehicleData = vehicle[0]

    // Check for documents related to this vehicle
    const documents = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.doc_date_issued,
        d.customer_name,
        d._id_customer,
        c.first_name,
        c.last_name,
        c.phone
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      ORDER BY d.doc_date_issued DESC
      LIMIT 5
    `

    // Check for potential customer matches
    const potentialCustomers = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        COUNT(d.id) as document_count
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
      ORDER BY COUNT(d.id) DESC
    `

    return NextResponse.json({
      success: true,
      vehicle: {
        registration: vehicleData.registration,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        color: vehicleData.color,
        mot_expiry_date: vehicleData.mot_expiry_date,
        owner_id: vehicleData.owner_id,
        customer_id: vehicleData.customer_id,
        current_owner: vehicleData.first_name ? {
          name: `${vehicleData.first_name} ${vehicleData.last_name}`.trim(),
          phone: vehicleData.phone,
          email: vehicleData.email
        } : null
      },
      documents: documents.map(doc => ({
        doc_number: doc.doc_number,
        doc_type: doc.doc_type,
        date: doc.doc_date_issued,
        customer_name: doc.customer_name,
        linked_customer: doc.first_name ? {
          name: `${doc.first_name} ${doc.last_name}`.trim(),
          phone: doc.phone
        } : null
      })),
      potential_customers: potentialCustomers.map(customer => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`.trim(),
        phone: customer.phone,
        email: customer.email,
        document_count: customer.document_count
      })),
      diagnosis: {
        has_owner: !!(vehicleData.owner_id || vehicleData.customer_id),
        has_documents: documents.length > 0,
        has_potential_customers: potentialCustomers.length > 0,
        recommended_action: !vehicleData.owner_id && potentialCustomers.length > 0 
          ? `Link to customer: ${potentialCustomers[0].first_name} ${potentialCustomers[0].last_name} (${potentialCustomers[0].document_count} documents)`
          : vehicleData.owner_id 
            ? "Vehicle already has owner"
            : "No customer found - manual assignment needed"
      }
    })

  } catch (error) {
    console.error("[CHECK-LN64XFG] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check vehicle",
      details: error.message
    }, { status: 500 })
  }
}
