import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[CHECK-STRUCTURE] Checking table structures...')

    // Check vehicles table structure
    const vehiclesColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    // Check customers table structure
    const customersColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    // Check customer_documents table structure
    const documentsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customer_documents'
      ORDER BY ordinal_position
    `

    // Check document_line_items table structure
    const lineItemsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'document_line_items'
      ORDER BY ordinal_position
    `

    // Check document_receipts table structure
    const receiptsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'document_receipts'
      ORDER BY ordinal_position
    `

    // Check document_extras table structure
    const extrasColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'document_extras'
      ORDER BY ordinal_position
    `

    // Check mot_history table structure
    const motHistoryColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'mot_history'
      ORDER BY ordinal_position
    `

    // Sample data from each table
    const sampleVehicles = await sql`SELECT * FROM vehicles LIMIT 3`
    const sampleCustomers = await sql`SELECT * FROM customers LIMIT 3`
    const sampleDocuments = await sql`SELECT * FROM customer_documents LIMIT 3`

    console.log('[CHECK-STRUCTURE] ✅ Table structure check complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      table_structures: {
        vehicles: {
          columns: vehiclesColumns,
          sample_data: sampleVehicles
        },
        customers: {
          columns: customersColumns,
          sample_data: sampleCustomers
        },
        customer_documents: {
          columns: documentsColumns,
          sample_data: sampleDocuments
        },
        document_line_items: {
          columns: lineItemsColumns
        },
        document_receipts: {
          columns: receiptsColumns
        },
        document_extras: {
          columns: extrasColumns
        },
        mot_history: {
          columns: motHistoryColumns
        }
      }
    })

  } catch (error) {
    console.error('[CHECK-STRUCTURE] Error during structure check:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to check table structures',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
