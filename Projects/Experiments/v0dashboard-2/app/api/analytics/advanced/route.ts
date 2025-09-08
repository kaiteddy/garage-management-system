import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { subDays, subWeeks, subMonths, subYears, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const comparisonType = searchParams.get('comparison') || 'mom' // wow, mom, yoy, custom
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    console.log('[ANALYTICS-ADVANCED] Fetching advanced analytics for comparison:', comparisonType)

    // Use July 26, 2025 as our reference date (where the data exists)
    const referenceDate = new Date('2025-07-26')

    // Calculate comparison periods based on type
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date
    let comparisonLabel = ''

    if (comparisonType === 'custom' && customStartDate && customEndDate) {
      // Custom date range
      currentStart = new Date(customStartDate)
      currentEnd = new Date(customEndDate)

      // Calculate previous period of same length
      const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))
      previousStart = subDays(currentStart, daysDiff + 1)
      previousEnd = subDays(currentEnd, daysDiff + 1)

      comparisonLabel = `Custom Range (${daysDiff + 1} days)`
    } else {
      // Predefined periods
      switch (comparisonType) {
        case 'wow': // Week over Week
          currentStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
          currentEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
          previousStart = startOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 })
          previousEnd = endOfWeek(subWeeks(referenceDate, 1), { weekStartsOn: 1 })
          comparisonLabel = 'Week over Week'
          break
        case 'yoy': // Year over Year
          currentStart = startOfYear(referenceDate)
          currentEnd = endOfYear(referenceDate)
          previousStart = startOfYear(subYears(referenceDate, 1))
          previousEnd = endOfYear(subYears(referenceDate, 1))
          comparisonLabel = 'Year over Year'
          break
        case 'mom': // Month over Month
        default:
          currentStart = startOfMonth(referenceDate)
          currentEnd = endOfMonth(referenceDate)
          previousStart = startOfMonth(subMonths(referenceDate, 1))
          previousEnd = endOfMonth(subMonths(referenceDate, 1))
          comparisonLabel = 'Month over Month'
          break
      }
    }

    // Get comprehensive revenue analysis
    const revenueAnalysis = await sql`
      WITH current_period AS (
        SELECT 
          COUNT(*) as transactions,
          SUM(total_gross::numeric) as revenue,
          AVG(total_gross::numeric) as avg_transaction,
          COUNT(DISTINCT customer_id) as unique_customers,
          COUNT(DISTINCT vehicle_registration) as unique_vehicles,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM customer_documents
        WHERE DATE(created_at) >= ${currentStart.toISOString().split('T')[0]}::date
          AND DATE(created_at) <= ${currentEnd.toISOString().split('T')[0]}::date
          AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
          AND total_gross IS NOT NULL
      ),
      previous_period AS (
        SELECT 
          COUNT(*) as transactions,
          SUM(total_gross::numeric) as revenue,
          AVG(total_gross::numeric) as avg_transaction,
          COUNT(DISTINCT customer_id) as unique_customers,
          COUNT(DISTINCT vehicle_registration) as unique_vehicles,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM customer_documents
        WHERE DATE(created_at) >= ${previousStart.toISOString().split('T')[0]}::date
          AND DATE(created_at) <= ${previousEnd.toISOString().split('T')[0]}::date
          AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
          AND total_gross IS NOT NULL
      )
      SELECT 
        'current' as period,
        transactions, revenue, avg_transaction, unique_customers, unique_vehicles, active_days
      FROM current_period
      UNION ALL
      SELECT 
        'previous' as period,
        transactions, revenue, avg_transaction, unique_customers, unique_vehicles, active_days
      FROM previous_period
    `

    // Get daily trend analysis for the current period
    const dailyTrends = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(total_gross::numeric) as revenue,
        AVG(total_gross::numeric) as avg_transaction,
        COUNT(DISTINCT customer_id) as unique_customers,
        -- Day of week analysis
        EXTRACT(DOW FROM created_at) as day_of_week,
        TO_CHAR(created_at, 'Day') as day_name
      FROM customer_documents
      WHERE DATE(created_at) >= ${currentStart.toISOString().split('T')[0]}::date
        AND DATE(created_at) <= ${currentEnd.toISOString().split('T')[0]}::date
        AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
      ORDER BY DATE(created_at)
    `

    // Get customer behavior analysis
    const customerAnalysis = await sql`
      WITH customer_metrics AS (
        SELECT 
          cd.customer_id,
          COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unknown') as customer_name,
          COUNT(*) as transaction_count,
          SUM(cd.total_gross::numeric) as total_spent,
          AVG(cd.total_gross::numeric) as avg_transaction,
          MIN(cd.created_at) as first_transaction,
          MAX(cd.created_at) as last_transaction,
          COUNT(DISTINCT cd.vehicle_registration) as vehicles_serviced
        FROM customer_documents cd
        LEFT JOIN customers c ON cd.customer_id = c.id
        WHERE DATE(cd.created_at) >= ${currentStart.toISOString().split('T')[0]}::date
          AND DATE(cd.created_at) <= ${currentEnd.toISOString().split('T')[0]}::date
          AND cd.document_type IN ('JS', 'ES', 'SI', 'INVOICE')
          AND cd.total_gross IS NOT NULL
          AND cd.customer_id IS NOT NULL
        GROUP BY cd.customer_id, c.first_name, c.last_name
      )
      SELECT 
        customer_name,
        transaction_count,
        total_spent,
        avg_transaction,
        vehicles_serviced,
        CASE 
          WHEN transaction_count >= 5 THEN 'High Frequency'
          WHEN transaction_count >= 2 THEN 'Regular'
          ELSE 'One-time'
        END as customer_segment,
        CASE 
          WHEN total_spent >= 5000 THEN 'Premium'
          WHEN total_spent >= 1000 THEN 'Standard'
          ELSE 'Budget'
        END as value_segment
      FROM customer_metrics
      ORDER BY total_spent DESC
      LIMIT 20
    `

    // Get document type performance
    const documentTypeAnalysis = await sql`
      SELECT 
        document_type,
        COUNT(*) as count,
        SUM(total_gross::numeric) as revenue,
        AVG(total_gross::numeric) as avg_value,
        MIN(total_gross::numeric) as min_value,
        MAX(total_gross::numeric) as max_value,
        STDDEV(total_gross::numeric) as value_stddev
      FROM customer_documents
      WHERE DATE(created_at) >= ${currentStart.toISOString().split('T')[0]}::date
        AND DATE(created_at) <= ${currentEnd.toISOString().split('T')[0]}::date
        AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      GROUP BY document_type
      ORDER BY revenue DESC
    `

    // Get hourly performance patterns
    const hourlyPatterns = await sql`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as transactions,
        SUM(total_gross::numeric) as revenue,
        AVG(total_gross::numeric) as avg_transaction
      FROM customer_documents
      WHERE DATE(created_at) >= ${currentStart.toISOString().split('T')[0]}::date
        AND DATE(created_at) <= ${currentEnd.toISOString().split('T')[0]}::date
        AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `

    // Process the data
    const currentPeriod = revenueAnalysis.find(r => r.period === 'current')
    const previousPeriod = revenueAnalysis.find(r => r.period === 'previous')

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    // Generate AI insights based on the data
    const insights = []
    
    if (currentPeriod && previousPeriod) {
      const revenueChange = calculateChange(parseFloat(currentPeriod.revenue), parseFloat(previousPeriod.revenue))
      const transactionChange = calculateChange(parseInt(currentPeriod.transactions), parseInt(previousPeriod.transactions))
      const avgTransactionChange = calculateChange(parseFloat(currentPeriod.avg_transaction), parseFloat(previousPeriod.avg_transaction))
      
      if (revenueChange > 10) {
        insights.push(`🚀 Excellent revenue growth of ${revenueChange.toFixed(1)}% ${comparisonLabel.toLowerCase()}`)
      } else if (revenueChange < -10) {
        insights.push(`⚠️ Revenue declined by ${Math.abs(revenueChange).toFixed(1)}% ${comparisonLabel.toLowerCase()}`)
      }
      
      if (avgTransactionChange > 5) {
        insights.push(`💰 Average transaction value increased by ${avgTransactionChange.toFixed(1)}%`)
      }
      
      if (transactionChange > revenueChange + 5) {
        insights.push(`📈 Transaction volume growing faster than revenue - consider pricing optimization`)
      }
    }

    // Analyze peak performance times
    const peakHour = hourlyPatterns.reduce((max, hour) => 
      parseFloat(hour.revenue) > parseFloat(max.revenue) ? hour : max, hourlyPatterns[0])
    
    if (peakHour) {
      insights.push(`⏰ Peak performance at ${peakHour.hour}:00 with £${parseFloat(peakHour.revenue).toLocaleString()} revenue`)
    }

    // Analyze customer segments
    const premiumCustomers = customerAnalysis.filter(c => c.value_segment === 'Premium').length
    const totalCustomers = customerAnalysis.length
    
    if (premiumCustomers > 0) {
      const premiumPercentage = (premiumCustomers / totalCustomers) * 100
      insights.push(`👑 ${premiumPercentage.toFixed(1)}% of customers are premium (£5000+ spend)`)
    }

    const advancedData = {
      comparison: {
        type: comparisonType,
        label: comparisonLabel,
        current: {
          period: `${format(currentStart, 'MMM dd')} - ${format(currentEnd, 'MMM dd, yyyy')}`,
          transactions: parseInt(currentPeriod?.transactions || '0'),
          revenue: parseFloat(currentPeriod?.revenue || '0'),
          avgTransaction: parseFloat(currentPeriod?.avg_transaction || '0'),
          uniqueCustomers: parseInt(currentPeriod?.unique_customers || '0'),
          uniqueVehicles: parseInt(currentPeriod?.unique_vehicles || '0'),
          activeDays: parseInt(currentPeriod?.active_days || '0')
        },
        previous: {
          period: `${format(previousStart, 'MMM dd')} - ${format(previousEnd, 'MMM dd, yyyy')}`,
          transactions: parseInt(previousPeriod?.transactions || '0'),
          revenue: parseFloat(previousPeriod?.revenue || '0'),
          avgTransaction: parseFloat(previousPeriod?.avg_transaction || '0'),
          uniqueCustomers: parseInt(previousPeriod?.unique_customers || '0'),
          uniqueVehicles: parseInt(previousPeriod?.unique_vehicles || '0'),
          activeDays: parseInt(previousPeriod?.active_days || '0')
        }
      },
      dailyTrends: dailyTrends.map(day => ({
        date: format(new Date(day.date), 'MMM dd'),
        dayName: day.day_name.trim(),
        dayOfWeek: parseInt(day.day_of_week),
        transactions: parseInt(day.transactions),
        revenue: parseFloat(day.revenue),
        avgTransaction: parseFloat(day.avg_transaction),
        uniqueCustomers: parseInt(day.unique_customers)
      })),
      customerAnalysis: customerAnalysis.map(customer => ({
        name: customer.customer_name,
        transactionCount: parseInt(customer.transaction_count),
        totalSpent: parseFloat(customer.total_spent),
        avgTransaction: parseFloat(customer.avg_transaction),
        vehiclesServiced: parseInt(customer.vehicles_serviced),
        customerSegment: customer.customer_segment,
        valueSegment: customer.value_segment
      })),
      documentTypeAnalysis: documentTypeAnalysis.map(doc => ({
        type: doc.document_type,
        count: parseInt(doc.count),
        revenue: parseFloat(doc.revenue),
        avgValue: parseFloat(doc.avg_value),
        minValue: parseFloat(doc.min_value),
        maxValue: parseFloat(doc.max_value),
        valueStddev: parseFloat(doc.value_stddev || '0')
      })),
      hourlyPatterns: hourlyPatterns.map(hour => ({
        hour: parseInt(hour.hour),
        transactions: parseInt(hour.transactions),
        revenue: parseFloat(hour.revenue),
        avgTransaction: parseFloat(hour.avg_transaction)
      })),
      insights
    }

    console.log('[ANALYTICS-ADVANCED] Advanced analytics calculated')

    return NextResponse.json({
      success: true,
      data: advancedData
    })

  } catch (error) {
    console.error('[ANALYTICS-ADVANCED] Error fetching advanced analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch advanced analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
