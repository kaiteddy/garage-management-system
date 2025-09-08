import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fixLN64XFG = searchParams.get('fix-ln64xfg')

    console.log('[SIMPLE-CHECK] Starting simple data check...')

    // Fix LN64XFG connection if requested
    let fixResult = null
    if (fixLN64XFG === 'true') {
      console.log('[SIMPLE-CHECK] Fixing LN64XFG connection...')
      try {
        const updateResult = await sql`
          UPDATE vehicles
          SET
            customer_id = 'OOTOSBT1OWYUHR1B81UY',
            owner_id = 'OOTOSBT1OWYUHR1B81UY',
            updated_at = NOW()
          WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
        `

        // Verify the fix
        const verifyResult = await sql`
          SELECT registration, customer_id, owner_id
          FROM vehicles
          WHERE UPPER(REPLACE(registration, ' ', '')) = 'LN64XFG'
          LIMIT 1
        `

        fixResult = {
          success: true,
          updateResult: updateResult,
          verification: verifyResult[0] || null
        }
        console.log('[SIMPLE-CHECK] LN64XFG fix completed:', fixResult)
      } catch (fixError) {
        fixResult = {
          success: false,
          error: fixError.message
        }
        console.log('[SIMPLE-CHECK] LN64XFG fix failed:', fixError)
      }
    }

    // Basic counts
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`
    const documentsCount = await sql`SELECT COUNT(*) as count FROM customer_documents`
    const lineItemsCount = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const receiptsCount = await sql`SELECT COUNT(*) as count FROM document_receipts`
    const extrasCount = await sql`SELECT COUNT(*) as count FROM document_extras`

    // Sample data
    const sampleCustomer = await sql`SELECT * FROM customers LIMIT 1`
    const sampleVehicle = await sql`SELECT * FROM vehicles LIMIT 1`
    const sampleDocument = await sql`SELECT * FROM customer_documents LIMIT 1`

    console.log('[SIMPLE-CHECK] ✅ Simple check complete')

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      fixResult: fixResult,
      counts: {
        customers: parseInt(customerCount[0].count),
        vehicles: parseInt(vehicleCount[0].count),
        documents: parseInt(documentsCount[0].count),
        line_items: parseInt(lineItemsCount[0].count),
        receipts: parseInt(receiptsCount[0].count),
        extras: parseInt(extrasCount[0].count)
      },
      sample_data: {
        customer: sampleCustomer[0] || null,
        vehicle: sampleVehicle[0] || null,
        document: sampleDocument[0] || null
      }
    })

  } catch (error) {
    console.error('[SIMPLE-CHECK] Error during check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to perform simple check',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
