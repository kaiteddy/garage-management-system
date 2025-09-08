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

    console.log('[ANALYTICS-PARTS] Fetching parts data for period:', period)

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

    // Get most frequently used parts
    const frequentPartsQuery = `
      SELECT 
        jsi.description as part_name,
        jsi.part_number,
        SUM(jsi.qty) as total_quantity,
        COUNT(DISTINCT jsi.job_sheet_id) as jobs_used,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as total_revenue,
        AVG(jsi.net_price) as avg_price
      FROM job_sheet_items jsi
      JOIN job_sheets js ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND jsi.type = 'Parts'
        AND jsi.description IS NOT NULL 
        AND jsi.description != ''
      GROUP BY jsi.description, jsi.part_number
      ORDER BY total_quantity DESC
      LIMIT 20
    `

    const frequentPartsResult = await sql(frequentPartsQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get parts revenue contribution
    const revenueContributionQuery = `
      SELECT 
        jsi.description as part_name,
        COALESCE(SUM(jsi.net_price * jsi.qty), 0) as revenue,
        SUM(jsi.qty) as quantity,
        COUNT(DISTINCT jsi.job_sheet_id) as jobs
      FROM job_sheet_items jsi
      JOIN job_sheets js ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND jsi.type = 'Parts'
        AND jsi.description IS NOT NULL 
        AND jsi.description != ''
      GROUP BY jsi.description
      ORDER BY revenue DESC
      LIMIT 15
    `

    const revenueContributionResult = await sql(revenueContributionQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get parts markup analysis
    const markupAnalysisQuery = `
      SELECT 
        jsi.description as part_name,
        jsi.part_number,
        AVG(jsi.net_price) as avg_sell_price,
        AVG(jsi.cost_price) as avg_cost_price,
        CASE 
          WHEN AVG(jsi.cost_price) > 0 THEN 
            ((AVG(jsi.net_price) - AVG(jsi.cost_price)) / AVG(jsi.cost_price)) * 100
          ELSE 0 
        END as markup_percentage,
        SUM(jsi.qty) as total_sold,
        COALESCE(SUM((jsi.net_price - jsi.cost_price) * jsi.qty), 0) as total_profit
      FROM job_sheet_items jsi
      JOIN job_sheets js ON js.id = jsi.job_sheet_id
      WHERE js.created_at >= $1 AND js.created_at <= $2 
        AND jsi.type = 'Parts'
        AND jsi.cost_price IS NOT NULL 
        AND jsi.cost_price > 0
        AND jsi.description IS NOT NULL 
        AND jsi.description != ''
      GROUP BY jsi.description, jsi.part_number
      ORDER BY total_profit DESC
      LIMIT 15
    `

    const markupAnalysisResult = await sql(markupAnalysisQuery, [
      currentStart.toISOString(),
      currentEnd.toISOString()
    ])

    // Get low stock alerts (if inventory table exists)
    let lowStockItems = []
    try {
      const lowStockQuery = `
        SELECT 
          part_name,
          part_number,
          current_stock,
          min_stock_level,
          supplier,
          last_order_date,
          avg_monthly_usage
        FROM parts_inventory 
        WHERE current_stock <= min_stock_level
        ORDER BY (current_stock / NULLIF(min_stock_level, 0)) ASC
        LIMIT 10
      `
      lowStockItems = await sql(lowStockQuery)
    } catch (error) {
      console.log('[ANALYTICS-PARTS] Parts inventory table not found, skipping low stock analysis')
    }

    // Get supplier performance (if supplier data exists)
    let supplierPerformance = []
    try {
      const supplierQuery = `
        SELECT 
          supplier,
          COUNT(*) as orders_count,
          AVG(delivery_days) as avg_delivery_days,
          SUM(order_value) as total_value,
          AVG(order_value) as avg_order_value,
          COUNT(CASE WHEN delivery_days <= promised_delivery THEN 1 END) * 100.0 / COUNT(*) as on_time_percentage
        FROM parts_orders po
        WHERE po.order_date >= $1 AND po.order_date <= $2
        GROUP BY supplier
        ORDER BY total_value DESC
        LIMIT 10
      `
      supplierPerformance = await sql(supplierQuery, [
        currentStart.toISOString(),
        currentEnd.toISOString()
      ])
    } catch (error) {
      console.log('[ANALYTICS-PARTS] Parts orders table not found, skipping supplier analysis')
    }

    // Calculate summary metrics
    const totalPartsRevenue = revenueContributionResult.reduce((sum, part) => sum + parseFloat(part.revenue), 0)
    const totalPartsQuantity = frequentPartsResult.reduce((sum, part) => sum + parseInt(part.total_quantity), 0)
    const avgMarkup = markupAnalysisResult.length > 0 
      ? markupAnalysisResult.reduce((sum, part) => sum + parseFloat(part.markup_percentage), 0) / markupAnalysisResult.length 
      : 0

    const partsData = {
      summary: {
        totalRevenue: totalPartsRevenue,
        totalQuantity: totalPartsQuantity,
        avgMarkup: avgMarkup,
        uniqueParts: frequentPartsResult.length,
        lowStockCount: lowStockItems.length
      },
      frequentParts: frequentPartsResult.map(part => ({
        name: part.part_name,
        partNumber: part.part_number,
        quantity: parseInt(part.total_quantity),
        jobsUsed: parseInt(part.jobs_used),
        revenue: parseFloat(part.total_revenue),
        avgPrice: parseFloat(part.avg_price)
      })),
      revenueContribution: revenueContributionResult.map(part => ({
        name: part.part_name,
        revenue: parseFloat(part.revenue),
        quantity: parseInt(part.quantity),
        jobs: parseInt(part.jobs)
      })),
      markupAnalysis: markupAnalysisResult.map(part => ({
        name: part.part_name,
        partNumber: part.part_number,
        sellPrice: parseFloat(part.avg_sell_price),
        costPrice: parseFloat(part.avg_cost_price),
        markupPercentage: parseFloat(part.markup_percentage),
        totalSold: parseInt(part.total_sold),
        totalProfit: parseFloat(part.total_profit)
      })),
      lowStock: lowStockItems.map(item => ({
        name: item.part_name,
        partNumber: item.part_number,
        currentStock: parseInt(item.current_stock),
        minLevel: parseInt(item.min_stock_level),
        supplier: item.supplier,
        lastOrderDate: item.last_order_date,
        avgMonthlyUsage: parseFloat(item.avg_monthly_usage)
      })),
      suppliers: supplierPerformance.map(supplier => ({
        name: supplier.supplier,
        ordersCount: parseInt(supplier.orders_count),
        avgDeliveryDays: parseFloat(supplier.avg_delivery_days),
        totalValue: parseFloat(supplier.total_value),
        avgOrderValue: parseFloat(supplier.avg_order_value),
        onTimePercentage: parseFloat(supplier.on_time_percentage)
      }))
    }

    console.log('[ANALYTICS-PARTS] Parts data calculated')

    return NextResponse.json({
      success: true,
      data: partsData
    })

  } catch (error) {
    console.error('[ANALYTICS-PARTS] Error fetching parts data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch parts data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
