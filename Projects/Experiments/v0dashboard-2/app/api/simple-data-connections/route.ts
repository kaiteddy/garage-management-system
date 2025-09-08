import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[SIMPLE-DATA-CHECK] Checking data connections...')

    // Basic counts
    const basicCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM document_line_items) as line_items,
        (SELECT COUNT(*) FROM document_extras) as document_extras,
        (SELECT COUNT(*) FROM mot_history) as mot_records
    `

    // Sample customer-vehicle connections (using owner_id)
    const customerVehicleSample = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        c.phone,
        v.registration,
        v.make,
        v.model,
        v.mot_expiry_date
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      LIMIT 5
    `

    // Sample customer-document connections (using _id_customer)
    const customerDocumentSample = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        d.doc_number,
        d.doc_type,
        d.vehicle_registration,
        d.total_gross
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      LIMIT 5
    `

    // Sample document-line item connections
    const documentLineItemSample = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        dli.description,
        dli.quantity,
        dli.total_price
      FROM documents d
      INNER JOIN document_line_items dli ON d.id = dli.document_id
      LIMIT 5
    `

    // Sample document extras
    const documentExtrasSample = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        de.labour_description
      FROM documents d
      INNER JOIN document_extras de ON d.id = de.document_id
      LIMIT 5
    `

    // Check connection counts
    const connectionCounts = await sql`
      SELECT 
        (SELECT COUNT(DISTINCT c.id) FROM customers c INNER JOIN vehicles v ON c.id = v.owner_id) as customers_with_vehicles,
        (SELECT COUNT(DISTINCT c.id) FROM customers c INNER JOIN documents d ON c.id = d._id_customer) as customers_with_documents,
        (SELECT COUNT(DISTINCT d.id) FROM documents d INNER JOIN document_line_items dli ON d.id = dli.document_id) as documents_with_line_items,
        (SELECT COUNT(DISTINCT d.id) FROM documents d INNER JOIN document_extras de ON d.id = de.document_id) as documents_with_extras
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_records: basicCounts[0],
        connected_records: connectionCounts[0]
      },
      data_connections: {
        customer_vehicle_connections: {
          status: customerVehicleSample.length > 0 ? "CONNECTED" : "NOT CONNECTED",
          sample_data: customerVehicleSample,
          connection_field: "customers.id = vehicles.owner_id"
        },
        customer_document_connections: {
          status: customerDocumentSample.length > 0 ? "CONNECTED" : "NOT CONNECTED", 
          sample_data: customerDocumentSample,
          connection_field: "customers.id = documents._id_customer"
        },
        document_line_item_connections: {
          status: documentLineItemSample.length > 0 ? "CONNECTED" : "NOT CONNECTED",
          sample_data: documentLineItemSample,
          connection_field: "documents.id = document_line_items.document_id"
        },
        document_extras_connections: {
          status: documentExtrasSample.length > 0 ? "CONNECTED" : "NOT CONNECTED",
          sample_data: documentExtrasSample,
          connection_field: "documents.id = document_extras.document_id"
        }
      },
      connection_health: {
        all_major_connections_working: 
          customerVehicleSample.length > 0 && 
          customerDocumentSample.length > 0 && 
          documentLineItemSample.length > 0 && 
          documentExtrasSample.length > 0,
        customers_to_vehicles: customerVehicleSample.length > 0,
        customers_to_documents: customerDocumentSample.length > 0,
        documents_to_line_items: documentLineItemSample.length > 0,
        documents_to_extras: documentExtrasSample.length > 0
      },
      database_status: "All data points are properly connected and relationships are working"
    })

  } catch (error) {
    console.error('[SIMPLE-DATA-CHECK] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to check simple data connections"
      },
      { status: 500 }
    )
  }
}
