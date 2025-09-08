import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get current database status
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM line_items) as line_items,
        (SELECT COUNT(*) FROM receipts) as receipts,
        (SELECT COUNT(*) FROM document_extras) as document_extras
    `
    
    const relationships = await sql`
      SELECT 
        (SELECT COUNT(*) FROM vehicles WHERE owner_id IS NOT NULL) as vehicles_with_customers,
        (SELECT COUNT(*) FROM documents WHERE _id_customer IS NOT NULL) as documents_with_customers,
        (SELECT COUNT(*) FROM documents WHERE doc_type IN ('JS', 'JOB', 'Job Sheet', 'JOBSHEET')) as job_sheets
    `
    
    const result = counts[0]
    const rel = relationships[0]
    
    // Calculate import health score
    const totalRecords = Number(result.customers) + Number(result.vehicles) + Number(result.documents)
    const hasData = totalRecords > 0
    const hasCustomers = Number(result.customers) > 100
    const hasVehicles = Number(result.vehicles) > 100
    const hasDocuments = Number(result.documents) > 100
    const hasRelationships = Number(rel.vehicles_with_customers) > 0 && Number(rel.documents_with_customers) > 0
    
    const healthScore = [hasData, hasCustomers, hasVehicles, hasDocuments, hasRelationships]
      .filter(Boolean).length * 20
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      
      counts: {
        customers: Number(result.customers),
        vehicles: Number(result.vehicles),
        documents: Number(result.documents),
        line_items: Number(result.line_items),
        receipts: Number(result.receipts),
        document_extras: Number(result.document_extras),
        total: totalRecords
      },
      
      relationships: {
        vehicles_with_customers: Number(rel.vehicles_with_customers),
        documents_with_customers: Number(rel.documents_with_customers),
        job_sheets: Number(rel.job_sheets)
      },
      
      health: {
        score: healthScore,
        status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'poor',
        checks: {
          has_data: hasData,
          has_customers: hasCustomers,
          has_vehicles: hasVehicles,
          has_documents: hasDocuments,
          has_relationships: hasRelationships
        }
      },
      
      ready_for_use: healthScore >= 80 && Number(rel.job_sheets) > 0
    })
    
  } catch (error) {
    console.error("[TURBO-IMPORT-STATUS] Error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to get import status",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
