import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[VEHICLE-CUSTOMER-CONNECTIONS] Checking vehicle-customer relationships...')

    // Check if vehicles table exists and has customer connection fields
    const vehiclesStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      AND column_name LIKE '%customer%'
      ORDER BY ordinal_position
    `

    // Check if customers table exists and has vehicle connection fields
    const customersStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name LIKE '%vehicle%'
      ORDER BY ordinal_position
    `

    // Check documents table for vehicle and customer connections
    const documentsStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
      AND (column_name LIKE '%customer%' OR column_name LIKE '%vehicle%')
      ORDER BY ordinal_position
    `

    // Sample some actual data to see connections
    const sampleVehicles = await sql`
      SELECT registration, customer_id, _id_customer, make, model
      FROM vehicles
      LIMIT 5
    `

    const sampleCustomers = await sql`
      SELECT id, first_name, last_name, phone, email
      FROM customers
      LIMIT 5
    `

    const sampleDocuments = await sql`
      SELECT id, doc_number, doc_type, customer_name, vehicle_registration, _id_customer
      FROM documents
      WHERE vehicle_registration IS NOT NULL
      LIMIT 5
    `

    // Check for actual connections
    const connectedVehicles = await sql`
      SELECT 
        v.registration,
        v.make,
        v.model,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM vehicles v
      LEFT JOIN customers c ON v._id_customer = c.id
      WHERE v._id_customer IS NOT NULL
      LIMIT 10
    `

    // Check documents with both customer and vehicle info
    const documentsWithConnections = await sql`
      SELECT 
        d.doc_number,
        d.doc_type,
        d.customer_name,
        d.vehicle_registration,
        c.first_name,
        c.last_name,
        c.phone
      FROM documents d
      LEFT JOIN customers c ON d._id_customer = c.id
      WHERE d.vehicle_registration IS NOT NULL
      AND d._id_customer IS NOT NULL
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      analysis: {
        vehiclesStructure,
        customersStructure,
        documentsStructure,
        sampleData: {
          vehicles: sampleVehicles,
          customers: sampleCustomers,
          documents: sampleDocuments
        },
        connections: {
          connectedVehicles,
          documentsWithConnections
        },
        summary: {
          vehiclesWithCustomerFields: vehiclesStructure.length,
          customersWithVehicleFields: customersStructure.length,
          documentsWithBothFields: documentsStructure.length,
          connectedVehiclesCount: connectedVehicles.length,
          documentsWithConnectionsCount: documentsWithConnections.length
        }
      }
    })

  } catch (error) {
    console.error('[VEHICLE-CUSTOMER-CONNECTIONS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to check vehicle-customer connections'
    }, { status: 500 })
  }
}
