import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('[DATA-STRUCTURE] Checking database structure and relationships...')

    // First, check what tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Check columns for each main table
    const customerColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customers'
      ORDER BY ordinal_position
    `

    const vehicleColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'vehicles'
      ORDER BY ordinal_position
    `

    const documentColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'documents'
      ORDER BY ordinal_position
    `

    // Get sample data to understand relationships
    const sampleCustomers = await sql`
      SELECT * FROM customers LIMIT 5
    `

    const sampleVehicles = await sql`
      SELECT * FROM vehicles LIMIT 5
    `

    const sampleDocuments = await sql`
      SELECT * FROM documents LIMIT 5
    `

    // Check for foreign key relationships
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
      AND tc.table_schema = 'public'
    `

    // Get counts
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM document_line_items) as line_items,
        (SELECT COUNT(*) FROM document_extras) as document_extras
    `

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database_structure: {
        all_tables: tables.map(t => t.table_name),
        table_counts: counts[0]
      },
      table_schemas: {
        customers: customerColumns,
        vehicles: vehicleColumns,
        documents: documentColumns
      },
      sample_data: {
        customers: sampleCustomers,
        vehicles: sampleVehicles,
        documents: sampleDocuments
      },
      foreign_key_relationships: foreignKeys,
      analysis: {
        tables_exist: {
          customers: customerColumns.length > 0,
          vehicles: vehicleColumns.length > 0,
          documents: documentColumns.length > 0
        },
        relationship_fields: {
          vehicles_customer_link: vehicleColumns.some(col => col.column_name.includes('customer')),
          documents_customer_link: documentColumns.some(col => col.column_name.includes('customer')),
          documents_vehicle_link: documentColumns.some(col => col.column_name.includes('vehicle'))
        }
      }
    })

  } catch (error) {
    console.error('[DATA-STRUCTURE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to check database structure"
      },
      { status: 500 }
    )
  }
}
