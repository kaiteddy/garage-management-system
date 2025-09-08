import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('[ANALYTICS-OVERVIEW] Fetching overview data for period:', period)

    // Calculate date ranges
    const now = new Date()
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    if (startDate && endDate) {
      // Custom date range
      currentStart = startOfDay(new Date(startDate))
      currentEnd = endOfDay(new Date(endDate))
      const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))
      // Ensure minimum 1 day difference for comparison
      const comparisonDays = Math.max(daysDiff, 1)
      previousStart = startOfDay(subDays(currentStart, comparisonDays))
      previousEnd = endOfDay(subDays(currentEnd, comparisonDays))
    } else {
      // Predefined periods
      switch (period) {
        case 'day':
          currentStart = startOfDay(now)
          currentEnd = endOfDay(now)
          previousStart = startOfDay(subDays(now, 1))
          previousEnd = endOfDay(subDays(now, 1))
          break
        case 'week':
          currentStart = startOfWeek(now, { weekStartsOn: 1 })
          currentEnd = endOfWeek(now, { weekStartsOn: 1 })
          previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
          previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
          break
        case 'month':
        default:
          currentStart = startOfMonth(now)
          currentEnd = endOfMonth(now)
          previousStart = startOfMonth(subMonths(now, 1))
          previousEnd = endOfMonth(subMonths(now, 1))
          break
      }
    }

    // Get revenue data
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN js.created_at >= $1 AND js.created_at <= $2 THEN 
          (SELECT COALESCE(SUM(jsi.net_price * jsi.qty), 0) FROM job_sheet_items jsi WHERE jsi.job_sheet_id = js.id)
        END), 0) as current_revenue,
        COALESCE(SUM(CASE WHEN js.created_at >= $3 AND js.created_at <= $4 THEN 
          (SELECT COALESCE(SUM(jsi.net_price * jsi.qty), 0) FROM job_sheet_items jsi WHERE jsi.job_sheet_id = js.id)
        END), 0) as previous_revenue,
        COUNT(CASE WHEN js.created_at >= $1 AND js.created_at <= $2 THEN 1 END) as current_jobs,
        COUNT(CASE WHEN js.created_at >= $3 AND js.created_at <= $4 THEN 1 END) as previous_jobs
      FROM job_sheets js
      WHERE js.created_at >= $3 AND js.created_at <= $2
    `

    const revenueResult = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN DATE(cd.created_at) >= DATE(${currentStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()}) THEN
          COALESCE(cd.total_gross::numeric, 0)
        END), 0) as current_revenue,
        COALESCE(SUM(CASE WHEN DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${previousEnd.toISOString()}) THEN
          COALESCE(cd.total_gross::numeric, 0)
        END), 0) as previous_revenue,
        COUNT(CASE WHEN DATE(cd.created_at) >= DATE(${currentStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()}) THEN 1 END) as current_jobs,
        COUNT(CASE WHEN DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${previousEnd.toISOString()}) THEN 1 END) as previous_jobs
      FROM customer_documents cd
      WHERE DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()})
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
    `

    // Get MOT data (if MOT table exists)
    let motData = { current_mots: 0, previous_mots: 0 }
    try {
      const motQuery = `
        SELECT 
          COUNT(CASE WHEN created_at >= $1 AND created_at <= $2 THEN 1 END) as current_mots,
          COUNT(CASE WHEN created_at >= $3 AND created_at <= $4 THEN 1 END) as previous_mots
        FROM mot_bookings
        WHERE created_at >= $3 AND created_at <= $2
      `
      const motResult = await sql`
        SELECT
          COUNT(CASE WHEN created_at >= ${currentStart.toISOString()} AND created_at <= ${currentEnd.toISOString()} THEN 1 END) as current_mots,
          COUNT(CASE WHEN created_at >= ${previousStart.toISOString()} AND created_at <= ${previousEnd.toISOString()} THEN 1 END) as previous_mots
        FROM mot_bookings
        WHERE created_at >= ${previousStart.toISOString()} AND created_at <= ${currentEnd.toISOString()}
      `
      motData = motResult[0] || motData
    } catch (error) {
      console.log('[ANALYTICS-OVERVIEW] MOT table not found, using default values')
    }

    // Get customer data
    const customerQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN js.created_at >= $1 AND js.created_at <= $2 THEN js.customer END) as current_customers,
        COUNT(DISTINCT CASE WHEN js.created_at >= $3 AND js.created_at <= $4 THEN js.customer END) as previous_customers
      FROM job_sheets js
      WHERE js.created_at >= $3 AND js.created_at <= $2 AND js.customer IS NOT NULL AND js.customer != ''
    `

    const customerResult = await sql`
      SELECT
        COUNT(DISTINCT CASE WHEN DATE(cd.created_at) >= DATE(${currentStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()}) THEN cd.customer_id END) as current_customers,
        COUNT(DISTINCT CASE WHEN DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${previousEnd.toISOString()}) THEN cd.customer_id END) as previous_customers
      FROM customer_documents cd
      WHERE DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()})
        AND cd.customer_id IS NOT NULL
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
    `

    // Get vehicles serviced data
    const vehicleQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN js.created_at >= $1 AND js.created_at <= $2 THEN js.registration END) as current_vehicles,
        COUNT(DISTINCT CASE WHEN js.created_at >= $3 AND js.created_at <= $4 THEN js.registration END) as previous_vehicles
      FROM job_sheets js
      WHERE js.created_at >= $3 AND js.created_at <= $2 AND js.registration IS NOT NULL AND js.registration != ''
    `

    const vehicleResult = await sql`
      SELECT
        COUNT(DISTINCT CASE WHEN DATE(cd.created_at) >= DATE(${currentStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()}) THEN cd.vehicle_registration END) as current_vehicles,
        COUNT(DISTINCT CASE WHEN DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${previousEnd.toISOString()}) THEN cd.vehicle_registration END) as previous_vehicles
      FROM customer_documents cd
      WHERE DATE(cd.created_at) >= DATE(${previousStart.toISOString()}) AND DATE(cd.created_at) <= DATE(${currentEnd.toISOString()})
        AND cd.vehicle_registration IS NOT NULL
        AND cd.vehicle_registration != ''
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
    `

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const revenue = revenueResult[0] || {}
    const customers = customerResult[0] || {}
    const vehicles = vehicleResult[0] || {}

    const overview = {
      revenue: {
        current: parseFloat(revenue.current_revenue) || 0,
        previous: parseFloat(revenue.previous_revenue) || 0,
        change: calculateChange(
          parseFloat(revenue.current_revenue) || 0,
          parseFloat(revenue.previous_revenue) || 0
        )
      },
      jobs: {
        current: parseInt(revenue.current_jobs) || 0,
        previous: parseInt(revenue.previous_jobs) || 0,
        change: calculateChange(
          parseInt(revenue.current_jobs) || 0,
          parseInt(revenue.previous_jobs) || 0
        )
      },
      mots: {
        current: parseInt(motData.current_mots) || 0,
        previous: parseInt(motData.previous_mots) || 0,
        change: calculateChange(
          parseInt(motData.current_mots) || 0,
          parseInt(motData.previous_mots) || 0
        )
      },
      customers: {
        current: parseInt(customers.current_customers) || 0,
        previous: parseInt(customers.previous_customers) || 0,
        change: calculateChange(
          parseInt(customers.current_customers) || 0,
          parseInt(customers.previous_customers) || 0
        )
      },
      vehicles: {
        current: parseInt(vehicles.current_vehicles) || 0,
        previous: parseInt(vehicles.previous_vehicles) || 0,
        change: calculateChange(
          parseInt(vehicles.current_vehicles) || 0,
          parseInt(vehicles.previous_vehicles) || 0
        )
      },
      period: {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd }
      }
    }

    console.log('[ANALYTICS-OVERVIEW] Overview data calculated:', overview)

    return NextResponse.json({
      success: true,
      data: overview
    })

  } catch (error) {
    console.error('[ANALYTICS-OVERVIEW] Error fetching overview data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch overview data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
