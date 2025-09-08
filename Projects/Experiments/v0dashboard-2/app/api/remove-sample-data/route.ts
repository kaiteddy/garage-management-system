import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[REMOVE-SAMPLE-DATA] Starting sample data removal...")
    
    let totalRemoved = 0
    
    // Remove sample customers
    const sampleCustomers = await sql`
      DELETE FROM customers 
      WHERE 
        LOWER(first_name || ' ' || COALESCE(last_name, '')) IN ('john doe', 'jane doe', 'jane smith', 'john smith')
        OR LOWER(COALESCE(company_name, '')) IN ('test company', 'sample company', 'demo company', 'acme corp')
        OR first_name ILIKE '%test%'
        OR first_name ILIKE '%sample%'
        OR first_name ILIKE '%demo%'
        OR last_name ILIKE '%test%'
        OR last_name ILIKE '%sample%'
        OR last_name ILIKE '%demo%'
        OR email ILIKE '%test%'
        OR email ILIKE '%sample%'
        OR email ILIKE '%demo%'
        OR email IN ('test@test.com', 'sample@sample.com', 'demo@demo.com')
        OR id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
        OR id ILIKE 'test%'
        OR id ILIKE 'sample%'
        OR id ILIKE 'demo%'
    `
    totalRemoved += sampleCustomers.count
    
    // Remove sample vehicles
    const sampleVehicles = await sql`
      DELETE FROM vehicles 
      WHERE 
        registration ILIKE '%TEST%'
        OR registration ILIKE '%SAMPLE%'
        OR registration ILIKE '%DEMO%'
        OR registration IN ('TEST123', 'SAMPLE456', 'DEMO789', 'ABC123', 'XYZ789')
        OR make ILIKE '%test%'
        OR make ILIKE '%sample%'
        OR make ILIKE '%demo%'
        OR model ILIKE '%test%'
        OR model ILIKE '%sample%'
        OR model ILIKE '%demo%'
    `
    totalRemoved += sampleVehicles.count
    
    // Remove sample documents
    const sampleDocuments = await sql`
      DELETE FROM documents 
      WHERE 
        doc_number ILIKE '%TEST%'
        OR doc_number ILIKE '%SAMPLE%'
        OR doc_number ILIKE '%DEMO%'
        OR customer_name ILIKE '%test%'
        OR customer_name ILIKE '%sample%'
        OR customer_name ILIKE '%demo%'
        OR customer_name IN ('John Doe', 'Jane Doe', 'Jane Smith', 'John Smith')
        OR vehicle_registration ILIKE '%TEST%'
        OR vehicle_registration ILIKE '%SAMPLE%'
        OR vehicle_registration ILIKE '%DEMO%'
        OR _id ILIKE 'test%'
        OR _id ILIKE 'sample%'
        OR _id ILIKE 'demo%'
        OR _id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    totalRemoved += sampleDocuments.count
    
    // Remove sample line items
    const sampleLineItems = await sql`
      DELETE FROM line_items 
      WHERE 
        description ILIKE '%test%'
        OR description ILIKE '%sample%'
        OR description ILIKE '%demo%'
        OR description IN ('Test Item', 'Sample Part', 'Demo Service')
        OR part_number ILIKE '%TEST%'
        OR part_number ILIKE '%SAMPLE%'
        OR part_number ILIKE '%DEMO%'
        OR id ILIKE 'test%'
        OR id ILIKE 'sample%'
        OR id ILIKE 'demo%'
        OR id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
    `
    totalRemoved += sampleLineItems.count
    
    // Remove orphaned records
    const orphanedVehicles = await sql`
      DELETE FROM vehicles 
      WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT id FROM customers)
    `
    totalRemoved += orphanedVehicles.count
    
    const orphanedDocuments = await sql`
      DELETE FROM documents 
      WHERE _id_customer IS NOT NULL 
      AND _id_customer NOT IN (SELECT id FROM customers)
    `
    totalRemoved += orphanedDocuments.count
    
    const orphanedLineItems = await sql`
      DELETE FROM line_items 
      WHERE document_id IS NOT NULL 
      AND document_id NOT IN (SELECT _id FROM documents)
    `
    totalRemoved += orphanedLineItems.count
    
    // Get final counts
    const finalCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items
    `
    
    const result = finalCounts[0]
    
    return NextResponse.json({
      success: true,
      message: "Sample data removed successfully!",
      removed: {
        customers: sampleCustomers.count,
        vehicles: sampleVehicles.count,
        documents: sampleDocuments.count,
        line_items: sampleLineItems.count,
        orphaned_vehicles: orphanedVehicles.count,
        orphaned_documents: orphanedDocuments.count,
        orphaned_line_items: orphanedLineItems.count,
        total: totalRemoved
      },
      remaining: {
        customers: Number(result.customers),
        vehicles: Number(result.vehicles),
        documents: Number(result.documents),
        line_items: Number(result.line_items)
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[REMOVE-SAMPLE-DATA] Failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Sample data removal failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check for sample data without removing
    const sampleCheck = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE 
          first_name ILIKE '%test%' OR first_name ILIKE '%sample%' OR 
          last_name ILIKE '%test%' OR last_name ILIKE '%sample%' OR
          email ILIKE '%test%' OR email ILIKE '%sample%'
        ) as sample_customers,
        
        (SELECT COUNT(*) FROM vehicles WHERE 
          registration ILIKE '%TEST%' OR registration ILIKE '%SAMPLE%'
        ) as sample_vehicles,
        
        (SELECT COUNT(*) FROM documents WHERE 
          customer_name ILIKE '%test%' OR customer_name ILIKE '%sample%' OR
          doc_number ILIKE '%TEST%' OR doc_number ILIKE '%SAMPLE%'
        ) as sample_documents,
        
        (SELECT COUNT(*) FROM line_items WHERE 
          description ILIKE '%test%' OR description ILIKE '%sample%'
        ) as sample_line_items
    `
    
    const result = sampleCheck[0]
    const totalSample = Number(result.sample_customers) + Number(result.sample_vehicles) + 
                       Number(result.sample_documents) + Number(result.sample_line_items)
    
    return NextResponse.json({
      success: true,
      sample_data_found: {
        customers: Number(result.sample_customers),
        vehicles: Number(result.sample_vehicles),
        documents: Number(result.sample_documents),
        line_items: Number(result.sample_line_items),
        total: totalSample
      },
      needs_cleanup: totalSample > 0,
      message: totalSample > 0 
        ? `Found ${totalSample} sample records that can be removed`
        : "No sample data detected",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("[REMOVE-SAMPLE-DATA] Check failed:", error)
    
    return NextResponse.json({
      success: false,
      error: "Sample data check failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
