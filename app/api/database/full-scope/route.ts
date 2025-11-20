import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[FULL-SCOPE] Getting complete database scope...")

    // Get total counts
    const totalCustomers = await sql`SELECT COUNT(*) as count FROM customers`
    const totalVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`
    const totalDocuments = await sql`SELECT COUNT(*) as count FROM documents`
    const totalLineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const totalMotHistory = await sql`SELECT COUNT(*) as count FROM mot_history`

    // Get vehicles missing DVLA data
    const vehiclesMissingData = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
    `

    // Get customers with no documents
    const customersNoDocuments = await sql`
      SELECT COUNT(DISTINCT c.id) as count 
      FROM customers c
      LEFT JOIN documents d ON c.id = d._id_customer
      WHERE d.id IS NULL
    `

    // Get vehicles with no MOT history
    const vehiclesNoMotHistory = await sql`
      SELECT COUNT(DISTINCT v.registration) as count 
      FROM vehicles v
      LEFT JOIN mot_history mh ON v.registration = mh.vehicle_registration
      WHERE mh.id IS NULL
    `

    // Sample some registrations for testing
    const sampleVehicles = await sql`
      SELECT registration, make, model, year, color, fuel_type, engine_size, mot_status
      FROM vehicles 
      ORDER BY RANDOM()
      LIMIT 10
    `

    // Check document distribution
    const documentsByCustomer = await sql`
      SELECT 
        COUNT(DISTINCT _id_customer) as customers_with_docs,
        COUNT(*) as total_docs,
        AVG(total_gross) as avg_invoice_value
      FROM documents
    `

    return NextResponse.json({
      success: true,
      full_database_scope: {
        total_customers: parseInt(totalCustomers[0].count),
        total_vehicles: parseInt(totalVehicles[0].count),
        total_documents: parseInt(totalDocuments[0].count),
        total_line_items: parseInt(totalLineItems[0].count),
        total_mot_history: parseInt(totalMotHistory[0].count)
      },
      data_integrity_issues: {
        vehicles_missing_dvla_data: parseInt(vehiclesMissingData[0].count),
        customers_with_no_documents: parseInt(customersNoDocuments[0].count),
        vehicles_with_no_mot_history: parseInt(vehiclesNoMotHistory[0].count)
      },
      document_analysis: {
        customers_with_documents: parseInt(documentsByCustomer[0]?.customers_with_docs || 0),
        total_service_documents: parseInt(documentsByCustomer[0]?.total_docs || 0),
        average_invoice_value: parseFloat(documentsByCustomer[0]?.avg_invoice_value || 0)
      },
      sample_vehicles: sampleVehicles,
      scale_assessment: {
        is_large_database: parseInt(totalCustomers[0].count) > 1000,
        requires_batch_processing: parseInt(totalVehicles[0].count) > 100,
        estimated_dvla_api_calls: parseInt(vehiclesMissingData[0].count),
        estimated_processing_time_minutes: Math.ceil(parseInt(vehiclesMissingData[0].count) * 2 / 60) // 2 seconds per DVLA call
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[FULL-SCOPE] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get full database scope",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
