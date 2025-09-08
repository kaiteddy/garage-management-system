import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    
    // Calculate date range
    const days = parseInt(range.replace('d', ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const client = await pool.connect()
    
    try {
      // Get total spend and monthly spend
      const totalSpendQuery = `
        SELECT 
          SUM(cost_amount) as total_spend,
          SUM(CASE WHEN request_timestamp >= DATE_TRUNC('month', CURRENT_DATE) THEN cost_amount ELSE 0 END) as monthly_spend
        FROM api_usage_log 
        WHERE request_timestamp >= $1
      `
      const totalSpendResult = await client.query(totalSpendQuery, [startDate])
      const { total_spend = 0, monthly_spend = 0 } = totalSpendResult.rows[0] || {}
      
      // Get budget information
      const budgetQuery = `
        SELECT 
          api_provider,
          monthly_budget_limit,
          current_month_spend,
          (current_month_spend / monthly_budget_limit * 100) as percentage_used
        FROM api_budgets 
        WHERE is_active = true AND budget_month = DATE_TRUNC('month', CURRENT_DATE)
      `
      const budgetResult = await client.query(budgetQuery)
      
      const budgetStatus = budgetResult.rows.map(row => ({
        provider: row.api_provider,
        spent: parseFloat(row.current_month_spend || 0),
        budget: parseFloat(row.monthly_budget_limit),
        percentage: parseFloat(row.percentage_used || 0),
        status: row.percentage_used >= 90 ? 'danger' : row.percentage_used >= 75 ? 'warning' : 'safe'
      }))
      
      const totalBudget = budgetStatus.reduce((sum, b) => sum + b.budget, 0)
      const budgetUsed = totalBudget > 0 ? (monthly_spend / totalBudget * 100) : 0
      
      // Get top APIs by cost
      const topAPIsQuery = `
        SELECT 
          api_provider,
          SUM(cost_amount) as total_cost,
          COUNT(*) as request_count,
          AVG(cost_amount) as avg_cost
        FROM api_usage_log 
        WHERE request_timestamp >= $1
        GROUP BY api_provider
        ORDER BY total_cost DESC
      `
      const topAPIsResult = await client.query(topAPIsQuery, [startDate])
      
      const topAPIs = topAPIsResult.rows.map(row => ({
        provider: row.api_provider,
        cost: parseFloat(row.total_cost || 0),
        requests: parseInt(row.request_count || 0),
        avgCost: parseFloat(row.avg_cost || 0)
      }))
      
      // Get daily spending trends
      const dailySpendQuery = `
        SELECT 
          DATE(request_timestamp) as date,
          SUM(CASE WHEN api_provider = 'VDG' THEN cost_amount ELSE 0 END) as vdg,
          SUM(CASE WHEN api_provider = 'SWS' THEN cost_amount ELSE 0 END) as sws,
          SUM(cost_amount) as total
        FROM api_usage_log 
        WHERE request_timestamp >= $1
        GROUP BY DATE(request_timestamp)
        ORDER BY date
      `
      const dailySpendResult = await client.query(dailySpendQuery, [startDate])
      
      const dailySpend = dailySpendResult.rows.map(row => ({
        date: row.date,
        vdg: parseFloat(row.vdg || 0),
        sws: parseFloat(row.sws || 0),
        total: parseFloat(row.total || 0)
      }))
      
      // Get cache efficiency
      const cacheQuery = `
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN cached_hit = true THEN 1 ELSE 0 END) as cache_hits,
          SUM(CASE WHEN cached_hit = false THEN 1 ELSE 0 END) as cache_misses,
          SUM(CASE WHEN cached_hit = true THEN cost_amount ELSE 0 END) as cost_saved
        FROM api_usage_log 
        WHERE request_timestamp >= $1
      `
      const cacheResult = await client.query(cacheQuery, [startDate])
      const cacheData = cacheResult.rows[0] || {}
      
      const cacheEfficiency = {
        totalRequests: parseInt(cacheData.total_requests || 0),
        cacheHits: parseInt(cacheData.cache_hits || 0),
        cacheMisses: parseInt(cacheData.cache_misses || 0),
        costSaved: parseFloat(cacheData.cost_saved || 0)
      }
      
      // Get cost breakdown for pie chart
      const costBreakdown = topAPIs.map((api, index) => ({
        provider: api.provider,
        value: api.cost,
        color: getProviderColor(api.provider)
      }))
      
      const responseData = {
        totalSpend: parseFloat(total_spend || 0),
        monthlySpend: parseFloat(monthly_spend || 0),
        budgetUsed: budgetUsed,
        budgetLimit: totalBudget,
        topAPIs,
        dailySpend,
        budgetStatus,
        cacheEfficiency,
        costBreakdown
      }
      
      return NextResponse.json(responseData)
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error fetching cost analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost analytics' },
      { status: 500 }
    )
  }
}

function getProviderColor(provider: string): string {
  const colors: { [key: string]: string } = {
    'VDG': '#8884d8',
    'SWS': '#82ca9d',
    'DVLA': '#ffc658',
    'MOT': '#ff7300',
    'default': '#8dd1e1'
  }
  return colors[provider] || colors.default
}

// POST endpoint to update budget limits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, budgetLimit } = body
    
    if (!provider || !budgetLimit) {
      return NextResponse.json(
        { error: 'Provider and budget limit are required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    
    try {
      const currentMonth = new Date()
      currentMonth.setDate(1) // First day of current month
      
      await client.query(`
        INSERT INTO api_budgets (budget_name, api_provider, monthly_budget_limit, budget_month)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (api_provider, budget_month) 
        DO UPDATE SET 
          monthly_budget_limit = $3,
          updated_at = NOW()
      `, [`${provider} Monthly Budget`, provider, budgetLimit, currentMonth])
      
      return NextResponse.json({ success: true })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}
