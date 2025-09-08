import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('[ANALYTICS-MOT] Fetching MOT data for period:', period)

    // Calculate date ranges
    const now = new Date()
    let currentStart: Date, currentEnd: Date

    if (startDate && endDate) {
      currentStart = new Date(startDate)
      currentEnd = new Date(endDate)
    } else {
      switch (period) {
        case 'day':
          currentStart = startOfDay(now)
          currentEnd = endOfDay(now)
          break
        case 'week':
          currentStart = startOfWeek(now, { weekStartsOn: 1 })
          currentEnd = endOfWeek(now, { weekStartsOn: 1 })
          break
        case 'month':
        default:
          currentStart = startOfMonth(now)
          currentEnd = endOfMonth(now)
          break
      }
    }

    // Try to get MOT data from dedicated MOT table first
    let motBookings = []
    let motFromJobSheets = false

    try {
      // Get MOT bookings data
      const motBookingsQuery = `
        SELECT 
          DATE(test_date) as date,
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (completed_at - test_date)) / 60) as avg_duration_minutes
        FROM mot_bookings
        WHERE test_date >= $1 AND test_date <= $2
        GROUP BY DATE(test_date), status
        ORDER BY DATE(test_date)
      `
      motBookings = await sql(motBookingsQuery, [
        currentStart.toISOString(),
        currentEnd.toISOString()
      ])
    } catch (error) {
      console.log('[ANALYTICS-MOT] MOT bookings table not found, checking job sheets for MOT data')
      
      // Fallback to job sheets with MOT-related items
      try {
        const motFromJobSheetsQuery = `
          SELECT 
            DATE(js.created_at) as date,
            'completed' as status,
            COUNT(DISTINCT js.id) as count,
            AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 60) as avg_duration_minutes
          FROM job_sheets js
          JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
          WHERE js.created_at >= $1 AND js.created_at <= $2
            AND (LOWER(jsi.description) LIKE '%mot%' 
                 OR LOWER(jsi.description) LIKE '%test%'
                 OR jsi.type = 'MOT')
          GROUP BY DATE(js.created_at)
          ORDER BY DATE(js.created_at)
        `
        motBookings = await sql(motFromJobSheetsQuery, [
          currentStart.toISOString(),
          currentEnd.toISOString()
        ])
        motFromJobSheets = true
      } catch (fallbackError) {
        console.log('[ANALYTICS-MOT] No MOT data found in job sheets either')
      }
    }

    // Get MOT status breakdown
    const statusBreakdown = motBookings.reduce((acc, booking) => {
      const status = booking.status || 'completed'
      acc[status] = (acc[status] || 0) + parseInt(booking.count)
      return acc
    }, {} as Record<string, number>)

    // Get daily MOT trend
    const dailyTrend = motBookings.reduce((acc, booking) => {
      const date = format(new Date(booking.date), 'MMM dd')
      const existing = acc.find(item => item.date === date)
      if (existing) {
        existing.count += parseInt(booking.count)
      } else {
        acc.push({
          date,
          count: parseInt(booking.count),
          avgDuration: parseFloat(booking.avg_duration_minutes) || 0
        })
      }
      return acc
    }, [] as Array<{ date: string; count: number; avgDuration: number }>)

    // Get technician MOT performance (if available)
    let technicianPerformance = []
    try {
      const technicianQuery = motFromJobSheets ? `
        SELECT 
          js.technician,
          COUNT(DISTINCT js.id) as mot_count,
          AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 60) as avg_duration_minutes,
          COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue
        FROM job_sheets js
        JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
        WHERE js.created_at >= $1 AND js.created_at <= $2
          AND js.technician IS NOT NULL 
          AND js.technician != ''
          AND (LOWER(jsi.description) LIKE '%mot%' 
               OR LOWER(jsi.description) LIKE '%test%'
               OR jsi.type = 'MOT')
        GROUP BY js.technician
        ORDER BY mot_count DESC
      ` : `
        SELECT 
          technician,
          COUNT(*) as mot_count,
          AVG(EXTRACT(EPOCH FROM (completed_at - test_date)) / 60) as avg_duration_minutes,
          SUM(test_fee) as revenue
        FROM mot_bookings
        WHERE test_date >= $1 AND test_date <= $2
          AND technician IS NOT NULL 
          AND technician != ''
        GROUP BY technician
        ORDER BY mot_count DESC
      `

      technicianPerformance = await sql(technicianQuery, [
        currentStart.toISOString(),
        currentEnd.toISOString()
      ])
    } catch (error) {
      console.log('[ANALYTICS-MOT] Could not get technician performance data')
    }

    // Get MOT pass/fail rates (if available)
    let passFailRates = { passed: 0, failed: 0, total: 0 }
    try {
      if (!motFromJobSheets) {
        const passFailQuery = `
          SELECT 
            result,
            COUNT(*) as count
          FROM mot_bookings
          WHERE test_date >= $1 AND test_date <= $2
            AND result IS NOT NULL
          GROUP BY result
        `
        const passFailResult = await sql(passFailQuery, [
          currentStart.toISOString(),
          currentEnd.toISOString()
        ])

        passFailRates = passFailResult.reduce((acc, result) => {
          const resultType = result.result.toLowerCase()
          if (resultType.includes('pass')) {
            acc.passed += parseInt(result.count)
          } else if (resultType.includes('fail')) {
            acc.failed += parseInt(result.count)
          }
          acc.total += parseInt(result.count)
          return acc
        }, { passed: 0, failed: 0, total: 0 })
      }
    } catch (error) {
      console.log('[ANALYTICS-MOT] Could not get pass/fail rates')
    }

    // Calculate summary metrics
    const totalMOTs = Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0)
    const avgDuration = dailyTrend.length > 0 
      ? dailyTrend.reduce((sum, day) => sum + day.avgDuration, 0) / dailyTrend.length 
      : 0
    const passRate = passFailRates.total > 0 ? (passFailRates.passed / passFailRates.total) * 100 : 0

    const motData = {
      summary: {
        totalMOTs,
        avgDuration,
        passRate,
        activeTechnicians: technicianPerformance.length,
        dataSource: motFromJobSheets ? 'job_sheets' : 'mot_bookings'
      },
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count
      })),
      dailyTrend,
      technicians: technicianPerformance.map(tech => ({
        name: tech.technician,
        motCount: parseInt(tech.mot_count),
        avgDuration: parseFloat(tech.avg_duration_minutes),
        revenue: parseFloat(tech.revenue)
      })),
      passFailRates: {
        passed: passFailRates.passed,
        failed: passFailRates.failed,
        total: passFailRates.total,
        passPercentage: passRate,
        failPercentage: passFailRates.total > 0 ? (passFailRates.failed / passFailRates.total) * 100 : 0
      }
    }

    console.log('[ANALYTICS-MOT] MOT data calculated')

    return NextResponse.json({
      success: true,
      data: motData
    })

  } catch (error) {
    console.error('[ANALYTICS-MOT] Error fetching MOT data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch MOT data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
