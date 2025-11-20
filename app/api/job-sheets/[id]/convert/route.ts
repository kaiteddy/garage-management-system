import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobSheetId = params.id
    const body = await request.json()
    const { convertTo, notes } = body // convertTo: 'estimate' | 'invoice'

    console.log(`[JOB-SHEET-CONVERT] Converting job sheet ${jobSheetId} to ${convertTo}`)

    // Get the original job sheet
    const jobSheetResult = await sql`
      SELECT * FROM documents 
      WHERE doc_number = ${jobSheetId} AND doc_type = 'JS'
      LIMIT 1
    `

    if (jobSheetResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Job sheet not found'
      }, { status: 404 })
    }

    const jobSheet = jobSheetResult[0]

    // Generate new document number
    const docType = convertTo === 'estimate' ? 'ES' : 'SI'
    const prefix = convertTo === 'estimate' ? 'ES' : 'SI'
    
    // Get next document number for the type
    const lastDocResult = await sql`
      SELECT doc_number FROM documents 
      WHERE doc_type = ${docType}
      ORDER BY CAST(REGEXP_REPLACE(doc_number, '[^0-9]', '', 'g') AS INTEGER) DESC
      LIMIT 1
    `

    let nextNumber = 1
    if (lastDocResult.length > 0) {
      const lastNumber = parseInt(lastDocResult[0].doc_number.replace(/[^0-9]/g, ''))
      nextNumber = lastNumber + 1
    }

    const newDocNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`

    // Create the new document
    const newDocument = await sql`
      INSERT INTO documents (
        doc_number,
        doc_type,
        doc_date,
        customer_name,
        customer_id,
        vehicle_reg,
        vehicle_make,
        vehicle_model,
        description,
        total_amount,
        vat_amount,
        net_amount,
        mileage,
        status,
        created_at,
        updated_at,
        -- Reference to original job sheet
        original_job_sheet,
        conversion_notes
      ) VALUES (
        ${newDocNumber},
        ${docType},
        CURRENT_DATE,
        ${jobSheet.customer_name},
        ${jobSheet.customer_id},
        ${jobSheet.vehicle_reg},
        ${jobSheet.vehicle_make},
        ${jobSheet.vehicle_model},
        ${jobSheet.description},
        ${jobSheet.total_amount},
        ${jobSheet.vat_amount},
        ${jobSheet.net_amount},
        ${jobSheet.mileage},
        ${convertTo === 'estimate' ? 'draft' : 'pending'},
        NOW(),
        NOW(),
        ${jobSheetId},
        ${notes || ''}
      )
      RETURNING *
    `

    // Copy line items if they exist
    const lineItemsResult = await sql`
      SELECT * FROM job_sheet_line_items 
      WHERE job_sheet_id = ${jobSheetId}
    `

    if (lineItemsResult.length > 0) {
      for (const item of lineItemsResult) {
        await sql`
          INSERT INTO document_line_items (
            document_id,
            doc_number,
            description,
            quantity,
            unit_price,
            total_price,
            item_type,
            part_number,
            created_at
          ) VALUES (
            ${newDocument[0].id},
            ${newDocNumber},
            ${item.description},
            ${item.quantity},
            ${item.unit_price},
            ${item.total_price},
            ${item.item_type},
            ${item.part_number},
            NOW()
          )
        `
      }
    }

    // Update the original job sheet status
    await sql`
      UPDATE documents 
      SET 
        status = ${convertTo === 'estimate' ? 'estimated' : 'invoiced'},
        converted_to = ${newDocNumber},
        updated_at = NOW()
      WHERE doc_number = ${jobSheetId} AND doc_type = 'JS'
    `

    // Log the conversion
    await sql`
      INSERT INTO document_conversions (
        original_doc_number,
        original_doc_type,
        new_doc_number,
        new_doc_type,
        conversion_date,
        converted_by,
        notes
      ) VALUES (
        ${jobSheetId},
        'JS',
        ${newDocNumber},
        ${docType},
        NOW(),
        'system',
        ${notes || `Converted from job sheet ${jobSheetId}`}
      )
    `

    return NextResponse.json({
      success: true,
      message: `Job sheet successfully converted to ${convertTo}`,
      originalJobSheet: jobSheetId,
      newDocument: {
        docNumber: newDocNumber,
        docType: docType,
        type: convertTo,
        id: newDocument[0].id
      },
      redirectUrl: convertTo === 'estimate' 
        ? `/estimates/${newDocNumber}` 
        : `/invoices/${newDocNumber}`
    })

  } catch (error) {
    console.error('[JOB-SHEET-CONVERT] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Create the necessary tables if they don't exist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create document_line_items table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS document_line_items (
        id SERIAL PRIMARY KEY,
        document_id INTEGER,
        doc_number TEXT,
        description TEXT,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price DECIMAL(10,2) DEFAULT 0,
        total_price DECIMAL(10,2) DEFAULT 0,
        item_type TEXT DEFAULT 'service', -- 'service', 'part', 'labour'
        part_number TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create document_conversions table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS document_conversions (
        id SERIAL PRIMARY KEY,
        original_doc_number TEXT,
        original_doc_type TEXT,
        new_doc_number TEXT,
        new_doc_type TEXT,
        conversion_date TIMESTAMP DEFAULT NOW(),
        converted_by TEXT,
        notes TEXT
      )
    `

    // Add conversion tracking columns to documents table if they don't exist
    await sql`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS original_job_sheet TEXT,
      ADD COLUMN IF NOT EXISTS converted_to TEXT,
      ADD COLUMN IF NOT EXISTS conversion_notes TEXT
    `

    return NextResponse.json({
      success: true,
      message: 'Conversion tables initialized',
      jobSheetId: params.id
    })

  } catch (error) {
    console.error('[JOB-SHEET-CONVERT] Setup error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup error'
    }, { status: 500 })
  }
}
