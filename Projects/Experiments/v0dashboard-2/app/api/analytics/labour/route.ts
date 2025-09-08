import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('[ANALYTICS-LABOUR] Fetching labour data for period:', period)

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

    // Get labour hours and revenue by technician
    const technicianLabourQuery = `
      SELECT 
        js.technician,
        COUNT(DISTINCT js.id) as jobs_completed,
        COALESCE(SUM(CASE WHEN jsi.type = 'Labour' THEN jsi.qty ELSE 0 END), 0) as labour_hours_sold,
        COALESCE(SUM(CASE WHEN jsi.type = 'Labour' THEN jsi.net_price * jsi.qty ELSE 0 END), 0) as labour_revenue,
        COALESCE(AVG(CASE WHEN jsi.type = 'Labour' THEN jsi.net_price ELSE NULL END), 0) as avg_labour_rate,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as total_revenue
      FROM job_sheets js
      LEFT JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND js.technician IS NOT NULL 
        AND js.technician != ''
      GROUP BY js.technician
      ORDER BY labour_revenue DESC
    `

    const technicianLabourResult = await sql(technicianLabourQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get labour efficiency metrics
    const efficiencyQuery = `
      SELECT 
        js.technician,
        COUNT(DISTINCT js.id) as jobs_count,
        AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600) as avg_job_duration_hours,
        COALESCE(SUM(CASE WHEN jsi.type = 'Labour' THEN jsi.qty ELSE 0 END), 0) as labour_hours_charged,
        CASE 
          WHEN AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600) > 0 THEN
            (COALESCE(SUM(CASE WHEN jsi.type = 'Labour' THEN jsi.qty ELSE 0 END), 0) / 
             AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600)) * 100
          ELSE 0 
        END as efficiency_percentage
      FROM job_sheets js
      LEFT JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND js.technician IS NOT NULL 
        AND js.technician != ''
        AND js.updated_at > js.created_at
      GROUP BY js.technician
      ORDER BY efficiency_percentage DESC
    `

    const efficiencyResult = await sql(efficiencyQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get labour rate analysis
    const labourRateQuery = `
      SELECT 
        jsi.description as service_type,
        AVG(jsi.net_price) as avg_rate,
        MIN(jsi.net_price) as min_rate,
        MAX(jsi.net_price) as max_rate,
        COUNT(*) as frequency,
        SUM(jsi.qty) as total_hours,
        SUM(jsi.net_price * jsi.qty) as total_revenue
      FROM job_sheet_items jsi
      JOIN job_sheets js ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND jsi.type = 'Labour'
        AND jsi.description IS NOT NULL 
        AND jsi.description != ''
      GROUP BY jsi.description
      ORDER BY total_revenue DESC
      LIMIT 15
    `

    const labourRateResult = await sql(labourRateQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get job completion time analysis
    const completionTimeQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600 <= 1 THEN '0-1 hours'
          WHEN EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600 <= 4 THEN '1-4 hours'
          WHEN EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600 <= 8 THEN '4-8 hours'
          WHEN EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600 <= 24 THEN '8-24 hours'
          ELSE '24+ hours'
        END as duration_range,
        COUNT(*) as job_count,
        AVG(EXTRACT(EPOCH FROM (js.updated_at - js.created_at)) / 3600) as avg_hours
      FROM job_sheets js
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND js.updated_at > js.created_at
      GROUP BY duration_range
      ORDER BY avg_hours
    `

    const completionTimeResult = await sql(completionTimeQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get utilization data (if time tracking exists)
    let utilizationData = []
    try {
      const utilizationQuery = `
        SELECT 
          technician_name,
          available_hours,
          worked_hours,
          billable_hours,
          (billable_hours / NULLIF(available_hours, 0)) * 100 as utilization_percentage,
          (worked_hours / NULLIF(available_hours, 0)) * 100 as productivity_percentage
        FROM technician_time_tracking tt
        WHERE tt.date >= $1 AND tt.date <= $2
        ORDER BY utilization_percentage DESC
      `
      utilizationData = await sql(utilizationQuery, [
        currentStart.toISOString(),
        currentEnd.toISOString()
      ])
    } catch (error) {
      console.log('[ANALYTICS-LABOUR] Time tracking table not found, skipping utilization analysis')
    }

    // Calculate summary metrics
    const totalLabourHours = technicianLabourResult.reduce((sum, tech) => sum + parseFloat(tech.labour_hours_sold), 0)
    const totalLabourRevenue = technicianLabourResult.reduce((sum, tech) => sum + parseFloat(tech.labour_revenue), 0)
    const avgLabourRate = totalLabourHours > 0 ? totalLabourRevenue / totalLabourHours : 0
    const avgEfficiency = efficiencyResult.length > 0 
      ? efficiencyResult.reduce((sum, tech) => sum + parseFloat(tech.efficiency_percentage), 0) / efficiencyResult.length 
      : 0

    const labourData = {
      summary: {
        totalHours: totalLabourHours,
        totalRevenue: totalLabourRevenue,
        avgRate: avgLabourRate,
        avgEfficiency: avgEfficiency,
        activeTechnicians: technicianLabourResult.length
      },
      technicians: technicianLabourResult.map(tech => ({
        name: tech.technician,
        jobsCompleted: parseInt(tech.jobs_completed),
        labourHours: parseFloat(tech.labour_hours_sold),
        labourRevenue: parseFloat(tech.labour_revenue),
        avgRate: parseFloat(tech.avg_labour_rate),
        totalRevenue: parseFloat(tech.total_revenue)
      })),
      efficiency: efficiencyResult.map(tech => ({
        name: tech.technician,
        jobsCount: parseInt(tech.jobs_count),
        avgJobDuration: parseFloat(tech.avg_job_duration_hours),
        labourHoursCharged: parseFloat(tech.labour_hours_charged),
        efficiencyPercentage: parseFloat(tech.efficiency_percentage)
      })),
      labourRates: labourRateResult.map(rate => ({
        serviceType: rate.service_type,
        avgRate: parseFloat(rate.avg_rate),
        minRate: parseFloat(rate.min_rate),
        maxRate: parseFloat(rate.max_rate),
        frequency: parseInt(rate.frequency),
        totalHours: parseFloat(rate.total_hours),
        totalRevenue: parseFloat(rate.total_revenue)
      })),
      completionTimes: completionTimeResult.map(time => ({
        durationRange: time.duration_range,
        jobCount: parseInt(time.job_count),
        avgHours: parseFloat(time.avg_hours)
      })),
      utilization: utilizationData.map(util => ({
        technicianName: util.technician_name,
        availableHours: parseFloat(util.available_hours),
        workedHours: parseFloat(util.worked_hours),
        billableHours: parseFloat(util.billable_hours),
        utilizationPercentage: parseFloat(util.utilization_percentage),
        productivityPercentage: parseFloat(util.productivity_percentage)
      }))
    }

    console.log('[ANALYTICS-LABOUR] Labour data calculated')

    return NextResponse.json({
      success: true,
      data: labourData
    })

  } catch (error) {
    console.error('[ANALYTICS-LABOUR] Error fetching labour data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch labour data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
