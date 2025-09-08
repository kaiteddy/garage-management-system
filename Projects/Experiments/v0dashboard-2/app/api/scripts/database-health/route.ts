import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('🏥 [DB-HEALTH] Starting comprehensive database health check...')

    // 1. Table counts and basic statistics
    const tableCounts = await sql`
      SELECT 
        'customers' as table_name, COUNT(*) as count FROM customers
      UNION ALL
      SELECT 'vehicles', COUNT(*) FROM vehicles
      UNION ALL
      SELECT 'documents', COUNT(*) FROM documents
      UNION ALL
      SELECT 'document_line_items', COUNT(*) FROM document_line_items
      UNION ALL
      SELECT 'document_extras', COUNT(*) FROM document_extras
      UNION ALL
      SELECT 'appointments', COUNT(*) FROM appointments
      UNION ALL
      SELECT 'reminders', COUNT(*) FROM reminders
      ORDER BY table_name
    `

    // 2. Connection health
    const connectionHealth = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(customer_id) as vehicles_with_customer_id,
        COUNT(owner_id) as vehicles_with_owner_id,
        COUNT(CASE WHEN customer_id IS NOT NULL OR owner_id IS NOT NULL THEN 1 END) as connected_vehicles,
        ROUND(
          (COUNT(CASE WHEN customer_id IS NOT NULL OR owner_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 
          2
        ) as connection_percentage
      FROM vehicles
    `

    // 3. Data quality metrics
    const dataQuality = await sql`
      SELECT
        'customers' as entity,
        COUNT(*) as total,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' AND email NOT LIKE '%placeholder%' THEN 1 END) as with_email,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_name
      FROM customers
      UNION ALL
      SELECT
        'vehicles',
        COUNT(*),
        COUNT(CASE WHEN make IS NOT NULL AND make != '' THEN 1 END),
        COUNT(CASE WHEN model IS NOT NULL AND model != '' THEN 1 END),
        COUNT(CASE WHEN year IS NOT NULL THEN 1 END)
      FROM vehicles
    `

    // 4. Document integrity
    const documentIntegrity = await sql`
      SELECT
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(DISTINCT li.document_id) as documents_with_line_items,
        COUNT(DISTINCT de.document_id) as documents_with_extras,
        COUNT(DISTINCT d._id_customer) as documents_with_customers
      FROM documents d
      LEFT JOIN document_line_items li ON d.id::text = li.document_id
      LEFT JOIN document_extras de ON d.id::text = de.document_id
    `

    // 5. Orphaned records
    const orphanedRecords = await sql`
      SELECT
        'line_items_without_documents' as type,
        COUNT(*) as count
      FROM document_line_items li
      WHERE li.document_id NOT IN (SELECT id::text FROM documents)
      UNION ALL
      SELECT
        'extras_without_documents',
        COUNT(*)
      FROM document_extras de
      WHERE de.document_id NOT IN (SELECT id::text FROM documents)
      UNION ALL
      SELECT
        'vehicles_without_customers',
        COUNT(*)
      FROM vehicles
      WHERE customer_id IS NULL AND owner_id IS NULL
    `

    // 6. Recent activity
    const recentActivity = await sql`
      SELECT
        'customers' as table_name,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_24h,
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_24h
      FROM customers
      UNION ALL
      SELECT
        'vehicles',
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END)
      FROM vehicles
      UNION ALL
      SELECT
        'documents',
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END),
        COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END)
      FROM documents
    `

    // 7. Database size estimation
    const databaseSize = await sql`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      AND tablename IN ('customers', 'vehicles', 'documents', 'document_line_items')
      ORDER BY tablename, attname
      LIMIT 20
    `

    // 8. Performance indicators
    const performanceMetrics = await sql`
      SELECT
        COUNT(*) as total_customers,
        AVG(LENGTH(first_name || ' ' || last_name)) as avg_name_length,
        COUNT(DISTINCT SUBSTRING(phone, 1, 5)) as phone_prefixes
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
    `

    // Calculate health score
    const totalVehicles = parseInt(connectionHealth[0].total_vehicles)
    const connectedVehicles = parseInt(connectionHealth[0].connected_vehicles)
    const connectionRate = parseFloat(connectionHealth[0].connection_percentage)
    
    const customersWithPhone = parseInt(dataQuality[0].with_phone)
    const totalCustomers = parseInt(dataQuality[0].total)
    const phoneRate = (customersWithPhone / totalCustomers) * 100

    const healthScore = Math.round((connectionRate + phoneRate) / 2)

    console.log('✅ [DB-HEALTH] Health check completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health_score: healthScore,
      summary: {
        total_records: tableCounts.reduce((sum, table) => sum + parseInt(table.count), 0),
        connection_rate: connectionRate,
        data_quality_score: phoneRate
      },
      metrics: {
        table_counts: tableCounts,
        connection_health: connectionHealth[0],
        data_quality: dataQuality,
        document_integrity: documentIntegrity[0],
        orphaned_records: orphanedRecords,
        recent_activity: recentActivity,
        performance_metrics: performanceMetrics[0]
      },
      recommendations: generateRecommendations(healthScore, connectionRate, orphanedRecords)
    })

  } catch (error) {
    console.error('❌ [DB-HEALTH] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(healthScore: number, connectionRate: number, orphanedRecords: any[]) {
  const recommendations = []

  if (healthScore < 70) {
    recommendations.push({
      priority: 'high',
      category: 'data_integrity',
      message: 'Database health score is below 70%. Immediate attention required.',
      action: 'Run data integrity fixes and connection repairs'
    })
  }

  if (connectionRate < 80) {
    recommendations.push({
      priority: 'medium',
      category: 'connections',
      message: `Vehicle-customer connection rate is ${connectionRate}%. Consider running connection fixes.`,
      action: 'Execute /api/fix-customer-vehicle-relationships'
    })
  }

  const orphanedLineItems = orphanedRecords.find(r => r.type === 'line_items_without_documents')
  if (orphanedLineItems && parseInt(orphanedLineItems.count) > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'data_cleanup',
      message: `${orphanedLineItems.count} line items are orphaned without parent documents.`,
      action: 'Import missing documents or clean up orphaned line items'
    })
  }

  const unconnectedVehicles = orphanedRecords.find(r => r.type === 'vehicles_without_customers')
  if (unconnectedVehicles && parseInt(unconnectedVehicles.count) > 1000) {
    recommendations.push({
      priority: 'low',
      category: 'optimization',
      message: `${unconnectedVehicles.count} vehicles lack customer connections.`,
      action: 'Run vehicle assignment scripts to improve connection rate'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      category: 'maintenance',
      message: 'Database health is excellent! Consider regular maintenance.',
      action: 'Schedule periodic health checks and backups'
    })
  }

  return recommendations
}

export async function POST() {
  try {
    console.log('🔧 [DB-HEALTH] Running automated health fixes...')

    let fixesApplied = 0
    const fixes = []

    // 1. Fix basic customer-vehicle connections
    const connectionFix = await sql`
      UPDATE vehicles 
      SET owner_id = customer_id, updated_at = NOW()
      WHERE customer_id IS NOT NULL AND owner_id IS NULL
    `
    if (connectionFix.count > 0) {
      fixes.push(`Fixed ${connectionFix.count} vehicle owner_id connections`)
      fixesApplied += connectionFix.count
    }

    // 2. Clean up invalid references
    const cleanupCustomerIds = await sql`
      UPDATE vehicles 
      SET customer_id = NULL, updated_at = NOW()
      WHERE customer_id IS NOT NULL 
      AND customer_id NOT IN (SELECT id FROM customers)
    `
    if (cleanupCustomerIds.count > 0) {
      fixes.push(`Cleaned up ${cleanupCustomerIds.count} invalid customer references`)
      fixesApplied += cleanupCustomerIds.count
    }

    // 3. Update empty customer names
    const updateCustomerNames = await sql`
      UPDATE customers 
      SET first_name = 'Unknown', updated_at = NOW()
      WHERE (first_name IS NULL OR first_name = '') 
      AND (last_name IS NULL OR last_name = '')
      AND phone IS NOT NULL AND phone != ''
    `
    if (updateCustomerNames.count > 0) {
      fixes.push(`Updated ${updateCustomerNames.count} customer names`)
      fixesApplied += updateCustomerNames.count
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${fixesApplied} automated fixes`,
      fixes_applied: fixes,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [DB-HEALTH] Fix error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
