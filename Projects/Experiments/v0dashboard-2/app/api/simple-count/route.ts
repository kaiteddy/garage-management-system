import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[SIMPLE-COUNT] Getting simple counts...')

    const customerCount = await sql`SELECT COUNT(*) FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) FROM vehicles`
    const documentCount = await sql`SELECT COUNT(*) FROM customer_documents`
    const lineItemCount = await sql`SELECT COUNT(*) FROM document_line_items`

    console.log('[SIMPLE-COUNT] Raw results:', {
      customers: customerCount,
      vehicles: vehicleCount,
      documents: documentCount,
      lineItems: lineItemCount
    })
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      raw_results: {
        customers: customerCount,
        vehicles: vehicleCount,
        documents: documentCount,
        line_items: lineItemCount
      },
      parsed_counts: {
        customers: customerCount[0]?.count || customerCount[0]?.COUNT || 0,
        vehicles: vehicleCount[0]?.count || vehicleCount[0]?.COUNT || 0,
        documents: documentCount[0]?.count || documentCount[0]?.COUNT || 0,
        line_items: lineItemCount[0]?.count || lineItemCount[0]?.COUNT || 0
      }
    })

  } catch (error) {
    console.error('[SIMPLE-COUNT] Error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to get counts',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
