import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Interface for parts pricing history
export interface PartsPricingHistory {
  id?: number
  part_number: string
  part_name: string
  price_charged: number
  cost_price?: number
  markup_percentage?: number
  quantity_sold: number
  date_sold: string
  job_sheet_id?: string
  job_sheet_number?: string
  customer_id?: string
  customer_name?: string
  customer_type: 'retail' | 'trade' | 'warranty' | 'internal'
  technician_id?: string
  technician_name?: string
  vehicle_registration?: string
  vehicle_make?: string
  vehicle_model?: string
  notes?: string
}

export interface PartsPricingAnalytics {
  part_number: string
  part_name: string
  current_suggested_price?: number
  average_price_30_days?: number
  average_price_90_days?: number
  average_price_all_time?: number
  most_recent_price?: number
  most_recent_sale_date?: string
  highest_price?: number
  lowest_price?: number
  total_sales_count: number
  total_quantity_sold: number
  total_revenue: number
  sales_last_30_days: number
  sales_last_90_days: number
  price_variance_percentage?: number
  price_stability_score?: number
  average_markup_percentage?: number
  estimated_cost_price?: number
}

// GET - Retrieve pricing history and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partNumber = searchParams.get('part_number')
    const action = searchParams.get('action') || 'history'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const customerType = searchParams.get('customer_type')

    console.log(`[PARTS-PRICING-API] GET request - Action: ${action}, Part: ${partNumber}`)

    switch (action) {
      case 'history':
        return await getPricingHistory(partNumber, limit, offset, dateFrom, dateTo, customerType)
      
      case 'analytics':
        return await getPricingAnalytics(partNumber)
      
      case 'suggestions':
        return await getPricingSuggestions(partNumber)
      
      case 'recent':
        return await getRecentPricing(partNumber, limit)

      case 'customer-history':
        const customerId = searchParams.get('customer_id')
        const partName = searchParams.get('part_name')

        if (!customerId) {
          return NextResponse.json({
            success: false,
            error: "Customer ID is required for customer history"
          }, { status: 400 })
        }

        return await getCustomerPricingHistory(customerId, partNumber, partName, limit)

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action parameter"
        }, { status: 400 })
    }

  } catch (error) {
    console.error("[PARTS-PRICING-API] GET Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve pricing data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST - Add new pricing history entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pricingData: PartsPricingHistory = body

    console.log(`[PARTS-PRICING-API] Adding pricing history for part: ${pricingData.part_number}`)

    // Validate required fields
    if (!pricingData.part_number || !pricingData.part_name || !pricingData.price_charged) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: part_number, part_name, price_charged"
      }, { status: 400 })
    }

    // Calculate markup if cost price is provided
    let markupPercentage = null
    if (pricingData.cost_price && pricingData.cost_price > 0) {
      markupPercentage = ((pricingData.price_charged - pricingData.cost_price) / pricingData.cost_price) * 100
    }

    // Insert pricing history record
    const result = await sql`
      INSERT INTO parts_pricing_history (
        part_number, part_name, price_charged, cost_price, markup_percentage,
        quantity_sold, date_sold, job_sheet_id, job_sheet_number,
        customer_id, customer_name, customer_type, technician_id, technician_name,
        vehicle_registration, vehicle_make, vehicle_model, notes
      ) VALUES (
        ${pricingData.part_number}, ${pricingData.part_name}, ${pricingData.price_charged},
        ${pricingData.cost_price || null}, ${markupPercentage},
        ${pricingData.quantity_sold || 1}, ${pricingData.date_sold || new Date().toISOString()},
        ${pricingData.job_sheet_id || null}, ${pricingData.job_sheet_number || null},
        ${pricingData.customer_id || null}, ${pricingData.customer_name || null},
        ${pricingData.customer_type || 'retail'}, ${pricingData.technician_id || null},
        ${pricingData.technician_name || null}, ${pricingData.vehicle_registration || null},
        ${pricingData.vehicle_make || null}, ${pricingData.vehicle_model || null},
        ${pricingData.notes || null}
      )
      RETURNING id, created_at
    `

    // Trigger analytics recalculation
    await recalculateAnalytics(pricingData.part_number)

    return NextResponse.json({
      success: true,
      message: "Pricing history added successfully",
      data: {
        id: result[0].id,
        created_at: result[0].created_at,
        markup_percentage: markupPercentage
      }
    })

  } catch (error) {
    console.error("[PARTS-PRICING-API] POST Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to add pricing history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Helper function to get pricing history
async function getPricingHistory(
  partNumber?: string | null, 
  limit: number = 50, 
  offset: number = 0,
  dateFrom?: string | null,
  dateTo?: string | null,
  customerType?: string | null
) {
  let query = `
    SELECT 
      id, part_number, part_name, price_charged, cost_price, markup_percentage,
      quantity_sold, date_sold, job_sheet_id, job_sheet_number,
      customer_name, customer_type, technician_name,
      vehicle_registration, vehicle_make, vehicle_model, notes,
      created_at
    FROM parts_pricing_history
    WHERE 1=1
  `
  
  const params: any[] = []
  let paramIndex = 1

  if (partNumber) {
    query += ` AND part_number = $${paramIndex++}`
    params.push(partNumber)
  }

  if (dateFrom) {
    query += ` AND date_sold >= $${paramIndex++}`
    params.push(dateFrom)
  }

  if (dateTo) {
    query += ` AND date_sold <= $${paramIndex++}`
    params.push(dateTo)
  }

  if (customerType) {
    query += ` AND customer_type = $${paramIndex++}`
    params.push(customerType)
  }

  query += ` ORDER BY date_sold DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, offset)

  const history = await sql.unsafe(query, params)

  // Get total count for pagination
  let countQuery = `SELECT COUNT(*) as total FROM parts_pricing_history WHERE 1=1`
  const countParams: any[] = []
  let countParamIndex = 1

  if (partNumber) {
    countQuery += ` AND part_number = $${countParamIndex++}`
    countParams.push(partNumber)
  }

  if (dateFrom) {
    countQuery += ` AND date_sold >= $${countParamIndex++}`
    countParams.push(dateFrom)
  }

  if (dateTo) {
    countQuery += ` AND date_sold <= $${countParamIndex++}`
    countParams.push(dateTo)
  }

  if (customerType) {
    countQuery += ` AND customer_type = $${countParamIndex++}`
    countParams.push(customerType)
  }

  const countResult = await sql.unsafe(countQuery, countParams)
  const total = parseInt(countResult[0]?.total || countResult[0]?.count || '0')

  return NextResponse.json({
    success: true,
    data: {
      history: history,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total
      }
    }
  })
}

// Helper function to get pricing analytics
async function getPricingAnalytics(partNumber?: string | null) {
  let query = `
    SELECT * FROM parts_pricing_analytics
  `
  
  if (partNumber) {
    query += ` WHERE part_number = $1`
    const analytics = await sql.unsafe(query, [partNumber])
    
    if (analytics.length === 0) {
      // Calculate analytics if not exists
      await recalculateAnalytics(partNumber)
      const newAnalytics = await sql.unsafe(query, [partNumber])
      return NextResponse.json({
        success: true,
        data: newAnalytics[0] || null
      })
    }
    
    return NextResponse.json({
      success: true,
      data: analytics[0]
    })
  } else {
    const analytics = await sql.unsafe(query + ` ORDER BY total_sales_count DESC`)
    return NextResponse.json({
      success: true,
      data: analytics
    })
  }
}

// Helper function to get pricing suggestions
async function getPricingSuggestions(partNumber?: string | null) {
  let query = `
    SELECT * FROM parts_pricing_suggestions
    WHERE is_active = true
  `
  
  if (partNumber) {
    query += ` AND part_number = $1`
    const suggestions = await sql.unsafe(query, [partNumber])
    return NextResponse.json({
      success: true,
      data: suggestions
    })
  } else {
    const suggestions = await sql.unsafe(query + ` ORDER BY confidence_score DESC`)
    return NextResponse.json({
      success: true,
      data: suggestions
    })
  }
}

// Helper function to get recent pricing
async function getRecentPricing(partNumber?: string | null, limit: number = 10) {
  let query = `
    SELECT DISTINCT ON (part_number) 
      part_number, part_name, price_charged, date_sold, customer_type
    FROM parts_pricing_history
  `
  
  if (partNumber) {
    query += ` WHERE part_number = $1`
    query += ` ORDER BY part_number, date_sold DESC LIMIT $2`
    const recent = await sql.unsafe(query, [partNumber, limit])
    return NextResponse.json({
      success: true,
      data: recent
    })
  } else {
    query += ` ORDER BY part_number, date_sold DESC`
    const recent = await sql.unsafe(query)
    return NextResponse.json({
      success: true,
      data: recent.slice(0, limit)
    })
  }
}

// Helper function to recalculate analytics
async function recalculateAnalytics(partNumber: string) {
  try {
    // Calculate comprehensive analytics
    const analytics = await sql`
      WITH pricing_stats AS (
        SELECT 
          part_number,
          part_name,
          COUNT(*) as total_sales_count,
          SUM(quantity_sold) as total_quantity_sold,
          SUM(price_charged * quantity_sold) as total_revenue,
          AVG(price_charged) as average_price_all_time,
          MAX(price_charged) as highest_price,
          MIN(price_charged) as lowest_price,
          AVG(CASE WHEN date_sold >= CURRENT_DATE - INTERVAL '30 days' THEN price_charged END) as average_price_30_days,
          AVG(CASE WHEN date_sold >= CURRENT_DATE - INTERVAL '90 days' THEN price_charged END) as average_price_90_days,
          COUNT(CASE WHEN date_sold >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as sales_last_30_days,
          COUNT(CASE WHEN date_sold >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as sales_last_90_days,
          (SELECT price_charged FROM parts_pricing_history p2 WHERE p2.part_number = p1.part_number ORDER BY date_sold DESC LIMIT 1) as most_recent_price,
          (SELECT date_sold FROM parts_pricing_history p2 WHERE p2.part_number = p1.part_number ORDER BY date_sold DESC LIMIT 1) as most_recent_sale_date,
          AVG(markup_percentage) as average_markup_percentage,
          STDDEV(price_charged) / AVG(price_charged) as price_coefficient_variation
        FROM parts_pricing_history p1
        WHERE part_number = ${partNumber}
        GROUP BY part_number, part_name
      )
      INSERT INTO parts_pricing_analytics (
        part_number, part_name, current_suggested_price, average_price_30_days,
        average_price_90_days, average_price_all_time, most_recent_price,
        most_recent_sale_date, highest_price, lowest_price, total_sales_count,
        total_quantity_sold, total_revenue, sales_last_30_days, sales_last_90_days,
        price_stability_score, average_markup_percentage, last_calculated
      )
      SELECT 
        part_number, part_name,
        COALESCE(average_price_30_days, average_price_all_time, most_recent_price) as current_suggested_price,
        average_price_30_days, average_price_90_days, average_price_all_time,
        most_recent_price, most_recent_sale_date, highest_price, lowest_price,
        total_sales_count, total_quantity_sold, total_revenue,
        sales_last_30_days, sales_last_90_days,
        CASE 
          WHEN price_coefficient_variation IS NULL THEN 1.0
          ELSE GREATEST(0.0, 1.0 - price_coefficient_variation)
        END as price_stability_score,
        average_markup_percentage,
        CURRENT_TIMESTAMP
      FROM pricing_stats
      ON CONFLICT (part_number) DO UPDATE SET
        current_suggested_price = EXCLUDED.current_suggested_price,
        average_price_30_days = EXCLUDED.average_price_30_days,
        average_price_90_days = EXCLUDED.average_price_90_days,
        average_price_all_time = EXCLUDED.average_price_all_time,
        most_recent_price = EXCLUDED.most_recent_price,
        most_recent_sale_date = EXCLUDED.most_recent_sale_date,
        highest_price = EXCLUDED.highest_price,
        lowest_price = EXCLUDED.lowest_price,
        total_sales_count = EXCLUDED.total_sales_count,
        total_quantity_sold = EXCLUDED.total_quantity_sold,
        total_revenue = EXCLUDED.total_revenue,
        sales_last_30_days = EXCLUDED.sales_last_30_days,
        sales_last_90_days = EXCLUDED.sales_last_90_days,
        price_stability_score = EXCLUDED.price_stability_score,
        average_markup_percentage = EXCLUDED.average_markup_percentage,
        last_calculated = EXCLUDED.last_calculated
    `

    console.log(`[PARTS-PRICING-API] Analytics recalculated for part: ${partNumber}`)
  } catch (error) {
    console.error(`[PARTS-PRICING-API] Error recalculating analytics for ${partNumber}:`, error)
  }
}

// Get customer-specific pricing history for a part
async function getCustomerPricingHistory(
  customerId: string,
  partNumber?: string | null,
  partName?: string | null,
  limit: number = 10
) {
  try {
    let query = `
      SELECT
        id, part_number, part_name, price_charged, cost_price, markup_percentage,
        quantity_sold, date_sold, job_sheet_id, job_sheet_number,
        customer_name, customer_type, technician_name,
        vehicle_registration, vehicle_make, vehicle_model, notes,
        created_at
      FROM parts_pricing_history
      WHERE customer_id = $1
    `

    const params: any[] = [customerId]
    let paramIndex = 2

    // Filter by part number or part name
    if (partNumber) {
      query += ` AND part_number = $${paramIndex++}`
      params.push(partNumber)
    } else if (partName) {
      query += ` AND LOWER(part_name) LIKE LOWER($${paramIndex++})`
      params.push(`%${partName}%`)
    }

    query += ` ORDER BY date_sold DESC LIMIT $${paramIndex}`
    params.push(limit)

    console.log(`[CUSTOMER-PRICING-HISTORY] Query for customer ${customerId}, part: ${partNumber || partName}`)

    const result = await sql.unsafe(query, params)

    return NextResponse.json({
      success: true,
      data: {
        history: result,
        customer_id: customerId,
        part_filter: partNumber || partName,
        total_records: result.length
      }
    })

  } catch (error) {
    console.error("[CUSTOMER-PRICING-HISTORY] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to retrieve customer pricing history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
