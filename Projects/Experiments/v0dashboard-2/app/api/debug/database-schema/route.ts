import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration') || 'LN64XFG'

    console.log(`[DEBUG-SCHEMA] Analyzing database schema for registration: ${registration}`)

    // Get table schemas
    const vehiclesSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    const customersSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `

    const documentsSchema = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `

    // Get vehicle information
    const vehicle = await sql`
      SELECT *
      FROM vehicles
      WHERE UPPER(REPLACE(registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      LIMIT 1
    `

    // Get sample customers to understand the data structure
    const sampleCustomers = await sql`
      SELECT *
      FROM customers
      WHERE id LIKE 'OOTOSBT1O%'
      LIMIT 3
    `

    // Check if there are any foreign key constraints
    const foreignKeys = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'vehicles' OR tc.table_name = 'customers')
    `

    // Look for documents related to this vehicle
    const documents = await sql`
      SELECT *
      FROM documents
      WHERE UPPER(REPLACE(vehicle_registration, ' ', '')) = UPPER(REPLACE(${registration}, ' ', ''))
      LIMIT 3
    `

    // Check for customer_documents table
    let customerDocumentsSchema = []
    let customerDocuments = []
    try {
      customerDocumentsSchema = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'customer_documents'
        ORDER BY ordinal_position
      `
      
      customerDocuments = await sql`
        SELECT *
        FROM customer_documents
        WHERE vehicle_registration = ${registration}
        LIMIT 3
      `
    } catch (e) {
      console.log('[DEBUG-SCHEMA] customer_documents table may not exist')
    }

    // Check what tables exist
    const allTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    return NextResponse.json({
      success: true,
      registration: registration,
      schemas: {
        vehicles: vehiclesSchema,
        customers: customersSchema,
        documents: documentsSchema,
        customer_documents: customerDocumentsSchema
      },
      data: {
        vehicle: vehicle[0] || null,
        sampleCustomers: sampleCustomers,
        documents: documents,
        customerDocuments: customerDocuments
      },
      relationships: {
        foreignKeys: foreignKeys
      },
      allTables: allTables,
      analysis: {
        vehicleExists: vehicle.length > 0,
        vehicleHasCustomerId: vehicle.length > 0 && !!vehicle[0].customer_id,
        vehicleHasOwnerId: vehicle.length > 0 && !!vehicle[0].owner_id,
        documentCount: documents.length,
        customerDocumentCount: customerDocuments.length
      }
    })

  } catch (error) {
    console.error('[DEBUG-SCHEMA] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error.message
    }, { status: 500 })
  }
}
