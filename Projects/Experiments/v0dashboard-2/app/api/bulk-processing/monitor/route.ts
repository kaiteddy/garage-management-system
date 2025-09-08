import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[MONITOR] Getting real-time bulk processing status...")

    // Get current counts
    const currentCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM mot_history`,
      sql`SELECT COUNT(*) as count FROM document_line_items`
    ])

    // Get progress metrics
    const progressMetrics = await Promise.all([
      sql`SELECT COUNT(*) as count FROM vehicles WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL`,
      sql`SELECT COUNT(DISTINCT _id_customer) as count FROM documents`,
      sql`SELECT COUNT(DISTINCT vehicle_registration) as count FROM mot_history`
    ])

    // Get recent activity (last 10 minutes)
    const recentActivity = await sql`
      SELECT 
        'document' as type,
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM documents 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
      UNION ALL
      SELECT 
        'mot_history' as type,
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM mot_history 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `

    // Calculate processing rates (documents added in last 10 minutes)
    const recentDocuments = await sql`
      SELECT COUNT(*) as count FROM documents 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
    `

    const recentVehicleUpdates = await sql`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE updated_at > NOW() - INTERVAL '10 minutes'
    `

    // Get top performing customers (most documents)
    const topCustomers = await sql`
      SELECT 
        customer_name,
        COUNT(*) as document_count,
        SUM(total_gross) as total_spent,
        MAX(doc_date_issued) as last_service
      FROM documents 
      WHERE customer_name IS NOT NULL AND customer_name != ''
      GROUP BY customer_name
      ORDER BY document_count DESC
      LIMIT 5
    `

    // Calculate completion percentages
    const totalCustomers = parseInt(currentCounts[0][0].count)
    const totalVehicles = parseInt(currentCounts[1][0].count)
    const totalDocuments = parseInt(currentCounts[2][0].count)
    const totalMotHistory = parseInt(currentCounts[3][0].count)
    
    const vehiclesMissingData = parseInt(progressMetrics[0][0].count)
    const customersWithDocs = parseInt(progressMetrics[1][0].count)
    const vehiclesWithMot = parseInt(progressMetrics[2][0].count)

    const completionPercentages = {
      customers_with_documents: Math.round((customersWithDocs / totalCustomers) * 100),
      vehicles_with_complete_data: Math.round(((totalVehicles - vehiclesMissingData) / totalVehicles) * 100),
      vehicles_with_mot_history: Math.round((vehiclesWithMot / totalVehicles) * 100)
    }

    // Estimate remaining time
    const recentDocsCount = parseInt(recentDocuments[0].count)
    const recentVehicleCount = parseInt(recentVehicleUpdates[0].count)
    
    const docsPerMinute = recentDocsCount / 10 // 10 minute window
    const vehiclesPerMinute = recentVehicleCount / 10

    const remainingDocs = Math.max(0, 32890 - totalDocuments)
    const remainingVehicles = vehiclesMissingData

    const estimatedTimeToComplete = {
      documents: docsPerMinute > 0 ? Math.ceil(remainingDocs / docsPerMinute) : 'Unknown',
      vehicles: vehiclesPerMinute > 0 ? Math.ceil(remainingVehicles / vehiclesPerMinute) : 'Unknown'
    }

    // Overall status assessment
    let overallStatus = 'PROCESSING'
    if (completionPercentages.customers_with_documents > 90 && completionPercentages.vehicles_with_complete_data > 90) {
      overallStatus = 'NEARLY_COMPLETE'
    } else if (completionPercentages.customers_with_documents > 70 && completionPercentages.vehicles_with_complete_data > 70) {
      overallStatus = 'EXCELLENT_PROGRESS'
    } else if (completionPercentages.customers_with_documents > 50 || completionPercentages.vehicles_with_complete_data > 50) {
      overallStatus = 'GOOD_PROGRESS'
    }

    return NextResponse.json({
      success: true,
      real_time_status: {
        current_totals: {
          customers: totalCustomers,
          vehicles: totalVehicles,
          documents: totalDocuments,
          mot_history: totalMotHistory,
          line_items: parseInt(currentCounts[4][0].count)
        },
        completion_percentages: completionPercentages,
        remaining_work: {
          documents_to_import: remainingDocs,
          vehicles_needing_updates: remainingVehicles,
          customers_without_documents: totalCustomers - customersWithDocs
        },
        processing_performance: {
          recent_activity: {
            documents_added_last_10min: recentDocsCount,
            vehicles_updated_last_10min: recentVehicleCount,
            current_rate: {
              documents_per_minute: Math.round(docsPerMinute),
              vehicles_per_minute: Math.round(vehiclesPerMinute)
            }
          },
          estimated_completion: estimatedTimeToComplete
        },
        data_quality: {
          top_customers_by_service_count: topCustomers
        },
        overall_assessment: {
          status: overallStatus,
          progress_indicator: `${Math.round((completionPercentages.customers_with_documents + completionPercentages.vehicles_with_complete_data) / 2)}%`,
          key_metrics: [
            `${totalDocuments.toLocaleString()} documents imported`,
            `${customersWithDocs.toLocaleString()} customers with service history`,
            `${(totalVehicles - vehiclesMissingData).toLocaleString()} vehicles with complete data`,
            `${totalMotHistory.toLocaleString()} MOT records created`
          ]
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[MONITOR] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get monitoring data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
