import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

export interface PricingSuggestion {
  part_number: string
  suggested_price: number
  suggestion_type: 'historical_average' | 'recent_trend' | 'market_rate' | 'cost_plus' | 'customer_type'
  confidence_score: number
  reasoning: string
  price_range: {
    min: number
    max: number
    recommended: number
  }
  historical_context: {
    last_sold_price?: number
    last_sold_date?: string
    average_price?: number
    sales_frequency?: string
  }
}

// GET - Get intelligent pricing suggestions for a part
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partNumber = searchParams.get('part_number')
    const partName = searchParams.get('part_name')
    const customerType = searchParams.get('customer_type') || 'retail'
    const quantity = parseInt(searchParams.get('quantity') || '1')

    if (!partNumber && !partName) {
      return NextResponse.json({
        success: false,
        error: "Either part_number or part_name is required"
      }, { status: 400 })
    }

    console.log(`[PRICING-SUGGESTIONS] Generating suggestions for: ${partNumber || partName}`)

    const suggestions = await generatePricingSuggestions(
      partNumber, 
      partName, 
      customerType as any, 
      quantity
    )

    return NextResponse.json({
      success: true,
      data: suggestions
    })

  } catch (error) {
    console.error("[PRICING-SUGGESTIONS] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate pricing suggestions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST - Create or update pricing suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { part_number, suggested_price, suggestion_type, confidence_score, reasoning } = body

    if (!part_number || !suggested_price || !suggestion_type) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: part_number, suggested_price, suggestion_type"
      }, { status: 400 })
    }

    // Insert or update pricing suggestion
    const result = await sql`
      INSERT INTO parts_pricing_suggestions (
        part_number, suggested_price, suggestion_type, confidence_score, reasoning
      ) VALUES (
        ${part_number}, ${suggested_price}, ${suggestion_type}, 
        ${confidence_score || 0.8}, ${reasoning || 'Manual suggestion'}
      )
      ON CONFLICT (part_number, suggestion_type) DO UPDATE SET
        suggested_price = EXCLUDED.suggested_price,
        confidence_score = EXCLUDED.confidence_score,
        reasoning = EXCLUDED.reasoning,
        valid_from = CURRENT_TIMESTAMP,
        valid_until = NULL
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      message: "Pricing suggestion saved successfully",
      data: { id: result[0].id }
    })

  } catch (error) {
    console.error("[PRICING-SUGGESTIONS] POST Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to save pricing suggestion",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Generate intelligent pricing suggestions
async function generatePricingSuggestions(
  partNumber?: string | null,
  partName?: string | null,
  customerType: 'retail' | 'trade' | 'warranty' | 'internal' = 'retail',
  quantity: number = 1
): Promise<PricingSuggestion[]> {
  
  const suggestions: PricingSuggestion[] = []

  try {
    // Get historical pricing data
    let historicalData
    if (partNumber) {
      historicalData = await sql`
        SELECT 
          price_charged, date_sold, customer_type, quantity_sold,
          AVG(price_charged) OVER() as avg_price,
          COUNT(*) OVER() as total_sales,
          MAX(date_sold) OVER() as latest_sale
        FROM parts_pricing_history 
        WHERE part_number = ${partNumber}
        ORDER BY date_sold DESC
        LIMIT 20
      `
    } else if (partName) {
      historicalData = await sql`
        SELECT 
          price_charged, date_sold, customer_type, quantity_sold, part_number,
          AVG(price_charged) OVER() as avg_price,
          COUNT(*) OVER() as total_sales,
          MAX(date_sold) OVER() as latest_sale
        FROM parts_pricing_history 
        WHERE part_name ILIKE ${`%${partName}%`}
        ORDER BY date_sold DESC
        LIMIT 20
      `
    }

    if (!historicalData || historicalData.length === 0) {
      // No historical data - provide basic suggestion
      suggestions.push({
        part_number: partNumber || 'UNKNOWN',
        suggested_price: 25.00, // Default fallback price
        suggestion_type: 'market_rate',
        confidence_score: 0.3,
        reasoning: 'No historical data available. Using estimated market rate.',
        price_range: {
          min: 15.00,
          max: 50.00,
          recommended: 25.00
        },
        historical_context: {
          sales_frequency: 'No previous sales'
        }
      })
      return suggestions
    }

    const recentSales = historicalData.slice(0, 5)
    const allSales = historicalData
    const avgPrice = parseFloat(allSales[0].avg_price)
    const totalSales = parseInt(allSales[0].total_sales)
    const latestSale = allSales[0]

    // 1. Historical Average Suggestion
    const historicalAvg = avgPrice
    suggestions.push({
      part_number: partNumber || latestSale.part_number,
      suggested_price: parseFloat(historicalAvg.toFixed(2)),
      suggestion_type: 'historical_average',
      confidence_score: Math.min(0.9, 0.5 + (totalSales * 0.05)),
      reasoning: `Based on average of ${totalSales} previous sales (£${historicalAvg.toFixed(2)})`,
      price_range: {
        min: parseFloat((historicalAvg * 0.85).toFixed(2)),
        max: parseFloat((historicalAvg * 1.15).toFixed(2)),
        recommended: parseFloat(historicalAvg.toFixed(2))
      },
      historical_context: {
        last_sold_price: latestSale.price_charged,
        last_sold_date: latestSale.date_sold,
        average_price: historicalAvg,
        sales_frequency: getSalesFrequency(totalSales)
      }
    })

    // 2. Recent Trend Suggestion
    if (recentSales.length >= 3) {
      const recentAvg = recentSales.reduce((sum, sale) => sum + parseFloat(sale.price_charged), 0) / recentSales.length
      const trendConfidence = recentSales.length >= 5 ? 0.85 : 0.7
      
      suggestions.push({
        part_number: partNumber || latestSale.part_number,
        suggested_price: parseFloat(recentAvg.toFixed(2)),
        suggestion_type: 'recent_trend',
        confidence_score: trendConfidence,
        reasoning: `Based on ${recentSales.length} most recent sales (£${recentAvg.toFixed(2)} average)`,
        price_range: {
          min: parseFloat((recentAvg * 0.9).toFixed(2)),
          max: parseFloat((recentAvg * 1.1).toFixed(2)),
          recommended: parseFloat(recentAvg.toFixed(2))
        },
        historical_context: {
          last_sold_price: latestSale.price_charged,
          last_sold_date: latestSale.date_sold,
          average_price: recentAvg,
          sales_frequency: getSalesFrequency(totalSales)
        }
      })
    }

    // 3. Customer Type Adjustment
    const customerTypeSales = allSales.filter(sale => sale.customer_type === customerType)
    if (customerTypeSales.length > 0) {
      const customerTypeAvg = customerTypeSales.reduce((sum, sale) => sum + parseFloat(sale.price_charged), 0) / customerTypeSales.length
      const customerTypeConfidence = Math.min(0.8, 0.4 + (customerTypeSales.length * 0.1))
      
      suggestions.push({
        part_number: partNumber || latestSale.part_number,
        suggested_price: parseFloat(customerTypeAvg.toFixed(2)),
        suggestion_type: 'customer_type',
        confidence_score: customerTypeConfidence,
        reasoning: `Based on ${customerTypeSales.length} previous ${customerType} sales (£${customerTypeAvg.toFixed(2)} average)`,
        price_range: {
          min: parseFloat((customerTypeAvg * 0.9).toFixed(2)),
          max: parseFloat((customerTypeAvg * 1.1).toFixed(2)),
          recommended: parseFloat(customerTypeAvg.toFixed(2))
        },
        historical_context: {
          last_sold_price: latestSale.price_charged,
          last_sold_date: latestSale.date_sold,
          average_price: customerTypeAvg,
          sales_frequency: getSalesFrequency(customerTypeSales.length)
        }
      })
    }

    // 4. Quantity-based adjustment
    if (quantity > 1) {
      const basePrice = suggestions[0]?.suggested_price || avgPrice
      const discountPercentage = Math.min(0.15, quantity * 0.02) // Up to 15% discount
      const quantityPrice = basePrice * (1 - discountPercentage)
      
      suggestions.push({
        part_number: partNumber || latestSale.part_number,
        suggested_price: parseFloat(quantityPrice.toFixed(2)),
        suggestion_type: 'market_rate',
        confidence_score: 0.75,
        reasoning: `Quantity discount applied: ${(discountPercentage * 100).toFixed(1)}% off for ${quantity} units`,
        price_range: {
          min: parseFloat((quantityPrice * 0.95).toFixed(2)),
          max: parseFloat((quantityPrice * 1.05).toFixed(2)),
          recommended: parseFloat(quantityPrice.toFixed(2))
        },
        historical_context: {
          last_sold_price: latestSale.price_charged,
          last_sold_date: latestSale.date_sold,
          average_price: avgPrice,
          sales_frequency: getSalesFrequency(totalSales)
        }
      })
    }

    // Sort by confidence score
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score)

    return suggestions

  } catch (error) {
    console.error("[PRICING-SUGGESTIONS] Error generating suggestions:", error)
    return [{
      part_number: partNumber || 'UNKNOWN',
      suggested_price: 25.00,
      suggestion_type: 'market_rate',
      confidence_score: 0.3,
      reasoning: 'Error occurred while analyzing historical data. Using fallback price.',
      price_range: {
        min: 15.00,
        max: 50.00,
        recommended: 25.00
      },
      historical_context: {
        sales_frequency: 'Unable to determine'
      }
    }]
  }
}

// Helper function to determine sales frequency
function getSalesFrequency(salesCount: number): string {
  if (salesCount >= 20) return 'High frequency'
  if (salesCount >= 10) return 'Medium frequency'
  if (salesCount >= 5) return 'Low frequency'
  if (salesCount >= 1) return 'Rare'
  return 'No previous sales'
}

// Helper function to calculate price variance warning
export function calculatePriceVarianceWarning(
  currentPrice: number, 
  suggestedPrice: number, 
  threshold: number = 0.2
): { hasWarning: boolean; variance: number; message: string } {
  const variance = Math.abs(currentPrice - suggestedPrice) / suggestedPrice
  const hasWarning = variance > threshold
  
  let message = ''
  if (hasWarning) {
    const percentDiff = (variance * 100).toFixed(1)
    if (currentPrice > suggestedPrice) {
      message = `Price is ${percentDiff}% higher than suggested (£${suggestedPrice.toFixed(2)})`
    } else {
      message = `Price is ${percentDiff}% lower than suggested (£${suggestedPrice.toFixed(2)})`
    }
  }
  
  return { hasWarning, variance, message }
}
