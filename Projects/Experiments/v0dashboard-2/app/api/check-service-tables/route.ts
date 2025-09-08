import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    const results = {}

    // Check documents table
    try {
      const documentsCount = await sql`SELECT COUNT(*) as count FROM documents`
      results.documents = parseInt(documentsCount[0].count)
    } catch (error) {
      results.documents = `Error: ${error.message}`
    }

    // Check document_extras table
    try {
      const documentExtrasCount = await sql`SELECT COUNT(*) as count FROM document_extras`
      results.document_extras = parseInt(documentExtrasCount[0].count)
    } catch (error) {
      results.document_extras = `Error: ${error.message}`
    }

    // Check line_items table
    try {
      const lineItemsCount = await sql`SELECT COUNT(*) as count FROM line_items`
      results.line_items = parseInt(lineItemsCount[0].count)
    } catch (error) {
      results.line_items = `Error: ${error.message}`
    }

    // Check customer_documents table
    try {
      const customerDocsCount = await sql`SELECT COUNT(*) as count FROM customer_documents`
      results.customer_documents = parseInt(customerDocsCount[0].count)
    } catch (error) {
      results.customer_documents = `Error: ${error.message}`
    }

    // Check receipts table
    try {
      const receiptsCount = await sql`SELECT COUNT(*) as count FROM receipts`
      results.receipts = parseInt(receiptsCount[0].count)
    } catch (error) {
      results.receipts = `Error: ${error.message}`
    }

    // If documents table has data, get a sample
    if (results.documents > 0) {
      try {
        const sampleDoc = await sql`
          SELECT vehicle_registration, doc_date_issued, total_gross, customer_name
          FROM documents 
          WHERE vehicle_registration IS NOT NULL
          LIMIT 3
        `
        results.sampleDocuments = sampleDoc
      } catch (error) {
        results.sampleDocuments = `Error: ${error.message}`
      }
    }

    // If document_extras has data, get a sample
    if (results.document_extras > 0) {
      try {
        const sampleExtras = await sql`
          SELECT document_id, labour_description
          FROM document_extras 
          LIMIT 3
        `
        results.sampleExtras = sampleExtras
      } catch (error) {
        results.sampleExtras = `Error: ${error.message}`
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Error checking service tables:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check service tables",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
