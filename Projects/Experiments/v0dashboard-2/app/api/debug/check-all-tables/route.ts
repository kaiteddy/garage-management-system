import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[CHECK-ALL-TABLES] Checking all tables and their data...')

    // Get all tables in the database
    const allTables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Check documents table
    let documentsData = []
    let documentsCount = 0
    try {
      const documentsCountResult = await sql`SELECT COUNT(*) as count FROM documents`
      documentsCount = documentsCountResult[0]?.count || 0
      
      if (documentsCount > 0) {
        documentsData = await sql`
          SELECT id, doc_number, doc_type, customer_name, vehicle_registration, doc_status
          FROM documents
          LIMIT 10
        `
      }
    } catch (e) {
      console.log('[CHECK-ALL-TABLES] documents table might not exist or have different schema')
    }

    // Check customer_documents table
    let customerDocumentsData = []
    let customerDocumentsCount = 0
    try {
      const customerDocumentsCountResult = await sql`SELECT COUNT(*) as count FROM customer_documents`
      customerDocumentsCount = customerDocumentsCountResult[0]?.count || 0
      
      if (customerDocumentsCount > 0) {
        customerDocumentsData = await sql`
          SELECT id, document_number, document_type, vehicle_registration, status
          FROM customer_documents
          LIMIT 10
        `
      }
    } catch (e) {
      console.log('[CHECK-ALL-TABLES] customer_documents table might not exist or have different schema')
    }

    // Check for JS documents in both tables
    let jsInDocuments = []
    let jsInCustomerDocuments = []
    
    try {
      jsInDocuments = await sql`
        SELECT COUNT(*) as count
        FROM documents
        WHERE doc_type = 'JS' OR doc_number LIKE 'JS%'
      `
    } catch (e) {
      console.log('[CHECK-ALL-TABLES] Could not check JS in documents table')
    }

    try {
      jsInCustomerDocuments = await sql`
        SELECT COUNT(*) as count
        FROM customer_documents
        WHERE document_type = 'JS' OR document_number LIKE 'JS%'
      `
    } catch (e) {
      console.log('[CHECK-ALL-TABLES] Could not check JS in customer_documents table')
    }

    return NextResponse.json({
      success: true,
      analysis: {
        allTables,
        documentsTable: {
          count: documentsCount,
          sampleData: documentsData,
          jsCount: jsInDocuments[0]?.count || 0
        },
        customerDocumentsTable: {
          count: customerDocumentsCount,
          sampleData: customerDocumentsData,
          jsCount: jsInCustomerDocuments[0]?.count || 0
        },
        summary: {
          totalTables: allTables.length,
          documentsTableExists: documentsCount >= 0,
          customerDocumentsTableExists: customerDocumentsCount >= 0,
          documentsHasData: documentsCount > 0,
          customerDocumentsHasData: customerDocumentsCount > 0
        }
      }
    })

  } catch (error) {
    console.error('[CHECK-ALL-TABLES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to check all tables'
    }, { status: 500 })
  }
}
