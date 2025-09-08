import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    // Get real-time counts
    const [
      totalCustomers,
      totalVehicles, 
      totalDocuments,
      totalMotHistory,
      vehiclesMissingData,
      customersWithDocs,
      recentDocs,
      recentVehicles
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM mot_history`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE year IS NULL OR color IS NULL OR fuel_type IS NULL OR engine_size IS NULL`,
      sql`SELECT COUNT(DISTINCT _id_customer) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM documents WHERE created_at > NOW() - INTERVAL '5 minutes'`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE updated_at > NOW() - INTERVAL '5 minutes'`
    ])

    // Calculate metrics
    const customers = parseInt(totalCustomers[0].count)
    const vehicles = parseInt(totalVehicles[0].count)
    const documents = parseInt(totalDocuments[0].count)
    const motHistory = parseInt(totalMotHistory[0].count)
    const missingData = parseInt(vehiclesMissingData[0].count)
    const customersWithDocuments = parseInt(customersWithDocs[0].count)
    const recentDocsCount = parseInt(recentDocs[0].count)
    const recentVehiclesCount = parseInt(recentVehicles[0].count)

    // Calculate completion percentages
    const customersWithDocsPercent = Math.round((customersWithDocuments / customers) * 100)
    const vehiclesCompletePercent = Math.round(((vehicles - missingData) / vehicles) * 100)
    
    // Calculate processing rates (per minute)
    const docsPerMinute = Math.round(recentDocsCount / 5) * 60 // 5-minute window to per minute
    const vehiclesPerMinute = Math.round(recentVehiclesCount / 5) * 60

    // Estimate completion time
    const remainingDocs = Math.max(0, 32890 - documents)
    const remainingVehicles = missingData
    
    const estimatedDocsTime = docsPerMinute > 0 ? Math.ceil(remainingDocs / docsPerMinute) : 'Unknown'
    const estimatedVehiclesTime = vehiclesPerMinute > 0 ? Math.ceil(remainingVehicles / vehiclesPerMinute) : 'Unknown'

    // Overall progress
    const overallProgress = Math.round((customersWithDocsPercent + vehiclesCompletePercent) / 2)
    
    // Status assessment
    let status = 'PROCESSING'
    if (overallProgress > 90) status = 'NEARLY_COMPLETE'
    else if (overallProgress > 70) status = 'EXCELLENT_PROGRESS'
    else if (overallProgress > 50) status = 'GOOD_PROGRESS'
    else if (overallProgress > 30) status = 'STEADY_PROGRESS'

    // Get top customers for quality check
    const topCustomers = await sql`
      SELECT customer_name, COUNT(*) as doc_count, SUM(total_gross) as total_spent
      FROM documents 
      WHERE customer_name IS NOT NULL AND customer_name != ''
      GROUP BY customer_name
      ORDER BY doc_count DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      live_dashboard: {
        current_totals: {
          customers,
          vehicles,
          documents,
          mot_history: motHistory
        },
        completion_status: {
          customers_with_documents: {
            count: customersWithDocuments,
            percentage: customersWithDocsPercent
          },
          vehicles_with_complete_data: {
            count: vehicles - missingData,
            percentage: vehiclesCompletePercent
          },
          overall_progress: {
            percentage: overallProgress,
            status
          }
        },
        processing_performance: {
          recent_activity: {
            documents_added_last_5min: recentDocsCount,
            vehicles_updated_last_5min: recentVehiclesCount
          },
          current_rates: {
            documents_per_minute: docsPerMinute,
            vehicles_per_minute: vehiclesPerMinute
          },
          estimated_completion: {
            documents_remaining: remainingDocs,
            vehicles_remaining: remainingVehicles,
            documents_eta_minutes: estimatedDocsTime,
            vehicles_eta_minutes: estimatedVehiclesTime
          }
        },
        data_quality: {
          top_customers: topCustomers.map(c => ({
            name: c.customer_name,
            documents: parseInt(c.doc_count),
            total_spent: parseFloat(c.total_spent)
          }))
        },
        progress_indicators: {
          documents_progress: Math.round((documents / 32890) * 100),
          customers_progress: customersWithDocsPercent,
          vehicles_progress: vehiclesCompletePercent,
          overall_completion: overallProgress
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[LIVE-DASHBOARD] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get live dashboard data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
