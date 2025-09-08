import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('[ANALYTICS-REVENUE] Fetching revenue data for period:', period)

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

    // Get daily revenue trend for the period
    const trendQuery = `
      SELECT 
        DATE(js.created_at) as date,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue,
        COUNT(DISTINCT js.id) as jobs,
        COUNT(DISTINCT js.customer) as customers
      FROM job_sheets js
      LEFT JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2
      GROUP BY DATE(js.created_at)
      ORDER BY DATE(js.created_at)
    `

    const trendResult = await sql`
      SELECT
        DATE(cd.created_at) as date,
        COALESCE(SUM(cd.total_gross::numeric), 0) as revenue,
        COUNT(DISTINCT cd.id) as jobs,
        COUNT(DISTINCT cd.customer_id) as customers
      FROM customer_documents cd
      WHERE cd.created_at >= ${currentStart.toISOString()} AND cd.created_at <= ${currentEnd.toISOString()}
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
      GROUP BY DATE(cd.created_at)
      ORDER BY DATE(cd.created_at)
    `

    // Get revenue breakdown by service type
    const breakdownQuery = `
      SELECT 
        jsi.type,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue,
        COUNT(*) as count,
        AVG(jsi.net_price * jsi.qty) as avg_value
      FROM job_sheet_items jsi
      JOIN job_sheets js ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2
      GROUP BY jsi.type
      ORDER BY revenue DESC
    `

    const breakdownResult = await sql`
      SELECT
        cd.document_type as type,
        COALESCE(SUM(cd.total_gross::numeric), 0) as revenue,
        COUNT(*) as count,
        AVG(cd.total_gross::numeric) as avg_value
      FROM customer_documents cd
      WHERE cd.created_at >= ${currentStart.toISOString()} AND cd.created_at <= ${currentEnd.toISOString()}
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
      GROUP BY cd.document_type
      ORDER BY revenue DESC
    `

    // Get revenue by technician
    const technicianQuery = `
      SELECT 
        js.technician,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue,
        COUNT(DISTINCT js.id) as jobs,
        AVG(jsi.net_price * jsi.qty) as avg_job_value
      FROM job_sheets js
      LEFT JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND js.technician IS NOT NULL 
        AND js.technician != ''
      GROUP BY js.technician
      ORDER BY revenue DESC
    `

    const technicianResult = await sql`
      SELECT
        COALESCE(cd.department, 'General') as technician,
        COALESCE(SUM(cd.total_gross::numeric), 0) as revenue,
        COUNT(DISTINCT cd.id) as jobs,
        AVG(cd.total_gross::numeric) as avg_job_value
      FROM customer_documents cd
      WHERE cd.created_at >= ${currentStart.toISOString()} AND cd.created_at <= ${currentEnd.toISOString()}
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
      GROUP BY cd.department
      ORDER BY revenue DESC
    `

    // Get top customers by revenue
    const topCustomersQuery = `
      SELECT 
        js.customer,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue,
        COUNT(DISTINCT js.id) as jobs,
        AVG(jsi.net_price * jsi.qty) as avg_spend
      FROM job_sheets js
      LEFT JOIN job_sheet_items jsi ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND js.customer IS NOT NULL 
        AND js.customer != ''
      GROUP BY js.customer
      ORDER BY revenue DESC
      LIMIT 10
    `

    const topCustomersResult = await sql`
      SELECT
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unknown Customer') as customer,
        COALESCE(SUM(cd.total_gross::numeric), 0) as revenue,
        COUNT(DISTINCT cd.id) as jobs,
        AVG(cd.total_gross::numeric) as avg_spend
      FROM customer_documents cd
      LEFT JOIN customers c ON cd.customer_id = c.id
      WHERE cd.created_at >= ${currentStart.toISOString()} AND cd.created_at <= ${currentEnd.toISOString()}
        AND cd.customer_id IS NOT NULL
        AND cd.document_type IN ('JS', 'ES', 'ESTIMATE', 'INVOICE', 'SI')
      GROUP BY cd.customer_id, c.first_name, c.last_name
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Get payment method distribution (if payment data exists)
    let paymentMethods = []
    try {
      const paymentQuery = `
        SELECT 
          payment_method,
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM payments p
        JOIN job_sheets js ON js.id = p.job_sheet_id
        WHERE js.created_at >= $1 AND js.created_at <= $2
        GROUP BY payment_method
        ORDER BY total DESC
      `
      paymentMethods = await sql`
        SELECT
          r.payment_method,
          COALESCE(SUM(r.amount::numeric), 0) as total,
          COUNT(*) as count
        FROM receipts r
        JOIN documents d ON d.id = r.document_id
        WHERE d.doc_date >= ${currentStart.toISOString().split('T')[0]} AND d.doc_date <= ${currentEnd.toISOString().split('T')[0]}
        GROUP BY r.payment_method
        ORDER BY total DESC
      `
    } catch (error) {
      console.log('[ANALYTICS-REVENUE] Payment table not found, skipping payment method analysis')
    }

    // Calculate totals
    const totalRevenue = trendResult.reduce((sum, day) => sum + parseFloat(day.revenue), 0)
    const totalJobs = trendResult.reduce((sum, day) => sum + parseInt(day.jobs), 0)
    const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0

    // Format trend data for charts
    const formattedTrend = trendResult.map(day => ({
      date: format(new Date(day.date), 'MMM dd'),
      revenue: parseFloat(day.revenue),
      jobs: parseInt(day.jobs),
      customers: parseInt(day.customers)
    }))

    const revenueData = {
      summary: {
        totalRevenue,
        totalJobs,
        avgJobValue,
        period: format(currentStart, 'MMM dd') + ' - ' + format(currentEnd, 'MMM dd')
      },
      trend: formattedTrend,
      breakdown: breakdownResult.map(item => ({
        type: item.type || 'Unknown',
        revenue: parseFloat(item.revenue),
        count: parseInt(item.count),
        avgValue: parseFloat(item.avg_value)
      })),
      technicians: technicianResult.map(tech => ({
        name: tech.technician || 'Unassigned',
        revenue: parseFloat(tech.revenue),
        jobs: parseInt(tech.jobs),
        avgJobValue: parseFloat(tech.avg_job_value)
      })),
      topCustomers: topCustomersResult.map(customer => ({
        name: customer.customer,
        revenue: parseFloat(customer.revenue),
        jobs: parseInt(customer.jobs),
        avgSpend: parseFloat(customer.avg_spend)
      })),
      paymentMethods: paymentMethods.map(payment => ({
        method: payment.payment_method,
        total: parseFloat(payment.total),
        count: parseInt(payment.count)
      }))
    }

    console.log('[ANALYTICS-REVENUE] Revenue data calculated')

    return NextResponse.json({
      success: true,
      data: revenueData
    })

  } catch (error) {
    console.error('[ANALYTICS-REVENUE] Error fetching revenue data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch revenue data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
