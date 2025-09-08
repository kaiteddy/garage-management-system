import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const jobSheetId = resolvedParams.id

    console.log(`[JOB-SHEET-LINE-ITEMS] Fetching line items for job sheet ${jobSheetId}`)

    // Get line items for the specific job sheet from line_items table
    const lineItems = await sql`
      SELECT
        li.id,
        li.line_type as type,
        li.description,
        li.quantity as qty,
        li.unit_price as net_price,
        li.total_amount as line_total,
        li.tax_rate as vat_rate,
        li.tax_amount as vat,
        li.notes,
        -- Calculate net total (line total minus VAT)
        CASE 
          WHEN li.tax_amount > 0 THEN li.total_amount - li.tax_amount
          ELSE li.total_amount
        END as net_total
      FROM line_items li
      WHERE li.document_id = ${jobSheetId}
      ORDER BY li.id
    `

    // Also check document_line_items table as backup
    const docLineItems = await sql`
      SELECT
        dli.id,
        dli.item_type as type,
        dli.description,
        dli.quantity as qty,
        dli.unit_price as net_price,
        dli.total_price as line_total,
        dli.tax_rate as vat_rate,
        -- Calculate VAT amount
        CASE 
          WHEN dli.tax_rate > 0 THEN (dli.total_price * dli.tax_rate / 100)
          ELSE 0
        END as vat,
        -- Calculate net total
        CASE 
          WHEN dli.tax_rate > 0 THEN dli.total_price - (dli.total_price * dli.tax_rate / 100)
          ELSE dli.total_price
        END as net_total
      FROM document_line_items dli
      WHERE dli.document_id = ${jobSheetId}
      ORDER BY dli.id
    `

    // Combine results, preferring line_items table
    let allItems = []
    
    if (lineItems.length > 0) {
      allItems = lineItems.map((item, index) => ({
        id: index + 1,
        type: item.type || 'Service',
        description: item.description || 'No description',
        tasks: 1, // Default value
        estHours: 1, // Default value
        qty: parseFloat(item.qty) || 1,
        netPrice: parseFloat(item.net_price) || 0,
        netTotal: parseFloat(item.net_total) || 0,
        vatRate: `${parseFloat(item.vat_rate) || 20}%`,
        vat: parseFloat(item.vat) || 0,
        lineTotal: parseFloat(item.line_total) || 0
      }))
    } else if (docLineItems.length > 0) {
      allItems = docLineItems.map((item, index) => ({
        id: index + 1,
        type: item.type || 'Service',
        description: item.description || 'No description',
        tasks: 1, // Default value
        estHours: 1, // Default value
        qty: parseFloat(item.qty) || 1,
        netPrice: parseFloat(item.net_price) || 0,
        netTotal: parseFloat(item.net_total) || 0,
        vatRate: `${parseFloat(item.vat_rate) || 20}%`,
        vat: parseFloat(item.vat) || 0,
        lineTotal: parseFloat(item.line_total) || 0
      }))
    }

    console.log(`[JOB-SHEET-LINE-ITEMS] Found ${allItems.length} line items for job sheet ${jobSheetId}`)

    return NextResponse.json({
      success: true,
      lineItems: allItems,
      count: allItems.length,
      source: lineItems.length > 0 ? 'line_items' : (docLineItems.length > 0 ? 'document_line_items' : 'none')
    })

  } catch (error) {
    console.error("[JOB-SHEET-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch job sheet line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
