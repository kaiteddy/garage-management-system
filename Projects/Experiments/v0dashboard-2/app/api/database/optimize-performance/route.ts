import { NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export async function POST() {
  try {
    console.log("[DB-OPTIMIZE] 🚀 Optimizing database performance")

    const optimizations = []

    // Create indexes for faster queries
    try {
      // Index on vehicle registration for fast lookups
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_registration ON vehicles(registration)`
      optimizations.push("✅ Created index on vehicles.registration")
    } catch (error) {
      optimizations.push(`⚠️ Vehicle registration index: ${error}`)
    }

    try {
      // Index on MOT history vehicle registration
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mot_history_vehicle_reg ON mot_history(vehicle_registration)`
      optimizations.push("✅ Created index on mot_history.vehicle_registration")
    } catch (error) {
      optimizations.push(`⚠️ MOT history index: ${error}`)
    }

    try {
      // Index on MOT test date for chronological queries
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mot_history_test_date ON mot_history(test_date DESC)`
      optimizations.push("✅ Created index on mot_history.test_date")
    } catch (error) {
      optimizations.push(`⚠️ MOT test date index: ${error}`)
    }

    try {
      // Index on vehicle MOT expiry date for urgent queries
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_mot_expiry ON vehicles(mot_expiry_date) WHERE mot_expiry_date IS NOT NULL`
      optimizations.push("✅ Created index on vehicles.mot_expiry_date")
    } catch (error) {
      optimizations.push(`⚠️ MOT expiry index: ${error}`)
    }

    try {
      // Index on documents vehicle registration
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_vehicle_reg ON documents(vehicle_registration)`
      optimizations.push("✅ Created index on documents.vehicle_registration")
    } catch (error) {
      optimizations.push(`⚠️ Documents index: ${error}`)
    }

    try {
      // Index on vehicle make/model for search
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model)`
      optimizations.push("✅ Created index on vehicles.make, model")
    } catch (error) {
      optimizations.push(`⚠️ Make/model index: ${error}`)
    }

    try {
      // Index on MOT last checked for bulk updates
      await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_mot_last_checked ON vehicles(mot_last_checked) WHERE mot_last_checked IS NOT NULL`
      optimizations.push("✅ Created index on vehicles.mot_last_checked")
    } catch (error) {
      optimizations.push(`⚠️ MOT last checked index: ${error}`)
    }

    // Analyze tables for better query planning
    try {
      await sql`ANALYZE vehicles`
      await sql`ANALYZE mot_history`
      await sql`ANALYZE documents`
      optimizations.push("✅ Updated table statistics")
    } catch (error) {
      optimizations.push(`⚠️ Table analysis: ${error}`)
    }

    // Get current database performance stats
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables 
      WHERE tablename IN ('vehicles', 'mot_history', 'documents')
      ORDER BY tablename
    `

    const indexStats = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read as index_reads,
        idx_tup_fetch as index_fetches
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('vehicles', 'mot_history', 'documents')
      ORDER BY tablename, indexname
    `

    return NextResponse.json({
      success: true,
      message: "Database performance optimization completed",
      optimizations: optimizations,
      performance: {
        tableStats: tableStats,
        indexStats: indexStats,
        recommendations: [
          "Use optimized APIs: /api/vehicles/fast-dashboard",
          "Use pagination: /api/vehicles/quick-list?limit=50",
          "Avoid complex joins in frequent queries",
          "Use specific vehicle APIs: /api/vehicles/[registration]/route-optimized",
          "Enable query result caching where possible"
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DB-OPTIMIZE] ❌ Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to optimize database performance",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
