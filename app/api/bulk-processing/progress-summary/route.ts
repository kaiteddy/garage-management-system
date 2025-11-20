import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[PROGRESS-SUMMARY] Generating comprehensive progress report...")

    // Get current database state
    const totalCustomers = await sql`SELECT COUNT(*) as count FROM customers`
    const totalVehicles = await sql`SELECT COUNT(*) as count FROM vehicles`
    const totalDocuments = await sql`SELECT COUNT(*) as count FROM documents`
    const totalLineItems = await sql`SELECT COUNT(*) as count FROM document_line_items`
    const totalMotHistory = await sql`SELECT COUNT(*) as count FROM mot_history`
    
    // Get data completeness metrics
    const vehiclesMissingData = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL
    `
    
    const customersWithDocuments = await sql`
      SELECT COUNT(DISTINCT _id_customer) as count FROM documents
    `
    
    const vehiclesWithMotHistory = await sql`
      SELECT COUNT(DISTINCT vehicle_registration) as count FROM mot_history
    `

    // Get top customers by service history
    const topCustomersByDocs = await sql`
      SELECT 
        d._id_customer,
        d.customer_name,
        COUNT(*) as document_count,
        SUM(d.total_gross) as total_spent,
        MIN(d.doc_date_issued) as first_service,
        MAX(d.doc_date_issued) as last_service
      FROM documents d
      WHERE d.customer_name IS NOT NULL AND d.customer_name != ''
      GROUP BY d._id_customer, d.customer_name
      ORDER BY document_count DESC
      LIMIT 10
    `

    // Get vehicles with most complete data
    const completeVehicles = await sql`
      SELECT 
        registration, make, model, year, color, fuel_type, engine_size,
        mot_status, mot_expiry_date, tax_status
      FROM vehicles 
      WHERE year IS NOT NULL AND color IS NOT NULL AND fuel_type IS NOT NULL 
        AND engine_size IS NOT NULL
      ORDER BY registration
      LIMIT 10
    `

    // Calculate progress percentages
    const progressMetrics = {
      customers_with_documents: Math.round((parseInt(customersWithDocuments[0].count) / parseInt(totalCustomers[0].count)) * 100),
      vehicles_with_complete_data: Math.round((1 - parseInt(vehiclesMissingData[0].count) / parseInt(totalVehicles[0].count)) * 100),
      vehicles_with_mot_history: Math.round((parseInt(vehiclesWithMotHistory[0].count) / parseInt(totalVehicles[0].count)) * 100)
    }

    // Estimate remaining work
    const remainingWork = {
      documents_to_import: Math.max(0, 32890 - parseInt(totalDocuments[0].count)),
      vehicles_needing_dvla_updates: parseInt(vehiclesMissingData[0].count),
      customers_without_documents: parseInt(totalCustomers[0].count) - parseInt(customersWithDocuments[0].count)
    }

    // Calculate processing rates (based on recent performance)
    const processingRates = {
      documents_per_minute: 446, // From previous batch results
      vehicles_per_minute: 12,   // Estimated based on DVLA rate limits
      estimated_completion_time: {
        documents: Math.ceil(remainingWork.documents_to_import / 446),
        dvla_updates: Math.ceil(remainingWork.vehicles_needing_dvla_updates / 12)
      }
    }

    // Overall status assessment
    let overallStatus = 'NEEDS_IMPROVEMENT'
    if (progressMetrics.customers_with_documents > 80 && progressMetrics.vehicles_with_complete_data > 80) {
      overallStatus = 'EXCELLENT'
    } else if (progressMetrics.customers_with_documents > 50 && progressMetrics.vehicles_with_complete_data > 50) {
      overallStatus = 'GOOD'
    } else if (progressMetrics.customers_with_documents > 20 || progressMetrics.vehicles_with_complete_data > 20) {
      overallStatus = 'IMPROVING'
    }

    return NextResponse.json({
      success: true,
      bulk_processing_progress: {
        current_database_state: {
          total_customers: parseInt(totalCustomers[0].count),
          total_vehicles: parseInt(totalVehicles[0].count),
          total_documents: parseInt(totalDocuments[0].count),
          total_line_items: parseInt(totalLineItems[0].count),
          total_mot_history: parseInt(totalMotHistory[0].count)
        },
        data_completeness_percentages: progressMetrics,
        remaining_work: remainingWork,
        processing_performance: {
          rates: processingRates,
          estimated_time_to_completion: {
            documents: `${processingRates.estimated_completion_time.documents} minutes`,
            dvla_updates: `${processingRates.estimated_completion_time.dvla_updates} minutes`,
            total_estimated: `${Math.max(processingRates.estimated_completion_time.documents, processingRates.estimated_completion_time.dvla_updates)} minutes`
          }
        },
        data_quality_samples: {
          top_customers_by_service_history: topCustomersByDocs,
          vehicles_with_complete_data: completeVehicles
        },
        overall_assessment: {
          status: overallStatus,
          key_achievements: [
            `${parseInt(totalDocuments[0].count)} service documents imported`,
            `${progressMetrics.customers_with_documents}% of customers now have service history`,
            `${progressMetrics.vehicles_with_complete_data}% of vehicles have complete DVLA data`,
            `${parseInt(totalMotHistory[0].count)} MOT history records created`
          ],
          next_priorities: [
            remainingWork.documents_to_import > 10000 ? 'Continue document import (high priority)' : null,
            remainingWork.vehicles_needing_dvla_updates > 5000 ? 'Continue DVLA updates (high priority)' : null,
            progressMetrics.customers_with_documents < 50 ? 'Focus on document import completion' : null,
            progressMetrics.vehicles_with_complete_data < 50 ? 'Focus on DVLA data completion' : null
          ].filter(Boolean)
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[PROGRESS-SUMMARY] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to generate progress summary",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
