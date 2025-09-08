import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🔍 [QUICK-DOC-CHECK] Checking document and line item status...')

    // 1. Check all document-related tables
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%document%' OR table_name LIKE '%line%' OR table_name LIKE '%item%')
      ORDER BY table_name
    `

    // 2. Count records in each table
    const documentCount = await sql`SELECT COUNT(*) as count FROM documents`
    const lineItemCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const extrasCount = await sql`SELECT COUNT(*) as count FROM document_extras`

    // 3. Sample line items to see their structure
    const sampleLineItems = await sql`
      SELECT id, document_id, description, quantity, total_price
      FROM document_line_items
      ORDER BY id DESC
      LIMIT 5
    `

    // 4. Sample document extras
    const sampleExtras = await sql`
      SELECT id, document_id, labour_description, amount
      FROM document_extras
      ORDER BY id DESC
      LIMIT 5
    `

    // 5. Check if line items have valid document references
    const lineItemConnections = await sql`
      SELECT 
        COUNT(*) as total_line_items,
        COUNT(DISTINCT document_id) as unique_document_ids,
        COUNT(CASE WHEN document_id IS NULL OR document_id = '' THEN 1 END) as items_without_doc_id
      FROM document_line_items
    `

    // 6. Check if extras have valid document references
    const extrasConnections = await sql`
      SELECT 
        COUNT(*) as total_extras,
        COUNT(DISTINCT document_id) as unique_document_ids,
        COUNT(CASE WHEN document_id IS NULL OR document_id = '' THEN 1 END) as extras_without_doc_id
      FROM document_extras
    `

    // 7. Sample document IDs from line items
    const sampleDocIds = await sql`
      SELECT DISTINCT document_id
      FROM document_line_items
      WHERE document_id IS NOT NULL AND document_id != ''
      ORDER BY document_id
      LIMIT 10
    `

    // 8. Check if any of these document IDs exist in documents table
    let documentMatches = []
    if (sampleDocIds.length > 0) {
      const docId = sampleDocIds[0].document_id
      documentMatches = await sql`
        SELECT id, _id, doc_number, doc_type, customer_name, total_gross
        FROM documents
        WHERE id::text = ${docId} OR _id = ${docId}
        LIMIT 5
      `
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {
        tables: allTables,
        counts: {
          documents: parseInt(documentCount[0].count),
          line_items: parseInt(lineItemCount[0].count),
          extras: parseInt(extrasCount[0].count)
        },
        connections: {
          line_items: lineItemConnections[0],
          extras: extrasConnections[0]
        },
        samples: {
          line_items: sampleLineItems,
          extras: sampleExtras,
          document_ids: sampleDocIds,
          document_matches: documentMatches
        },
        status: {
          documents_exist: parseInt(documentCount[0].count) > 0,
          line_items_exist: parseInt(lineItemCount[0].count) > 0,
          extras_exist: parseInt(extrasCount[0].count) > 0,
          connections_valid: documentMatches.length > 0
        }
      }
    })

  } catch (error) {
    console.error('❌ [QUICK-DOC-CHECK] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔧 [QUICK-DOC-FIX] Attempting to fix document connections...')

    // 1. Check if we can create sample documents from line items
    const orphanedLineItems = await sql`
      SELECT DISTINCT document_id, COUNT(*) as item_count
      FROM document_line_items
      WHERE document_id IS NOT NULL 
      AND document_id != ''
      AND document_id NOT IN (
        SELECT id::text FROM documents 
        UNION 
        SELECT _id FROM documents WHERE _id IS NOT NULL
      )
      GROUP BY document_id
      ORDER BY item_count DESC
      LIMIT 10
    `

    // 2. For demonstration, let's see what we can reconstruct
    let reconstructionAttempt = []
    if (orphanedLineItems.length > 0) {
      const docId = orphanedLineItems[0].document_id
      
      // Get all line items for this document
      const docLineItems = await sql`
        SELECT id, description, quantity, unit_price, total_price
        FROM document_line_items
        WHERE document_id = ${docId}
        ORDER BY id
      `

      // Get extras for this document
      const docExtras = await sql`
        SELECT id, labour_description, amount
        FROM document_extras
        WHERE document_id = ${docId}
        ORDER BY id
      `

      reconstructionAttempt = {
        document_id: docId,
        line_items: docLineItems,
        extras: docExtras,
        total_items: docLineItems.length,
        total_extras: docExtras.length,
        estimated_total: docLineItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Document connection analysis completed",
      analysis: {
        orphaned_documents: orphanedLineItems.length,
        sample_reconstruction: reconstructionAttempt,
        recommendation: orphanedLineItems.length > 0 
          ? "Line items exist but documents are missing. Consider importing documents or reconstructing from line items."
          : "No orphaned line items found. System appears to be in good state."
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [QUICK-DOC-FIX] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
