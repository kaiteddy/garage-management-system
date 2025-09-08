import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    console.log('[CHECK-COLUMNS] Checking customer_documents columns...')

    // Get column information for customer_documents table
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customer_documents'
      ORDER BY ordinal_position
    `

    // Get a sample record to see actual data
    const sample = await sql`
      SELECT * FROM customer_documents LIMIT 1
    `

    console.log('[CHECK-COLUMNS] ✅ Column check complete')
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      columns: columns,
      sample_record: sample[0] || null,
      sample_keys: sample[0] ? Object.keys(sample[0]) : []
    })

  } catch (error) {
    console.error('[CHECK-COLUMNS] Error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to check columns',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
