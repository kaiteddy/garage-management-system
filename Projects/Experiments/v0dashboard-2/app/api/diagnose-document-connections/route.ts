import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🔍 [DIAGNOSE-DOCS] Starting comprehensive document and line item analysis...')

    // 1. Check what document tables exist
    const documentTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%document%'
      ORDER BY table_name
    `

    // 2. Check what line item tables exist
    const lineItemTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%line%' OR table_name LIKE '%item%')
      ORDER BY table_name
    `

    // 3. Get main documents table schema
    const documentsSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `

    // 4. Get document statistics
    const documentStats = await sql`
      SELECT
        COUNT(*) as total_documents,
        COUNT(_id_customer) as docs_with_customer_id,
        COUNT(vehicle_registration) as docs_with_vehicle_reg,
        COUNT(CASE WHEN _id_customer IS NULL THEN 1 END) as docs_without_customer,
        COUNT(CASE WHEN vehicle_registration IS NULL OR vehicle_registration = '' THEN 1 END) as docs_without_vehicle
      FROM documents
    `

    // 5. Check line items connections
    const lineItemStats = await sql`
      SELECT
        COUNT(*) as total_line_items,
        COUNT(document_id) as items_with_document_id,
        COUNT(CASE WHEN document_id IS NULL THEN 1 END) as orphaned_line_items
      FROM document_line_items
    `

    // 6. Sample documents with customer connections
    const connectedDocuments = await sql`
      SELECT 
        d.id, d.doc_number, d.doc_type, d.doc_date_issued, d.total_gross,
        d._id_customer, d.vehicle_registration,
        c.first_name, c.last_name, c.phone
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d._id_customer IS NOT NULL
      ORDER BY d.doc_date_issued DESC
      LIMIT 5
    `

    // 7. Sample documents without customer connections
    const unconnectedDocuments = await sql`
      SELECT 
        id, doc_number, doc_type, doc_date_issued, total_gross,
        _id_customer, vehicle_registration, customer_name
      FROM documents
      WHERE _id_customer IS NULL
      ORDER BY doc_date_issued DESC
      LIMIT 5
    `

    // 8. Check document-vehicle connections via registration
    const vehicleConnections = await sql`
      SELECT 
        COUNT(*) as total_docs_with_registration,
        COUNT(v.registration) as docs_with_matching_vehicle,
        COUNT(CASE WHEN v.registration IS NULL THEN 1 END) as docs_with_invalid_registration
      FROM documents d
      LEFT JOIN vehicles v ON UPPER(REPLACE(d.vehicle_registration, ' ', '')) = UPPER(REPLACE(v.registration, ' ', ''))
      WHERE d.vehicle_registration IS NOT NULL AND d.vehicle_registration != ''
    `

    // 9. Sample line items with document connections
    const sampleLineItems = await sql`
      SELECT 
        li.id, li.document_id, li.description, li.quantity, li.total_price,
        d.doc_number, d.doc_type, d.customer_name
      FROM document_line_items li
      LEFT JOIN documents d ON li.document_id = d.id
      ORDER BY li.id DESC
      LIMIT 5
    `

    // 10. Check for orphaned line items
    const orphanedLineItems = await sql`
      SELECT 
        li.id, li.document_id, li.description, li.quantity, li.total_price
      FROM document_line_items li
      LEFT JOIN documents d ON li.document_id = d.id
      WHERE d.id IS NULL
      LIMIT 5
    `

    // 11. Document type distribution
    const documentTypes = await sql`
      SELECT 
        doc_type, 
        COUNT(*) as count,
        COUNT(_id_customer) as with_customer,
        COUNT(vehicle_registration) as with_vehicle
      FROM documents
      GROUP BY doc_type
      ORDER BY count DESC
      LIMIT 10
    `

    // 12. Top customers by document count
    const topCustomersByDocs = await sql`
      SELECT 
        c.id, c.first_name, c.last_name, c.phone,
        COUNT(d.id) as document_count,
        SUM(d.total_gross) as total_value
      FROM customers c
      INNER JOIN documents d ON c.id = d._id_customer
      GROUP BY c.id, c.first_name, c.last_name, c.phone
      ORDER BY document_count DESC
      LIMIT 10
    `

    console.log('✅ [DIAGNOSE-DOCS] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {
        tables: {
          document_tables: documentTables,
          line_item_tables: lineItemTables,
          documents_schema: documentsSchema
        },
        statistics: {
          documents: documentStats[0],
          line_items: lineItemStats[0],
          vehicle_connections: vehicleConnections[0]
        },
        samples: {
          connected_documents: connectedDocuments,
          unconnected_documents: unconnectedDocuments,
          line_items: sampleLineItems,
          orphaned_line_items: orphanedLineItems
        },
        insights: {
          document_types: documentTypes,
          top_customers: topCustomersByDocs
        }
      }
    })

  } catch (error) {
    console.error('❌ [DIAGNOSE-DOCS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 [FIX-DOCS] Starting document and line item connection fixes...')

    let fixesApplied = 0

    // 1. Fix documents with customer names but no customer_id
    const fixCustomerConnections = await sql`
      UPDATE documents 
      SET _id_customer = c.id, updated_at = NOW()
      FROM customers c
      WHERE documents._id_customer IS NULL
      AND documents.customer_name IS NOT NULL
      AND documents.customer_name != ''
      AND (
        LOWER(documents.customer_name) = LOWER(c.first_name || ' ' || c.last_name)
        OR LOWER(documents.customer_name) = LOWER(c.last_name || ', ' || c.first_name)
        OR LOWER(documents.customer_name) LIKE LOWER('%' || c.last_name || '%')
      )
    `
    fixesApplied += fixCustomerConnections.count || 0

    // 2. Remove orphaned line items (items pointing to non-existent documents)
    const removeOrphanedItems = await sql`
      DELETE FROM document_line_items
      WHERE document_id NOT IN (SELECT id FROM documents)
    `

    // 3. Get final statistics
    const finalStats = await sql`
      SELECT
        COUNT(*) as total_documents,
        COUNT(_id_customer) as docs_with_customer_id,
        COUNT(vehicle_registration) as docs_with_vehicle_reg,
        COUNT(CASE WHEN _id_customer IS NULL THEN 1 END) as docs_without_customer
      FROM documents
    `

    const finalLineItemStats = await sql`
      SELECT
        COUNT(*) as total_line_items,
        COUNT(document_id) as items_with_document_id,
        COUNT(CASE WHEN document_id IS NULL THEN 1 END) as orphaned_line_items
      FROM document_line_items
    `

    console.log('✅ [FIX-DOCS] Document fixes completed')

    return NextResponse.json({
      success: true,
      message: "Document and line item connections fixed",
      fixes_applied: {
        customer_connections: fixCustomerConnections.count || 0,
        orphaned_items_removed: removeOrphanedItems.count || 0
      },
      final_statistics: {
        documents: finalStats[0],
        line_items: finalLineItemStats[0]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [FIX-DOCS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
