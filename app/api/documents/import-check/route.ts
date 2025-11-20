import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[IMPORT-CHECK] Checking document import completeness...")

    // Check total documents in database
    const totalDocs = await sql`
      SELECT COUNT(*) as count FROM documents
    `

    // Check documents by type
    const docsByType = await sql`
      SELECT
        doc_type,
        COUNT(*) as count
      FROM documents
      GROUP BY doc_type
      ORDER BY count DESC
    `

    // Check for specific customer Rebecca Lewis documents
    const rebeccaDocs = await sql`
      SELECT
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross
      FROM documents
      WHERE customer_name ILIKE '%Rebecca%'
      OR customer_name ILIKE '%Lewis%'
      OR _id_customer = 'B8D55B74E1A51D498B28E50874014716'
      ORDER BY doc_date_issued DESC
    `

    // Check for NG07 LML vehicle documents
    const ng07Docs = await sql`
      SELECT
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross
      FROM documents
      WHERE vehicle_registration ILIKE '%NG07%'
      OR vehicle_registration ILIKE '%LML%'
      ORDER BY doc_date_issued DESC
    `

    // Check for job numbers starting with SI
    const siJobs = await sql`
      SELECT
        id,
        doc_number,
        doc_type,
        doc_date_issued,
        vehicle_registration,
        customer_name,
        total_gross
      FROM documents
      WHERE doc_number ILIKE 'SI%'
      ORDER BY doc_number DESC
      LIMIT 20
    `

    // Check document line items
    const lineItemsCount = await sql`
      SELECT COUNT(*) as count FROM document_line_items
    `

    // Check for any documents with line items
    const docsWithLineItems = await sql`
      SELECT
        d.doc_number,
        d.doc_type,
        d.vehicle_registration,
        COUNT(dli.id) as line_item_count
      FROM documents d
      LEFT JOIN document_line_items dli ON d.id::text = dli.document_id::text
      GROUP BY d.id, d.doc_number, d.doc_type, d.vehicle_registration
      HAVING COUNT(dli.id) > 0
      ORDER BY line_item_count DESC
      LIMIT 10
    `

    // Check customers table for Rebecca Lewis
    const rebeccaCustomer = await sql`
      SELECT * FROM customers
      WHERE id = 'B8D55B74E1A51D498B28E50874014716'
      OR first_name ILIKE '%Rebecca%'
      OR last_name ILIKE '%Lewis%'
    `

    return NextResponse.json({
      success: true,
      import_analysis: {
        total_documents: parseInt(totalDocs[0].count),
        documents_by_type: docsByType,
        rebecca_lewis_documents: rebeccaDocs,
        ng07_vehicle_documents: ng07Docs,
        si_job_numbers: siJobs,
        total_line_items: parseInt(lineItemsCount[0].count),
        documents_with_line_items: docsWithLineItems,
        rebecca_customer_record: rebeccaCustomer[0] || null
      },
      critical_findings: {
        no_documents_found: parseInt(totalDocs[0].count) === 0,
        no_rebecca_documents: rebeccaDocs.length === 0,
        no_ng07_documents: ng07Docs.length === 0,
        no_si_jobs: siJobs.length === 0,
        no_line_items: parseInt(lineItemsCount[0].count) === 0,
        customer_exists: !!rebeccaCustomer[0]
      },
      recommendations: [
        parseInt(totalDocs[0].count) === 0 ? "CRITICAL: No documents imported - check document import process" : null,
        rebeccaDocs.length === 0 ? "No documents found for Rebecca Lewis - check customer ID matching" : null,
        ng07Docs.length === 0 ? "No documents found for vehicle NG07 LML - check vehicle registration matching" : null,
        siJobs.length === 0 ? "No SI job numbers found - job SI80349 missing from import" : null,
        parseInt(lineItemsCount[0].count) === 0 ? "No line items imported - detailed service information missing" : null
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IMPORT-CHECK] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check document import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
