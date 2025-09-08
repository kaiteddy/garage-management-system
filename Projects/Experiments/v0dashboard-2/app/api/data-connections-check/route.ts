import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DATA-CHECK] Checking all data connections and relationships...')

    // Check table existence and structure
    const tables = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'vehicles', 'documents', 'document_line_items', 'document_extras', 'customer_consent', 'mot_history')
      ORDER BY table_name, ordinal_position
    `

    // Check customer-vehicle relationships
    const customerVehicleLinks = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        COUNT(v.id) as vehicle_count,
        STRING_AGG(v.registration, ', ') as registrations
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.customer_id
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(v.id) > 0
      ORDER BY vehicle_count DESC
      LIMIT 10
    `

    // Check customer-document relationships
    const customerDocumentLinks = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        COUNT(d.id) as document_count,
        STRING_AGG(DISTINCT d.doc_type, ', ') as doc_types
      FROM customers c
      LEFT JOIN documents d ON c.id = d.customer_id
      GROUP BY c.id, c.first_name, c.last_name
      HAVING COUNT(d.id) > 0
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Check vehicle-document relationships
    const vehicleDocumentLinks = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        COUNT(d.id) as document_count,
        STRING_AGG(DISTINCT d.doc_type, ', ') as doc_types
      FROM vehicles v
      LEFT JOIN documents d ON v.id = d.vehicle_id
      GROUP BY v.id, v.registration, v.make, v.model
      HAVING COUNT(d.id) > 0
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Check document line items connections
    const documentLineItemLinks = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        COUNT(dli.id) as line_item_count,
        SUM(dli.total_price) as total_value
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id = dli.document_id
      GROUP BY d.id, d.doc_number, d.doc_type, d.customer_name
      HAVING COUNT(dli.id) > 0
      ORDER BY line_item_count DESC
      LIMIT 10
    `

    // Check document extras connections
    const documentExtraLinks = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        de.labour_description,
        LENGTH(de.doc_notes) as notes_length
      FROM documents d
      INNER JOIN document_extras de ON d.id = de.document_id
      ORDER BY d.doc_date_created DESC
      LIMIT 10
    `

    // Check MOT history connections
    const motHistoryLinks = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        COUNT(mh.id) as mot_records,
        MAX(mh.test_date) as latest_mot,
        MIN(mh.test_date) as earliest_mot
      FROM vehicles v
      LEFT JOIN mot_history mh ON v.registration = mh.registration
      GROUP BY v.id, v.registration, v.make, v.model
      HAVING COUNT(mh.id) > 0
      ORDER BY mot_records DESC
      LIMIT 10
    `

    // Check customer consent connections
    const consentLinks = await sql`
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

    // Check orphaned records
    const orphanedVehicles = await sql`
      SELECT COUNT(*) as count
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE c.id IS NULL
    `

    const orphanedDocuments = await sql`
      SELECT COUNT(*) as count
      FROM documents d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE c.id IS NULL
    `

    const orphanedLineItems = await sql`
      SELECT COUNT(*) as count
      FROM document_line_items dli
      LEFT JOIN documents d ON dli.document_id = d.id
      WHERE d.id IS NULL
    `

    // Get summary statistics
    const summaryStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM document_line_items) as total_line_items,
        (SELECT COUNT(*) FROM document_extras) as total_document_extras,
        (SELECT COUNT(*) FROM mot_history) as total_mot_records,
        (SELECT COUNT(*) FROM customer_consent) as total_consent_records
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary_statistics: summaryStats[0],
      data_relationships: {
        customer_vehicle_links: {
          count: customerVehicleLinks.length,
          sample_data: customerVehicleLinks
        },
        customer_document_links: {
          count: customerDocumentLinks.length,
          sample_data: customerDocumentLinks
        },
        vehicle_document_links: {
          count: vehicleDocumentLinks.length,
          sample_data: vehicleDocumentLinks
        },
        document_line_items: {
          count: documentLineItemLinks.length,
          sample_data: documentLineItemLinks
        },
        document_extras: {
          count: documentExtraLinks.length,
          sample_data: documentExtraLinks
        },
        mot_history_links: {
          count: motHistoryLinks.length,
          sample_data: motHistoryLinks
        },
        customer_consent: {
          count: consentLinks.length,
          sample_data: consentLinks
        }
      },
      data_integrity: {
        orphaned_vehicles: orphanedVehicles[0].count,
        orphaned_documents: orphanedDocuments[0].count,
        orphaned_line_items: orphanedLineItems[0].count
      },
      table_structure: {
        tables_found: [...new Set(tables.map(t => t.table_name))],
        total_columns: tables.length
      },
      connection_health: {
        customers_with_vehicles: customerVehicleLinks.length > 0,
        customers_with_documents: customerDocumentLinks.length > 0,
        vehicles_with_documents: vehicleDocumentLinks.length > 0,
        documents_with_line_items: documentLineItemLinks.length > 0,
        documents_with_extras: documentExtraLinks.length > 0,
        vehicles_with_mot_history: motHistoryLinks.length > 0,
        customers_with_consent: consentLinks.length > 0
      }
    })

  } catch (error) {
    console.error('[DATA-CHECK] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to check data connections"
      },
      { status: 500 }
    )
  }
}
