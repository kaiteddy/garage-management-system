import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Interface for tyre pricing data
export interface TyrePricingData {
  size: string
  width: number
  profile: number
  diameter: number
  description: string
  averagePrice: number
  minPrice: number
  maxPrice: number
  priceRange: number
  salesCount: number
  totalQuantity: number
  lastSold: string
  priceHistory: TyrePriceHistory[]
  priceStability: 'stable' | 'volatile' | 'trending_up' | 'trending_down'
  recommendedPrice: number
  profitMargin?: number
}

export interface TyrePriceHistory {
  price: number
  date: string
  quantity: number
  customerType: string
  vehicleRegistration?: string
  jobSheetNumber?: string
}

export interface TyreSizeAnalysis {
  totalSizes: number
  mostPopularSize: string
  highestValueSize: string
  averagePriceAcrossAllSizes: number
  totalTyreRevenue: number
  totalTyresSold: number
  sizeDistribution: { size: string; count: number; percentage: number }[]
}

// Regex patterns for tyre size extraction
const TYRE_SIZE_PATTERNS = [
  // Standard format: 205/55R16, 225/45R17, etc.
  /(\d{3})\/(\d{2})R(\d{2})/i,
  // Alternative format: 205/55-16, 225/45-17
  /(\d{3})\/(\d{2})-(\d{2})/i,
  // With additional specs: 205/55R16 91V, 225/45R17 94W
  /(\d{3})\/(\d{2})R(\d{2})\s*\d{2}[A-Z]/i,
  // Space separated: 205 55 R16
  /(\d{3})\s+(\d{2})\s+R(\d{2})/i
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'analysis'
    const size = searchParams.get('size')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log(`🛞 [TYRE-PRICING] Action: ${action}, Size: ${size}`)

    switch (action) {
      case 'analysis':
        return await getTyreAnalysis(dateFrom, dateTo, limit)
      case 'size-specific':
        if (!size) {
          return NextResponse.json({
            success: false,
            error: "Size parameter required for size-specific analysis"
          }, { status: 400 })
        }
        return await getSizeSpecificAnalysis(size, dateFrom, dateTo)
      case 'popular-sizes':
        return await getPopularSizes(limit)
      case 'price-trends':
        return await getPriceTrends(size, dateFrom, dateTo)
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action. Use: analysis, size-specific, popular-sizes, or price-trends"
        }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ [TYRE-PRICING] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Main tyre analysis function
async function getTyreAnalysis(dateFrom?: string | null, dateTo?: string | null, limit: number = 50) {
  console.log("🔍 [TYRE-PRICING] Analyzing tyre pricing data...")

  // Get all tyre-related line items
  let query = `
    SELECT 
      li.description,
      li.quantity,
      li.unit_price,
      li.total_amount,
      li.created_at,
      d.document_number,
      d.vehicle_registration,
      c.name as customer_name
    FROM line_items li
    LEFT JOIN documents d ON li.document_id = d.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE (
      LOWER(li.description) LIKE '%tyre%' 
      OR LOWER(li.description) LIKE '%tire%'
      OR li.description ~ '\\d{3}/\\d{2}R\\d{2}'
      OR li.description ~ '\\d{3}/\\d{2}-\\d{2}'
    )
    AND li.unit_price > 0
    AND li.quantity > 0
  `

  const params: any[] = []
  let paramIndex = 1

  if (dateFrom) {
    query += ` AND li.created_at >= $${paramIndex++}`
    params.push(dateFrom)
  }

  if (dateTo) {
    query += ` AND li.created_at <= $${paramIndex++}`
    params.push(dateTo)
  }

  query += ` ORDER BY li.created_at DESC LIMIT $${paramIndex}`
  params.push(limit * 10) // Get more data for analysis

  const tyreData = await sql.unsafe(query, params)

  // Process and categorize tyre data
  const tyreSizeMap = new Map<string, TyrePricingData>()
  let totalRevenue = 0
  let totalQuantity = 0

  tyreData.forEach((item: any) => {
    const extractedSize = extractTyreSize(item.description)
    if (!extractedSize) return

    const { size, width, profile, diameter } = extractedSize
    const price = parseFloat(item.unit_price) || 0
    const quantity = parseFloat(item.quantity) || 0
    const totalAmount = parseFloat(item.total_amount) || 0

    totalRevenue += totalAmount
    totalQuantity += quantity

    if (!tyreSizeMap.has(size)) {
      tyreSizeMap.set(size, {
        size,
        width,
        profile,
        diameter,
        description: item.description,
        averagePrice: 0,
        minPrice: price,
        maxPrice: price,
        priceRange: 0,
        salesCount: 0,
        totalQuantity: 0,
        lastSold: item.created_at,
        priceHistory: [],
        priceStability: 'stable',
        recommendedPrice: 0
      })
    }

    const tyreData = tyreSizeMap.get(size)!
    tyreData.salesCount += 1
    tyreData.totalQuantity += quantity
    tyreData.minPrice = Math.min(tyreData.minPrice, price)
    tyreData.maxPrice = Math.max(tyreData.maxPrice, price)
    
    if (new Date(item.created_at) > new Date(tyreData.lastSold)) {
      tyreData.lastSold = item.created_at
    }

    // Add to price history
    tyreData.priceHistory.push({
      price,
      date: item.created_at,
      quantity,
      customerType: 'retail', // Default, could be enhanced
      vehicleRegistration: item.vehicle_registration,
      jobSheetNumber: item.document_number
    })
  })

  // Calculate analytics for each size
  const processedTyres: TyrePricingData[] = []
  tyreSizeMap.forEach((tyreData) => {
    // Calculate average price
    const totalValue = tyreData.priceHistory.reduce((sum, h) => sum + (h.price * h.quantity), 0)
    tyreData.averagePrice = totalValue / tyreData.totalQuantity
    tyreData.priceRange = tyreData.maxPrice - tyreData.minPrice
    
    // Calculate price stability
    tyreData.priceStability = calculatePriceStability(tyreData.priceHistory)
    
    // Calculate recommended price (average + 10% buffer)
    tyreData.recommendedPrice = Math.round(tyreData.averagePrice * 1.1 * 100) / 100

    processedTyres.push(tyreData)
  })

  // Sort by sales count (most popular first)
  processedTyres.sort((a, b) => b.salesCount - a.salesCount)

  // Generate size distribution
  const sizeDistribution = processedTyres.map(tyre => ({
    size: tyre.size,
    count: tyre.salesCount,
    percentage: Math.round((tyre.salesCount / processedTyres.reduce((sum, t) => sum + t.salesCount, 0)) * 100)
  }))

  const analysis: TyreSizeAnalysis = {
    totalSizes: processedTyres.length,
    mostPopularSize: processedTyres[0]?.size || 'None',
    highestValueSize: processedTyres.sort((a, b) => b.averagePrice - a.averagePrice)[0]?.size || 'None',
    averagePriceAcrossAllSizes: Math.round((processedTyres.reduce((sum, t) => sum + t.averagePrice, 0) / processedTyres.length) * 100) / 100,
    totalTyreRevenue: Math.round(totalRevenue * 100) / 100,
    totalTyresSold: totalQuantity,
    sizeDistribution: sizeDistribution.slice(0, 10) // Top 10
  }

  console.log(`✅ [TYRE-PRICING] Analysis complete: ${processedTyres.length} sizes, £${totalRevenue} revenue`)

  return NextResponse.json({
    success: true,
    data: {
      tyres: processedTyres.slice(0, limit),
      analysis,
      summary: {
        totalSizesAnalyzed: processedTyres.length,
        dateRange: { from: dateFrom, to: dateTo },
        generatedAt: new Date().toISOString()
      }
    }
  })
}

// Extract tyre size from description
function extractTyreSize(description: string): { size: string; width: number; profile: number; diameter: number } | null {
  for (const pattern of TYRE_SIZE_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      const width = parseInt(match[1])
      const profile = parseInt(match[2])
      const diameter = parseInt(match[3])
      const size = `${width}/${profile}R${diameter}`

      return { size, width, profile, diameter }
    }
  }
  return null
}

// Calculate price stability based on price history
function calculatePriceStability(priceHistory: TyrePriceHistory[]): 'stable' | 'volatile' | 'trending_up' | 'trending_down' {
  if (priceHistory.length < 3) return 'stable'

  const prices = priceHistory.map(h => h.price).sort((a, b) => new Date(priceHistory.find(p => p.price === a)?.date || '').getTime() - new Date(priceHistory.find(p => p.price === b)?.date || '').getTime())
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = stdDev / avgPrice

  // Check for trends
  const recentPrices = prices.slice(-3)
  const isIncreasing = recentPrices.every((price, i) => i === 0 || price >= recentPrices[i - 1])
  const isDecreasing = recentPrices.every((price, i) => i === 0 || price <= recentPrices[i - 1])

  if (isIncreasing && recentPrices[recentPrices.length - 1] > avgPrice * 1.1) return 'trending_up'
  if (isDecreasing && recentPrices[recentPrices.length - 1] < avgPrice * 0.9) return 'trending_down'
  if (coefficientOfVariation > 0.2) return 'volatile'

  return 'stable'
}

// Get size-specific analysis
async function getSizeSpecificAnalysis(size: string, dateFrom?: string | null, dateTo?: string | null) {
  console.log(`🔍 [TYRE-PRICING] Size-specific analysis for: ${size}`)

  let query = `
    SELECT
      li.description,
      li.quantity,
      li.unit_price,
      li.total_amount,
      li.created_at,
      d.document_number,
      d.vehicle_registration,
      v.make,
      v.model,
      c.name as customer_name
    FROM line_items li
    LEFT JOIN documents d ON li.document_id = d.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE (
      LOWER(li.description) LIKE '%tyre%'
      OR LOWER(li.description) LIKE '%tire%'
      OR li.description ~ '\\d{3}/\\d{2}R\\d{2}'
    )
    AND UPPER(li.description) LIKE UPPER($1)
    AND li.unit_price > 0
    AND li.quantity > 0
  `

  const params: any[] = [`%${size}%`]
  let paramIndex = 2

  if (dateFrom) {
    query += ` AND li.created_at >= $${paramIndex++}`
    params.push(dateFrom)
  }

  if (dateTo) {
    query += ` AND li.created_at <= $${paramIndex++}`
    params.push(dateTo)
  }

  query += ` ORDER BY li.created_at DESC`

  const sizeData = await sql.unsafe(query, params)

  if (sizeData.length === 0) {
    return NextResponse.json({
      success: false,
      error: `No data found for tyre size: ${size}`
    }, { status: 404 })
  }

  // Process the data
  const priceHistory: TyrePriceHistory[] = sizeData.map((item: any) => ({
    price: parseFloat(item.unit_price),
    date: item.created_at,
    quantity: parseFloat(item.quantity),
    customerType: 'retail',
    vehicleRegistration: item.vehicle_registration,
    jobSheetNumber: item.document_number
  }))

  const prices = priceHistory.map(h => h.price)
  const quantities = priceHistory.map(h => h.quantity)
  const totalRevenue = priceHistory.reduce((sum, h) => sum + (h.price * h.quantity), 0)

  const analysis = {
    size,
    totalSales: sizeData.length,
    totalQuantity: quantities.reduce((sum, q) => sum + q, 0),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averagePrice: Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    priceRange: Math.max(...prices) - Math.min(...prices),
    priceStability: calculatePriceStability(priceHistory),
    recommendedPrice: Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 1.1 * 100) / 100,
    priceHistory: priceHistory.slice(0, 20), // Last 20 transactions
    vehicleTypes: [...new Set(sizeData.map((item: any) => `${item.make} ${item.model}`).filter(Boolean))],
    lastSold: sizeData[0]?.created_at
  }

  return NextResponse.json({
    success: true,
    data: analysis
  })
}

// Get popular tyre sizes
async function getPopularSizes(limit: number = 10) {
  console.log("🔍 [TYRE-PRICING] Getting popular tyre sizes...")

  const query = `
    SELECT
      li.description,
      COUNT(*) as sales_count,
      SUM(li.quantity) as total_quantity,
      AVG(li.unit_price) as average_price,
      MIN(li.unit_price) as min_price,
      MAX(li.unit_price) as max_price,
      MAX(li.created_at) as last_sold
    FROM line_items li
    WHERE (
      LOWER(li.description) LIKE '%tyre%'
      OR LOWER(li.description) LIKE '%tire%'
      OR li.description ~ '\\d{3}/\\d{2}R\\d{2}'
    )
    AND li.unit_price > 0
    AND li.quantity > 0
    GROUP BY li.description
    HAVING COUNT(*) >= 2
    ORDER BY sales_count DESC, total_quantity DESC
    LIMIT $1
  `

  const popularSizes = await sql.unsafe(query, [limit])

  const processedSizes = popularSizes.map((item: any) => {
    const extractedSize = extractTyreSize(item.description)
    return {
      description: item.description,
      size: extractedSize?.size || 'Unknown',
      salesCount: parseInt(item.sales_count),
      totalQuantity: parseFloat(item.total_quantity),
      averagePrice: Math.round(parseFloat(item.average_price) * 100) / 100,
      minPrice: parseFloat(item.min_price),
      maxPrice: parseFloat(item.max_price),
      priceRange: parseFloat(item.max_price) - parseFloat(item.min_price),
      lastSold: item.last_sold
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      popularSizes: processedSizes,
      summary: {
        totalSizesFound: processedSizes.length,
        generatedAt: new Date().toISOString()
      }
    }
  })
}

// Get price trends for a specific size or all tyres
async function getPriceTrends(size?: string | null, dateFrom?: string | null, dateTo?: string | null) {
  console.log(`🔍 [TYRE-PRICING] Getting price trends for: ${size || 'all tyres'}`)

  let query = `
    SELECT
      li.description,
      li.unit_price,
      li.quantity,
      li.created_at,
      DATE_TRUNC('month', li.created_at) as month
    FROM line_items li
    WHERE (
      LOWER(li.description) LIKE '%tyre%'
      OR LOWER(li.description) LIKE '%tire%'
      OR li.description ~ '\\d{3}/\\d{2}R\\d{2}'
    )
    AND li.unit_price > 0
    AND li.quantity > 0
  `

  const params: any[] = []
  let paramIndex = 1

  if (size) {
    query += ` AND UPPER(li.description) LIKE UPPER($${paramIndex++})`
    params.push(`%${size}%`)
  }

  if (dateFrom) {
    query += ` AND li.created_at >= $${paramIndex++}`
    params.push(dateFrom)
  }

  if (dateTo) {
    query += ` AND li.created_at <= $${paramIndex++}`
    params.push(dateTo)
  }

  query += ` ORDER BY li.created_at ASC`

  const trendData = await sql.unsafe(query, params)

  // Group by month and calculate trends
  const monthlyData = new Map<string, { totalSales: number; totalRevenue: number; averagePrice: number; count: number }>()

  trendData.forEach((item: any) => {
    const month = new Date(item.month).toISOString().substring(0, 7) // YYYY-MM format
    const price = parseFloat(item.unit_price)
    const quantity = parseFloat(item.quantity)
    const revenue = price * quantity

    if (!monthlyData.has(month)) {
      monthlyData.set(month, { totalSales: 0, totalRevenue: 0, averagePrice: 0, count: 0 })
    }

    const data = monthlyData.get(month)!
    data.totalSales += quantity
    data.totalRevenue += revenue
    data.count += 1
  })

  // Calculate average prices
  monthlyData.forEach((data) => {
    data.averagePrice = Math.round((data.totalRevenue / data.totalSales) * 100) / 100
  })

  const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    averagePrice: data.averagePrice,
    totalSales: data.totalSales,
    totalRevenue: Math.round(data.totalRevenue * 100) / 100,
    transactionCount: data.count
  })).sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({
    success: true,
    data: {
      trends,
      summary: {
        size: size || 'All Tyres',
        monthsCovered: trends.length,
        dateRange: { from: dateFrom, to: dateTo },
        generatedAt: new Date().toISOString()
      }
    }
  })
}
