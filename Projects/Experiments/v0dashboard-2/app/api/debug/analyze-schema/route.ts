import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[ANALYZE-SCHEMA] Starting schema analysis...')

    // Get all table structures
    const tables = ['customers', 'vehicles', 'customer_documents', 'document_line_items', 'document_receipts', 'document_extras', 'mot_history']
    const schemaInfo: any = {}

    for (const tableName of tables) {
      try {
        // Get column information
        const columns = await sql`
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `

        // Get foreign key constraints
        const foreignKeys = await sql`
          SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = ${tableName}
        `

        // Get sample data
        const sampleData = await sql.unsafe(`SELECT * FROM ${tableName} LIMIT 3`)

        schemaInfo[tableName] = {
          exists: columns.length > 0,
          columns: columns,
          foreign_keys: foreignKeys,
          sample_data: sampleData,
          record_count: sampleData.length > 0 ? await sql.unsafe(`SELECT COUNT(*) as count FROM ${tableName}`) : [{ count: 0 }]
        }
      } catch (error) {
        schemaInfo[tableName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    console.log('[ANALYZE-SCHEMA] ✅ Schema analysis complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      schema_analysis: schemaInfo
    })

  } catch (error) {
    console.error('[ANALYZE-SCHEMA] Error during analysis:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to analyze schema',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
