import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, technician } = body

    console.log(`[JOB-SHEET-TECHNICIAN] Updating technician for job sheet ${id} to: ${technician}`)

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet ID is required'
      }, { status: 400 })
    }

    // First, check if technician column exists in customer_documents table
    try {
      await sql`ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS technician TEXT`
    } catch (error) {
      console.log('[JOB-SHEET-TECHNICIAN] Technician column already exists or error adding:', error.message)
    }

    // Update the technician in the customer_documents table (where job sheets are stored)
    const updateResult = await sql`
      UPDATE customer_documents
      SET
        technician = ${technician || ''},
        updated_at = NOW()
      WHERE id = ${id} OR document_number = ${id}
      RETURNING id, document_number, technician
    `

    if (updateResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet not found'
      }, { status: 404 })
    }

    const updatedJobSheet = updateResult[0]

    console.log(`[JOB-SHEET-TECHNICIAN] Successfully updated technician:`, updatedJobSheet)

    return NextResponse.json({
      success: true,
      message: 'Technician updated successfully',
      jobSheet: {
        id: updatedJobSheet.id,
        jobNumber: updatedJobSheet.doc_number,
        technician: updatedJobSheet.technician
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[JOB-SHEET-TECHNICIAN] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
