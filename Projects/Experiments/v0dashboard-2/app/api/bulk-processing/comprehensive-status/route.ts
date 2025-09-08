import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log("[COMPREHENSIVE-STATUS] 📊 Getting complete processing status...")

    // Get all current counts
    const [
      totalCustomers,
      totalVehicles,
      totalDocuments,
      totalLineItems,
      totalDocumentExtras,
      totalMotHistory
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM customers`,
      sql`SELECT COUNT(*) as count FROM vehicles`,
      sql`SELECT COUNT(*) as count FROM documents`,
      sql`SELECT COUNT(*) as count FROM document_line_items`,
      sql`SELECT COUNT(*) as count FROM document_extras`,
      sql`SELECT COUNT(*) as count FROM mot_history`
    ])

    // Get recent activity (last 5 minutes)
    const [
      recentDocuments,
      recentLineItems,
      recentVehicleUpdates
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM documents WHERE created_at > NOW() - INTERVAL '5 minutes'`,
      sql`SELECT COUNT(*) as count FROM document_line_items WHERE id LIKE '%_2025%' OR id > (SELECT MAX(id) FROM document_line_items WHERE created_at < NOW() - INTERVAL '5 minutes')`,
      sql`SELECT COUNT(*) as count FROM vehicles WHERE updated_at > NOW() - INTERVAL '5 minutes'`
    ])

    // Calculate current totals
    const currentTotals = {
      customers: parseInt(totalCustomers[0].count),
      vehicles: parseInt(totalVehicles[0].count),
      documents: parseInt(totalDocuments[0].count),
      line_items: parseInt(totalLineItems[0].count),
      document_extras: parseInt(totalDocumentExtras[0].count),
      mot_history: parseInt(totalMotHistory[0].count)
    }

    // Define targets from CSV files
    const targets = {
      documents: 32890,
      line_items: 50000, // Estimated
      document_extras: 15000, // Estimated
      vehicles_with_data: Math.round(currentTotals.vehicles * 0.9) // 90% target
    }

    // Calculate remaining work
    const remaining = {
      documents: Math.max(0, targets.documents - currentTotals.documents),
      line_items: Math.max(0, targets.line_items - currentTotals.line_items),
      document_extras: Math.max(0, targets.document_extras - currentTotals.document_extras)
    }

    // Calculate completion percentages
    const completion = {
      documents: Math.round((currentTotals.documents / targets.documents) * 100),
      line_items: Math.round((currentTotals.line_items / targets.line_items) * 100),
      document_extras: Math.round((currentTotals.document_extras / targets.document_extras) * 100)
    }

    // Calculate processing rates (per minute)
    const recentActivity = {
      documents_added: parseInt(recentDocuments[0].count),
      line_items_added: parseInt(recentLineItems[0].count),
      vehicles_updated: parseInt(recentVehicleUpdates[0].count)
    }

    const processingRates = {
      documents_per_minute: Math.round(recentActivity.documents_added / 5) * 60,
      line_items_per_minute: Math.round(recentActivity.line_items_added / 5) * 60,
      vehicles_per_minute: Math.round(recentActivity.vehicles_updated / 5) * 60
    }

    // Estimate completion times
    const estimatedCompletion = {
      documents: processingRates.documents_per_minute > 0 ? 
        Math.ceil(remaining.documents / processingRates.documents_per_minute) : 'Unknown',
      line_items: processingRates.line_items_per_minute > 0 ? 
        Math.ceil(remaining.line_items / processingRates.line_items_per_minute) : 'Unknown'
    }

    // Overall status assessment
    const overallCompletion = Math.round((completion.documents + completion.line_items + completion.document_extras) / 3)
    
    let status = 'PROCESSING'
    if (overallCompletion >= 95) status = 'NEARLY_COMPLETE'
    else if (overallCompletion >= 80) status = 'EXCELLENT_PROGRESS'
    else if (overallCompletion >= 60) status = 'GOOD_PROGRESS'
    else if (overallCompletion >= 40) status = 'STEADY_PROGRESS'

    // Check data integrity
    const integrityChecks = await Promise.all([
      // Documents with line items
      sql`
        SELECT COUNT(*) as count FROM documents d
        WHERE EXISTS (
          SELECT 1 FROM document_line_items dli 
          WHERE dli.document_id = d.id::text
        )
      `,
      // Customers with documents
      sql`SELECT COUNT(DISTINCT _id_customer) as count FROM documents`,
      // Vehicles with complete data
      sql`
        SELECT COUNT(*) as count FROM vehicles 
        WHERE year IS NOT NULL AND color IS NOT NULL AND fuel_type IS NOT NULL
      `
    ])

    const dataIntegrity = {
      documents_with_line_items: parseInt(integrityChecks[0][0].count),
      customers_with_documents: parseInt(integrityChecks[1][0].count),
      vehicles_with_complete_data: parseInt(integrityChecks[2][0].count)
    }

    // Get sample data for verification
    const sampleData = await Promise.all([
      // Top customers by document count
      sql`
        SELECT customer_name, COUNT(*) as doc_count, SUM(total_gross) as total_spent
        FROM documents 
        WHERE customer_name IS NOT NULL AND customer_name != ''
        GROUP BY customer_name
        ORDER BY doc_count DESC
        LIMIT 5
      `,
      // Recent documents
      sql`
        SELECT doc_number, customer_name, vehicle_registration, total_gross, created_at
        FROM documents 
        ORDER BY created_at DESC
        LIMIT 5
      `
    ])

    return NextResponse.json({
      success: true,
      comprehensive_status: {
        current_totals: currentTotals,
        targets: targets,
        remaining_work: remaining,
        completion_percentages: completion,
        overall_completion: {
          percentage: overallCompletion,
          status: status
        },
        processing_performance: {
          recent_activity: recentActivity,
          processing_rates: processingRates,
          estimated_completion: estimatedCompletion,
          is_actively_processing: recentActivity.documents_added > 0 || recentActivity.line_items_added > 0
        },
        data_integrity: {
          documents_with_line_items: dataIntegrity.documents_with_line_items,
          documents_missing_line_items: currentTotals.documents - dataIntegrity.documents_with_line_items,
          customers_with_documents: dataIntegrity.customers_with_documents,
          vehicles_with_complete_data: dataIntegrity.vehicles_with_complete_data,
          line_items_per_document: Math.round(currentTotals.line_items / currentTotals.documents * 100) / 100
        },
        quality_samples: {
          top_customers: sampleData[0].map(c => ({
            name: c.customer_name,
            documents: parseInt(c.doc_count),
            total_spent: parseFloat(c.total_spent)
          })),
          recent_documents: sampleData[1].map(d => ({
            doc_number: d.doc_number,
            customer: d.customer_name,
            vehicle: d.vehicle_registration,
            amount: parseFloat(d.total_gross),
            created: d.created_at
          }))
        },
        next_priorities: [
          remaining.documents > 1000 ? `Complete ${remaining.documents.toLocaleString()} remaining documents` : null,
          remaining.line_items > 10000 ? `Import ${remaining.line_items.toLocaleString()} remaining line items` : null,
          dataIntegrity.documents_with_line_items < currentTotals.documents * 0.8 ? 'Improve line item coverage' : null,
          dataIntegrity.vehicles_with_complete_data < currentTotals.vehicles * 0.8 ? 'Complete vehicle data updates' : null
        ].filter(Boolean)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[COMPREHENSIVE-STATUS] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get comprehensive status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
