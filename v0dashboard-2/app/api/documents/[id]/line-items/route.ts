import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const documentId = resolvedParams.id

    console.log(`[DOCUMENT-LINE-ITEMS] Fetching line items for document ${documentId}`)

    // Get line items for the document
    const lineItems = await sql`
      SELECT
        id,
        item_type,
        description,
        quantity,
        unit_price,
        total_price,
        tax_rate
      FROM document_line_items
      WHERE document_id = ${documentId}
      ORDER BY total_price DESC NULLS LAST
    `

    const formattedLineItems = lineItems.map(item => ({
      id: item.id,
      type: item.item_type || 'Service',
      description: item.description || 'No description',
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unit_price) || 0,
      totalPrice: parseFloat(item.total_price) || 0,
      taxRate: parseFloat(item.tax_rate) || 0
    }))

    return NextResponse.json({
      success: true,
      lineItems: formattedLineItems,
      count: formattedLineItems.length,
      totalValue: formattedLineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    })

  } catch (error) {
    console.error("[DOCUMENT-LINE-ITEMS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch document line items",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
