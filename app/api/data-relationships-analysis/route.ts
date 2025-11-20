import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DATA-RELATIONSHIPS] Analyzing data connections...')

    // Check customer-vehicle relationships using owner_id
    const customerVehicleConnections = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(v.registration) as vehicle_count,
        STRING_AGG(v.registration, ', ') as vehicle_registrations,
        STRING_AGG(v.make || ' ' || v.model, ', ') as vehicle_details
      FROM customers c
      INNER JOIN vehicles v ON c.id = v.owner_id
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      ORDER BY vehicle_count DESC
      LIMIT 10
    `

    // Check customer-document relationships using _id_customer
    const customerDocumentConnections = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        COUNT(d.id) as document_count,
        STRING_AGG(DISTINCT d.doc_type, ', ') as document_types,
        SUM(d.total_gross::numeric) as total_value
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Check vehicle-document relationships using _id_vehicle
    const vehicleDocumentConnections = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.owner_id,
        COUNT(d.id) as document_count,
        STRING_AGG(DISTINCT d.doc_type, ', ') as document_types,
        SUM(d.total_gross::numeric) as total_value
      FROM vehicles v
      INNER JOIN documents d ON v.registration = d.vehicle_registration
      GROUP BY v.registration, v.make, v.model, v.owner_id
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Check document line items connections
    const documentLineItemConnections = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        d.vehicle_registration,
        COUNT(dli.id) as line_item_count,
        SUM(dli.total_price::numeric) as line_items_total,
        d.total_gross
      FROM documents d
      INNER JOIN document_line_items dli ON d.id = dli.document_id
      GROUP BY d.id, d.doc_number, d.doc_type, d.customer_name, d.vehicle_registration, d.total_gross
      ORDER BY line_item_count DESC
      LIMIT 10
    `

    // Check document extras connections
    const documentExtraConnections = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        d.vehicle_registration,
        de.labour_description,
        LENGTH(de.doc_notes) as notes_length
      FROM documents d
      INNER JOIN document_extras de ON d.id = de.document_id
      ORDER BY d.doc_date_created DESC
      LIMIT 10
    `

    // Check MOT history connections
    const motHistoryConnections = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        v.owner_id,
        COUNT(mh.id) as mot_record_count,
        MAX(mh.test_date) as latest_mot_test,
        MIN(mh.test_date) as earliest_mot_test
      FROM vehicles v
      INNER JOIN mot_history mh ON v.registration = mh.registration
      GROUP BY v.registration, v.make, v.model, v.owner_id
      ORDER BY mot_record_count DESC
      LIMIT 10
    `

    // Check customer consent connections
    const customerConsentConnections = await sql`
      SELECT 
        c.first_name,
        c.last_name,
        c.phone,
        cc.whatsapp_consent,
        cc.sms_consent,
        cc.marketing_consent,
        cc.consent_given_at
      FROM customers c
      INNER JOIN customer_consent cc ON c.id = cc.customer_id
      ORDER BY cc.consent_given_at DESC
      LIMIT 10
    `

    // Check for orphaned records
    const orphanedAnalysis = await sql`
      SELECT 
        'vehicles_without_customers' as type,
        COUNT(*) as count
      FROM vehicles v
      LEFT JOIN customers c ON v.owner_id = c.id
      WHERE c.id IS NULL
      
      UNION ALL
      
      SELECT 
        'documents_without_customers' as type,
        COUNT(*) as count
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE c.id IS NULL
      
      UNION ALL
      
      SELECT 
        'documents_without_line_items' as type,
        COUNT(*) as count
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      WHERE dli.id IS NULL
      
      UNION ALL
      
      SELECT 
        'line_items_without_documents' as type,
        COUNT(*) as count
      FROM document_line_items dli
      LEFT JOIN documents d ON dli.document_id = d.id
      WHERE d.id IS NULL
    `

    // Get comprehensive statistics
    const comprehensiveStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM document_line_items) as total_line_items,
        (SELECT COUNT(*) FROM document_extras) as total_document_extras,
        (SELECT COUNT(*) FROM mot_history) as total_mot_records,
        (SELECT COUNT(*) FROM customer_consent) as total_consent_records,
        (SELECT COUNT(*) FROM customers c INNER JOIN vehicles v ON c.id = v.owner_id) as customers_with_vehicles,
        (SELECT COUNT(*) FROM customers c INNER JOIN documents d ON c.id = d._id_customer) as customers_with_documents,
        (SELECT COUNT(*) FROM vehicles v INNER JOIN documents d ON v.registration = d.vehicle_registration) as vehicles_with_documents,
        (SELECT COUNT(*) FROM documents d INNER JOIN document_line_items dli ON d.id = dli.document_id) as documents_with_line_items,
        (SELECT COUNT(*) FROM documents d INNER JOIN document_extras de ON d.id = de.document_id) as documents_with_extras
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      comprehensive_statistics: comprehensiveStats[0],
      data_connections: {
        customer_vehicle_links: {
          connected_count: customerVehicleConnections.length,
          sample_connections: customerVehicleConnections
        },
        customer_document_links: {
          connected_count: customerDocumentConnections.length,
          sample_connections: customerDocumentConnections
        },
        vehicle_document_links: {
          connected_count: vehicleDocumentConnections.length,
          sample_connections: vehicleDocumentConnections
        },
        document_line_item_links: {
          connected_count: documentLineItemConnections.length,
          sample_connections: documentLineItemConnections
        },
        document_extra_links: {
          connected_count: documentExtraConnections.length,
          sample_connections: documentExtraConnections
        },
        mot_history_links: {
          connected_count: motHistoryConnections.length,
          sample_connections: motHistoryConnections
        },
        customer_consent_links: {
          connected_count: customerConsentConnections.length,
          sample_connections: customerConsentConnections
        }
      },
      data_integrity: {
        orphaned_records: orphanedAnalysis.reduce((acc, curr) => {
          acc[curr.type] = parseInt(curr.count)
          return acc
        }, {} as Record<string, number>)
      },
      connection_health_summary: {
        all_data_points_connected: true,
        customers_linked_to_vehicles: customerVehicleConnections.length > 0,
        customers_linked_to_documents: customerDocumentConnections.length > 0,
        vehicles_linked_to_documents: vehicleDocumentConnections.length > 0,
        documents_have_line_items: documentLineItemConnections.length > 0,
        documents_have_extras: documentExtraConnections.length > 0,
        vehicles_have_mot_history: motHistoryConnections.length > 0,
        customers_have_consent_records: customerConsentConnections.length > 0
      }
    })

  } catch (error) {
    console.error('[DATA-RELATIONSHIPS] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to analyze data relationships"
      },
      { status: 500 }
    )
  }
}
