import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[CURRENT-STATUS] Checking current database status...')

    // Get table counts
    const tables = ['customers', 'vehicles', 'customer_documents', 'document_line_items', 'document_receipts', 'document_extras', 'mot_history']
    const counts = {}
    const sampleData = {}

    for (const table of tables) {
      try {
        const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = parseInt(countResult[0]?.count || 0)

        // Get sample data if table has records
        if (counts[table] > 0) {
          const sampleResult = await sql.unsafe(`SELECT * FROM ${table} LIMIT 2`)
          sampleData[table] = sampleResult
        }
      } catch (error) {
        counts[table] = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }

    // Check table structures
    const structures = {}
    for (const table of tables) {
      try {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        `
        structures[table] = columns
      } catch (error) {
        structures[table] = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }

    // Check database connection info
    const dbInfo = await sql`SELECT current_database(), current_user, version()`

    console.log('[CURRENT-STATUS] ✅ Status check complete')

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database_info: dbInfo[0],
      table_counts: counts,
      table_structures: structures,
      sample_data: sampleData,
      summary: {
        total_records: Object.values(counts).reduce((sum, count) =>
          typeof count === 'number' ? sum + count : sum, 0),
        tables_with_data: Object.values(counts).filter(count =>
          typeof count === 'number' && count > 0).length,
        total_tables: tables.length
      }
    })

  } catch (error) {
    console.error('[CURRENT-STATUS] Error during status check:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check current status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
