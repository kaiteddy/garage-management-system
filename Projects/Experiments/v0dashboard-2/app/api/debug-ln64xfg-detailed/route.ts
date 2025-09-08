import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[DEBUG-LN64XFG] Detailed analysis of LN64XFG...")

    // 1. Check vehicle record
    const vehicle = await sql`
      SELECT *
      FROM vehicles 
      WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
    `

    // 2. Check documents for this vehicle
    const documents = await sql`
      SELECT 
        d.*,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      ORDER BY d.doc_date_issued DESC
    `

    // 3. Find all customers who have documents for this vehicle
    const customersWithDocs = await sql`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        COUNT(d.id) as document_count,
        MIN(d.doc_date_issued) as first_service,
        MAX(d.doc_date_issued) as last_service
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      WHERE UPPER(REPLACE(d.vehicle_registration, ' ', '')) = 'LN64XFG'
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email
      ORDER BY COUNT(d.id) DESC, MAX(d.doc_date_issued) DESC
    `

    // 4. Check if there are any customer_documents entries
    const customerDocuments = await sql`
      SELECT 
        cd.*,
        c.first_name,
        c.last_name,
        c.phone
      FROM customer_documents cd
      LEFT JOIN customers c ON cd.customer_id = c.id
      WHERE UPPER(REPLACE(cd.vehicle_registration, ' ', '')) = 'LN64XFG'
      ORDER BY cd.document_date DESC
      LIMIT 10
    `

    // 5. Check vehicle table schema to see what fields exist
    const vehicleSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    return NextResponse.json({
      success: true,
      analysis: {
        vehicle_found: vehicle.length > 0,
        vehicle_record: vehicle[0] || null,
        documents_found: documents.length,
        documents: documents.slice(0, 5), // First 5 documents
        customers_with_documents: customersWithDocs,
        customer_documents_entries: customerDocuments.length,
        customer_documents: customerDocuments.slice(0, 5),
        vehicle_schema: vehicleSchema,
        recommendations: {
          primary_customer: customersWithDocs[0] || null,
          action_needed: vehicle.length > 0 && customersWithDocs.length > 0 
            ? `Link vehicle to ${customersWithDocs[0]?.first_name} ${customersWithDocs[0]?.last_name} (${customersWithDocs[0]?.document_count} documents)`
            : vehicle.length === 0 
              ? "Vehicle not found in database"
              : "No customers found with documents for this vehicle"
        }
      }
    })

  } catch (error) {
    console.error("[DEBUG-LN64XFG] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to analyze vehicle",
      details: error.message
    }, { status: 500 })
  }
}
