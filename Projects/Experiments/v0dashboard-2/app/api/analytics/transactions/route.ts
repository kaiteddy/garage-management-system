import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { format } from 'date-fns'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '2025-07-25'
    const endDate = searchParams.get('endDate') || '2025-07-25'
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('[ANALYTICS-TRANSACTIONS] Fetching transaction data for:', startDate, 'to', endDate)

    // Get recent transactions with customer and vehicle details
    const transactions = await sql`
      SELECT 
        cd.id,
        cd.document_number,
        cd.document_type,
        cd.document_date,
        cd.total_gross::numeric as amount,
        cd.total_net::numeric as net_amount,
        cd.total_tax::numeric as tax_amount,
        cd.vehicle_registration,
        cd.status,
        cd.created_at,
        -- Customer details
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unknown Customer') as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        -- Vehicle details
        CASE
          WHEN v.make IS NOT NULL AND v.model IS NOT NULL 
          THEN CONCAT(v.make, ' ', v.model)
          ELSE 'Unknown Vehicle'
        END as vehicle_make_model,
        v.year as vehicle_year
      FROM customer_documents cd
      LEFT JOIN customers c ON cd.customer_id = c.id
      LEFT JOIN vehicles v ON UPPER(cd.vehicle_registration) = UPPER(v.registration)
      WHERE DATE(cd.created_at) = '2025-07-26'::date
        AND cd.document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND cd.total_gross IS NOT NULL
      ORDER BY cd.total_gross::numeric DESC, cd.created_at DESC
      LIMIT ${limit}
    `

    // Get transaction summary by type
    const summaryByType = await sql`
      SELECT 
        document_type,
        COUNT(*) as count,
        SUM(total_gross::numeric) as total_amount,
        AVG(total_gross::numeric) as avg_amount,
        MIN(total_gross::numeric) as min_amount,
        MAX(total_gross::numeric) as max_amount
      FROM customer_documents
      WHERE DATE(created_at) = '2025-07-26'::date
        AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      GROUP BY document_type
      ORDER BY total_amount DESC
    `

    // Get top customers by transaction value
    const topCustomers = await sql`
      SELECT 
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Unknown Customer') as customer_name,
        COUNT(cd.id) as transaction_count,
        SUM(cd.total_gross::numeric) as total_spent,
        AVG(cd.total_gross::numeric) as avg_transaction,
        MAX(cd.total_gross::numeric) as largest_transaction
      FROM customer_documents cd
      LEFT JOIN customers c ON cd.customer_id = c.id
      WHERE DATE(cd.created_at) = '2025-07-26'::date
        AND cd.document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND cd.total_gross IS NOT NULL
        AND cd.customer_id IS NOT NULL
      GROUP BY cd.customer_id, c.first_name, c.last_name
      ORDER BY total_spent DESC
      LIMIT 10
    `

    // Get hourly transaction distribution
    const hourlyDistribution = await sql`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as transaction_count,
        SUM(total_gross::numeric) as total_amount
      FROM customer_documents
      WHERE DATE(created_at) = '2025-07-26'::date
        AND document_type IN ('JS', 'ES', 'SI', 'INVOICE')
        AND total_gross IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `

    // Format the data
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      documentNumber: tx.document_number,
      documentType: tx.document_type,
      date: format(new Date(tx.document_date || tx.created_at), 'MMM dd, yyyy'),
      amount: parseFloat(tx.amount),
      netAmount: parseFloat(tx.net_amount),
      taxAmount: parseFloat(tx.tax_amount),
      vehicleRegistration: tx.vehicle_registration,
      vehicleMakeModel: tx.vehicle_make_model,
      vehicleYear: tx.vehicle_year,
      customerName: tx.customer_name,
      customerPhone: tx.customer_phone,
      customerEmail: tx.customer_email,
      status: tx.status,
      createdAt: tx.created_at
    }))

    const formattedSummary = summaryByType.map(summary => ({
      type: summary.document_type,
      count: parseInt(summary.count),
      totalAmount: parseFloat(summary.total_amount),
      avgAmount: parseFloat(summary.avg_amount),
      minAmount: parseFloat(summary.min_amount),
      maxAmount: parseFloat(summary.max_amount)
    }))

    const formattedTopCustomers = topCustomers.map(customer => ({
      name: customer.customer_name,
      transactionCount: parseInt(customer.transaction_count),
      totalSpent: parseFloat(customer.total_spent),
      avgTransaction: parseFloat(customer.avg_transaction),
      largestTransaction: parseFloat(customer.largest_transaction)
    }))

    const formattedHourlyDistribution = hourlyDistribution.map(hour => ({
      hour: parseInt(hour.hour),
      transactionCount: parseInt(hour.transaction_count),
      totalAmount: parseFloat(hour.total_amount)
    }))

    const transactionData = {
      transactions: formattedTransactions,
      summary: {
        totalTransactions: formattedTransactions.length,
        totalAmount: formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        avgTransaction: formattedTransactions.length > 0 
          ? formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0) / formattedTransactions.length 
          : 0,
        dateRange: `${startDate} to ${endDate}`
      },
      summaryByType: formattedSummary,
      topCustomers: formattedTopCustomers,
      hourlyDistribution: formattedHourlyDistribution
    }

    console.log('[ANALYTICS-TRANSACTIONS] Transaction data calculated')

    return NextResponse.json({
      success: true,
      data: transactionData
    })

  } catch (error) {
    console.error('[ANALYTICS-TRANSACTIONS] Error fetching transaction data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transaction data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
