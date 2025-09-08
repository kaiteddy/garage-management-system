import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[CHECK-DOCUMENT-TYPES] Checking all document types in database...')

    // Check all document types that exist
    const allDocTypes = await sql`
      SELECT 
        doc_type,
        COUNT(*) as count,
        MIN(doc_number) as min_doc_number,
        MAX(doc_number) as max_doc_number
      FROM documents
      WHERE doc_type IS NOT NULL
      GROUP BY doc_type
      ORDER BY count DESC
    `

    // Check specifically for JS documents
    const jsDocuments = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        customer_name,
        vehicle_registration,
        date,
        total_amount,
        doc_status
      FROM documents
      WHERE doc_type = 'JS'
      ORDER BY doc_number DESC
      LIMIT 10
    `

    // Check for documents that start with JS
    const jsStartDocuments = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        customer_name,
        vehicle_registration,
        date,
        total_amount,
        doc_status
      FROM documents
      WHERE doc_number LIKE 'JS%'
      ORDER BY doc_number DESC
      LIMIT 10
    `

    // Check all documents with any content
    const allDocuments = await sql`
      SELECT 
        id,
        doc_number,
        doc_type,
        customer_name,
        vehicle_registration,
        date,
        total_amount,
        doc_status
      FROM documents
      ORDER BY id DESC
      LIMIT 20
    `

    // Check total document count
    const totalCount = await sql`
      SELECT COUNT(*) as total_documents
      FROM documents
    `

    return NextResponse.json({
      success: true,
      analysis: {
        allDocTypes,
        jsDocuments,
        jsStartDocuments,
        allDocuments,
        totalCount: totalCount[0]?.total_documents || 0,
        summary: {
          totalDocumentTypes: allDocTypes.length,
          jsDocumentsCount: jsDocuments.length,
          jsStartDocumentsCount: jsStartDocuments.length,
          hasDocuments: allDocuments.length > 0
        }
      }
    })

  } catch (error) {
    console.error('[CHECK-DOCUMENT-TYPES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to check document types'
    }, { status: 500 })
  }
}
