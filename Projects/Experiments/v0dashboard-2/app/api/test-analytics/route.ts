import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log('[TEST-ANALYTICS] Testing analytics data...')

    // Check recent data by date
    const recentData = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_gross::numeric) as revenue,
        document_type
      FROM customer_documents
      WHERE document_type IN ('JS', 'ES', 'SI', 'INVOICE')
      GROUP BY DATE(created_at), document_type
      ORDER BY date DESC
      LIMIT 20
    `

    // Check date range of data
    const dateRange = await sql`
      SELECT
        MIN(DATE(created_at)) as earliest_date,
        MAX(DATE(created_at)) as latest_date,
        COUNT(*) as total_records
      FROM customer_documents
      WHERE document_type IN ('JS', 'ES', 'SI', 'INVOICE')
    `

    // Check current week data specifically
    const currentWeekStart = new Date()
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Sunday

    const currentWeekData = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_gross::numeric) as revenue
      FROM customer_documents
      WHERE document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND DATE(created_at) >= ${currentWeekStart.toISOString().split('T')[0]}
        AND DATE(created_at) <= ${currentWeekEnd.toISOString().split('T')[0]}
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    // Check specific date data
    const specificDateData = await sql`
      SELECT
        created_at,
        DATE(created_at) as date_only,
        document_type,
        document_number,
        total_gross::numeric as amount,
        customer_id,
        vehicle_registration
      FROM customer_documents
      WHERE document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      ORDER BY total_gross::numeric DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      recentData,
      dateRange: dateRange[0],
      currentWeekData,
      specificDateData,
      periods: {
        currentWeek: {
          start: currentWeekStart.toISOString().split('T')[0],
          end: currentWeekEnd.toISOString().split('T')[0]
        }
      }
    })

  } catch (error) {
    console.error('[TEST-ANALYTICS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
