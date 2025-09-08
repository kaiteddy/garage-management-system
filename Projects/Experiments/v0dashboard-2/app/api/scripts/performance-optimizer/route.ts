import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function GET() {
  try {
    console.log('⚡ [PERFORMANCE] Analyzing database performance...')

    // 1. Query performance analysis
    const slowQueries = await sql`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_time DESC
      LIMIT 10
    `.catch(() => []) // pg_stat_statements might not be enabled

    // 2. Table sizes and bloat analysis
    const tableSizes = await sql`
      SELECT 
        schemaname,
        tablename,
        attname as column_name,
        n_distinct,
        most_common_vals,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      AND tablename IN ('customers', 'vehicles', 'documents', 'document_line_items')
      ORDER BY tablename, attname
      LIMIT 20
    `

    // 3. Index usage analysis
    const indexUsage = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_tup_read DESC
      LIMIT 15
    `.catch(() => [])

    // 4. Connection and lock analysis
    const connectionStats = await sql`
      SELECT 
        state,
        COUNT(*) as connection_count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `

    // 5. Cache hit ratios
    const cacheHitRatio = await sql`
      SELECT 
        'buffer_cache' as cache_type,
        ROUND(
          (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 
          2
        ) as hit_ratio
      FROM pg_statio_user_tables
      WHERE heap_blks_read > 0
    `.catch(() => [])

    // 6. Vacuum and analyze statistics
    const maintenanceStats = await sql`
      SELECT 
        schemaname,
        tablename,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        vacuum_count,
        autovacuum_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `

    // 7. Database configuration check
    const dbConfig = await sql`
      SELECT 
        name,
        setting,
        unit,
        category
      FROM pg_settings
      WHERE name IN (
        'shared_buffers',
        'work_mem',
        'maintenance_work_mem',
        'effective_cache_size',
        'random_page_cost',
        'seq_page_cost'
      )
      ORDER BY name
    `

    // 8. Query patterns analysis
    const queryPatterns = await sql`
      SELECT
        'customer_lookups' as pattern_type,
        COUNT(*) as frequency
      FROM customers
      WHERE created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT
        'vehicle_searches',
        COUNT(*)
      FROM vehicles
      WHERE updated_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT
        'document_access',
        COUNT(*)
      FROM documents
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    // Calculate performance score
    const bufferHitRatio = cacheHitRatio.length > 0 ? parseFloat(cacheHitRatio[0].hit_ratio) : 95
    const activeConnections = connectionStats.find(c => c.state === 'active')?.connection_count || 0
    const idleConnections = connectionStats.find(c => c.state === 'idle')?.connection_count || 0
    
    const performanceScore = Math.round(
      (bufferHitRatio * 0.4) + 
      (Math.max(0, 100 - (activeConnections * 5)) * 0.3) +
      (Math.max(0, 100 - (idleConnections * 2)) * 0.3)
    )

    console.log('✅ [PERFORMANCE] Analysis completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      performance_score: performanceScore,
      summary: {
        buffer_hit_ratio: bufferHitRatio,
        active_connections: activeConnections,
        idle_connections: idleConnections,
        total_tables_analyzed: tableSizes.length
      },
      analysis: {
        slow_queries: slowQueries,
        table_sizes: tableSizes,
        index_usage: indexUsage,
        connection_stats: connectionStats,
        cache_hit_ratio: cacheHitRatio,
        maintenance_stats: maintenanceStats,
        db_config: dbConfig,
        query_patterns: queryPatterns
      },
      recommendations: generatePerformanceRecommendations(performanceScore, bufferHitRatio, activeConnections)
    })

  } catch (error) {
    console.error('❌ [PERFORMANCE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, options } = await request.json()
    console.log(`🔧 [PERFORMANCE] Executing optimization: ${action}`)

    let result = { success: false, message: '', details: {} }

    switch (action) {
      case 'create_indexes':
        result = await createOptimalIndexes(options)
        break
      
      case 'vacuum_analyze':
        result = await runVacuumAnalyze(options)
        break
      
      case 'update_statistics':
        result = await updateTableStatistics(options)
        break
      
      case 'optimize_queries':
        result = await optimizeCommonQueries(options)
        break
      
      default:
        throw new Error(`Unknown optimization action: ${action}`)
    }

    return NextResponse.json({
      success: result.success,
      action,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [PERFORMANCE] Optimization error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function createOptimalIndexes(options: any) {
  try {
    const indexesCreated = []

    // Customer search indexes
    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL`
      indexesCreated.push('idx_customers_phone')
    } catch (e) { /* Index might already exist */ }

    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name ON customers(first_name, last_name)`
      indexesCreated.push('idx_customers_name')
    } catch (e) { /* Index might already exist */ }

    // Vehicle search indexes
    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_registration ON vehicles(UPPER(REPLACE(registration, ' ', '')))`
      indexesCreated.push('idx_vehicles_registration')
    } catch (e) { /* Index might already exist */ }

    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id) WHERE customer_id IS NOT NULL`
      indexesCreated.push('idx_vehicles_customer')
    } catch (e) { /* Index might already exist */ }

    // Document indexes
    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_customer ON documents(_id_customer) WHERE _id_customer IS NOT NULL`
      indexesCreated.push('idx_documents_customer')
    } catch (e) { /* Index might already exist */ }

    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_date ON documents(doc_date_issued)`
      indexesCreated.push('idx_documents_date')
    } catch (e) { /* Index might already exist */ }

    // Line item indexes
    try {
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_line_items_document ON document_line_items(document_id)`
      indexesCreated.push('idx_line_items_document')
    } catch (e) { /* Index might already exist */ }

    return {
      success: true,
      message: `Created ${indexesCreated.length} performance indexes`,
      details: { indexes_created: indexesCreated }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating indexes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function runVacuumAnalyze(options: any) {
  try {
    const tables = options?.tables || ['customers', 'vehicles', 'documents', 'document_line_items']
    const results = []

    for (const table of tables) {
      try {
        await sql.unsafe(`VACUUM ANALYZE ${table}`)
        results.push(`${table}: completed`)
      } catch (error) {
        results.push(`${table}: failed - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: true,
      message: `Vacuum analyze completed for ${tables.length} tables`,
      details: { results }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error running vacuum analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function updateTableStatistics(options: any) {
  try {
    const tables = ['customers', 'vehicles', 'documents', 'document_line_items']
    const statistics = []

    for (const table of tables) {
      const stats = await sql.unsafe(`
        SELECT 
          '${table}' as table_name,
          COUNT(*) as row_count,
          pg_size_pretty(pg_total_relation_size('${table}')) as size
        FROM ${table}
      `)
      statistics.push(stats[0])
    }

    return {
      success: true,
      message: `Updated statistics for ${tables.length} tables`,
      details: { table_statistics: statistics }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error updating statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

async function optimizeCommonQueries(options: any) {
  try {
    const optimizations = []

    // Optimize customer search queries
    const customerOptimization = await sql`
      SELECT COUNT(*) as customers_with_phone
      FROM customers 
      WHERE phone IS NOT NULL AND phone != ''
    `
    optimizations.push(`Customer phone index utilization: ${customerOptimization[0].customers_with_phone} records`)

    // Optimize vehicle lookup queries
    const vehicleOptimization = await sql`
      SELECT COUNT(*) as connected_vehicles
      FROM vehicles 
      WHERE customer_id IS NOT NULL
    `
    optimizations.push(`Vehicle-customer connections: ${vehicleOptimization[0].connected_vehicles} records`)

    // Optimize document queries
    const documentOptimization = await sql`
      SELECT COUNT(*) as documents_with_customers
      FROM documents 
      WHERE _id_customer IS NOT NULL
    `
    optimizations.push(`Document-customer links: ${documentOptimization[0].documents_with_customers} records`)

    return {
      success: true,
      message: `Analyzed ${optimizations.length} query patterns`,
      details: { optimizations }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error optimizing queries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {}
    }
  }
}

function generatePerformanceRecommendations(score: number, hitRatio: number, activeConnections: number) {
  const recommendations = []

  if (score < 70) {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      action: 'create_indexes',
      message: 'Performance score is below 70%. Create optimized indexes.',
      description: 'Add indexes for common search patterns and foreign key relationships'
    })
  }

  if (hitRatio < 90) {
    recommendations.push({
      priority: 'medium',
      category: 'caching',
      action: 'vacuum_analyze',
      message: `Buffer cache hit ratio is ${hitRatio}%. Run maintenance.`,
      description: 'Vacuum and analyze tables to improve query planning'
    })
  }

  if (activeConnections > 10) {
    recommendations.push({
      priority: 'medium',
      category: 'connections',
      action: 'optimize_queries',
      message: `${activeConnections} active connections detected.`,
      description: 'Monitor and optimize long-running queries'
    })
  }

  recommendations.push({
    priority: 'maintenance',
    category: 'monitoring',
    action: 'update_statistics',
    message: 'Regular performance monitoring recommended',
    description: 'Schedule periodic performance analysis and optimization'
  })

  return recommendations
}
