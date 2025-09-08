import { useState, useCallback } from 'react'

// Types from the API
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

export interface TyrePricingAnalysisData {
  tyres: TyrePricingData[]
  analysis: TyreSizeAnalysis
  summary: {
    totalSizesAnalyzed: number
    dateRange: { from?: string; to?: string }
    generatedAt: string
  }
}

export interface PopularSizeData {
  description: string
  size: string
  salesCount: number
  totalQuantity: number
  averagePrice: number
  minPrice: number
  maxPrice: number
  priceRange: number
  lastSold: string
}

export interface TrendData {
  month: string
  averagePrice: number
  totalSales: number
  totalRevenue: number
  transactionCount: number
}

interface UseTyrePricingReturn {
  // Data
  analysisData: TyrePricingAnalysisData | null
  sizeSpecificData: any | null
  popularSizes: PopularSizeData[]
  trends: TrendData[]
  
  // Loading states
  loading: boolean
  loadingAnalysis: boolean
  loadingSizeSpecific: boolean
  loadingPopularSizes: boolean
  loadingTrends: boolean
  
  // Error states
  error: string | null
  
  // Functions
  getTyreAnalysis: (filters?: { dateFrom?: string; dateTo?: string; limit?: number }) => Promise<void>
  getSizeSpecificAnalysis: (size: string, filters?: { dateFrom?: string; dateTo?: string }) => Promise<void>
  getPopularSizes: (limit?: number) => Promise<void>
  getPriceTrends: (size?: string, filters?: { dateFrom?: string; dateTo?: string }) => Promise<void>
  clearData: () => void
  
  // Utility functions
  formatTyreSize: (size: string) => string
  getPriceStabilityColor: (stability: string) => string
  calculatePriceVariance: (currentPrice: number, averagePrice: number) => { variance: number; isHigh: boolean; isLow: boolean }
}

export function useTyrePricing(): UseTyrePricingReturn {
  // State
  const [analysisData, setAnalysisData] = useState<TyrePricingAnalysisData | null>(null)
  const [sizeSpecificData, setSizeSpecificData] = useState<any | null>(null)
  const [popularSizes, setPopularSizes] = useState<PopularSizeData[]>([])
  const [trends, setTrends] = useState<TrendData[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [loadingSizeSpecific, setLoadingSizeSpecific] = useState(false)
  const [loadingPopularSizes, setLoadingPopularSizes] = useState(false)
  const [loadingTrends, setLoadingTrends] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)

  // Get comprehensive tyre analysis
  const getTyreAnalysis = useCallback(async (filters?: { dateFrom?: string; dateTo?: string; limit?: number }) => {
    try {
      setLoadingAnalysis(true)
      setLoading(true)
      setError(null)

      console.log('🛞 [USE-TYRE-PRICING] Fetching tyre analysis...')

      const params = new URLSearchParams({
        action: 'analysis',
        ...(filters?.dateFrom && { date_from: filters.dateFrom }),
        ...(filters?.dateTo && { date_to: filters.dateTo }),
        ...(filters?.limit && { limit: filters.limit.toString() })
      })

      const response = await fetch(`/api/tyre-pricing-analysis?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      setAnalysisData(result.data)
      console.log(`✅ [USE-TYRE-PRICING] Analysis loaded: ${result.data.tyres.length} tyre sizes`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tyre analysis'
      console.error('❌ [USE-TYRE-PRICING] Analysis error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoadingAnalysis(false)
      setLoading(false)
    }
  }, [])

  // Get size-specific analysis
  const getSizeSpecificAnalysis = useCallback(async (size: string, filters?: { dateFrom?: string; dateTo?: string }) => {
    try {
      setLoadingSizeSpecific(true)
      setLoading(true)
      setError(null)

      console.log(`🛞 [USE-TYRE-PRICING] Fetching size-specific analysis for: ${size}`)

      const params = new URLSearchParams({
        action: 'size-specific',
        size,
        ...(filters?.dateFrom && { date_from: filters.dateFrom }),
        ...(filters?.dateTo && { date_to: filters.dateTo })
      })

      const response = await fetch(`/api/tyre-pricing-analysis?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      setSizeSpecificData(result.data)
      console.log(`✅ [USE-TYRE-PRICING] Size-specific analysis loaded for: ${size}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch size-specific analysis'
      console.error('❌ [USE-TYRE-PRICING] Size-specific error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoadingSizeSpecific(false)
      setLoading(false)
    }
  }, [])

  // Get popular sizes
  const getPopularSizes = useCallback(async (limit: number = 10) => {
    try {
      setLoadingPopularSizes(true)
      setLoading(true)
      setError(null)

      console.log('🛞 [USE-TYRE-PRICING] Fetching popular tyre sizes...')

      const params = new URLSearchParams({
        action: 'popular-sizes',
        limit: limit.toString()
      })

      const response = await fetch(`/api/tyre-pricing-analysis?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      setPopularSizes(result.data.popularSizes)
      console.log(`✅ [USE-TYRE-PRICING] Popular sizes loaded: ${result.data.popularSizes.length} sizes`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular sizes'
      console.error('❌ [USE-TYRE-PRICING] Popular sizes error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoadingPopularSizes(false)
      setLoading(false)
    }
  }, [])

  // Get price trends
  const getPriceTrends = useCallback(async (size?: string, filters?: { dateFrom?: string; dateTo?: string }) => {
    try {
      setLoadingTrends(true)
      setLoading(true)
      setError(null)

      console.log(`🛞 [USE-TYRE-PRICING] Fetching price trends for: ${size || 'all tyres'}`)

      const params = new URLSearchParams({
        action: 'price-trends',
        ...(size && { size }),
        ...(filters?.dateFrom && { date_from: filters.dateFrom }),
        ...(filters?.dateTo && { date_to: filters.dateTo })
      })

      const response = await fetch(`/api/tyre-pricing-analysis?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      setTrends(result.data.trends)
      console.log(`✅ [USE-TYRE-PRICING] Price trends loaded: ${result.data.trends.length} months`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price trends'
      console.error('❌ [USE-TYRE-PRICING] Price trends error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoadingTrends(false)
      setLoading(false)
    }
  }, [])

  // Clear all data
  const clearData = useCallback(() => {
    setAnalysisData(null)
    setSizeSpecificData(null)
    setPopularSizes([])
    setTrends([])
    setError(null)
  }, [])

  // Utility functions
  const formatTyreSize = useCallback((size: string): string => {
    // Ensure consistent formatting: 205/55R16
    const match = size.match(/(\d{3})\/(\d{2})R(\d{2})/)
    if (match) {
      return `${match[1]}/${match[2]}R${match[3]}`
    }
    return size
  }, [])

  const getPriceStabilityColor = useCallback((stability: string): string => {
    switch (stability) {
      case 'stable': return 'text-green-600'
      case 'volatile': return 'text-red-600'
      case 'trending_up': return 'text-blue-600'
      case 'trending_down': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }, [])

  const calculatePriceVariance = useCallback((currentPrice: number, averagePrice: number) => {
    const variance = ((currentPrice - averagePrice) / averagePrice) * 100
    return {
      variance: Math.round(variance * 100) / 100,
      isHigh: variance > 15,
      isLow: variance < -15
    }
  }, [])

  return {
    // Data
    analysisData,
    sizeSpecificData,
    popularSizes,
    trends,

    // Loading states
    loading,
    loadingAnalysis,
    loadingSizeSpecific,
    loadingPopularSizes,
    loadingTrends,

    // Error state
    error,

    // Functions
    getTyreAnalysis,
    getSizeSpecificAnalysis,
    getPopularSizes,
    getPriceTrends,
    clearData,

    // Utility functions
    formatTyreSize,
    getPriceStabilityColor,
    calculatePriceVariance
  }
}

// Helper function to automatically record tyre pricing history when tyres are added to job sheets
export async function recordTyrePricingHistory(
  tyreDescription: string,
  priceCharged: number,
  quantity: number,
  jobSheetData: {
    jobSheetId?: string
    jobSheetNumber?: string
    customerId?: string
    customerName?: string
    customerType?: 'retail' | 'trade' | 'warranty' | 'internal'
    technicianId?: string
    technicianName?: string
    vehicleRegistration?: string
    vehicleMake?: string
    vehicleModel?: string
  },
  notes?: string
): Promise<boolean> {
  try {
    // Extract tyre size from description
    const tyreSize = extractTyreSizeFromDescription(tyreDescription)
    const partNumber = tyreSize || tyreDescription.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()

    console.log(`🛞 [RECORD-TYRE-PRICING] Recording tyre pricing: ${tyreDescription} - £${priceCharged}`)

    // Use the existing parts pricing history API
    const response = await fetch('/api/parts-pricing-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        part_number: partNumber,
        part_name: tyreDescription,
        price_charged: priceCharged,
        quantity_sold: quantity,
        date_sold: new Date().toISOString(),
        job_sheet_id: jobSheetData.jobSheetId,
        job_sheet_number: jobSheetData.jobSheetNumber,
        customer_id: jobSheetData.customerId,
        customer_name: jobSheetData.customerName,
        customer_type: jobSheetData.customerType || 'retail',
        technician_id: jobSheetData.technicianId,
        technician_name: jobSheetData.technicianName,
        vehicle_registration: jobSheetData.vehicleRegistration,
        vehicle_make: jobSheetData.vehicleMake,
        vehicle_model: jobSheetData.vehicleModel,
        notes: notes ? `TYRE: ${notes}` : 'TYRE'
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to record tyre pricing history')
    }

    console.log(`✅ [RECORD-TYRE-PRICING] Successfully recorded tyre pricing history for: ${tyreDescription}`)
    return true

  } catch (error) {
    console.error('❌ [RECORD-TYRE-PRICING] Error recording tyre pricing history:', error)
    return false
  }
}

// Helper function to extract tyre size from description
function extractTyreSizeFromDescription(description: string): string | null {
  const patterns = [
    /(\d{3})\/(\d{2})R(\d{2})/i,
    /(\d{3})\/(\d{2})-(\d{2})/i,
    /(\d{3})\/(\d{2})R(\d{2})\s*\d{2}[A-Z]/i,
    /(\d{3})\s+(\d{2})\s+R(\d{2})/i
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return `${match[1]}/${match[2]}R${match[3]}`
    }
  }
  return null
}

// Helper function to detect if a part description is a tyre
export function isTyreDescription(description: string): boolean {
  const desc = description.toLowerCase()
  return (
    desc.includes('tyre') ||
    desc.includes('tire') ||
    /\d{3}\/\d{2}R\d{2}/.test(description) ||
    /\d{3}\/\d{2}-\d{2}/.test(description)
  )
}

// Helper function to get tyre pricing suggestions based on size
export async function getTyrePricingSuggestion(
  tyreSize: string,
  customerType: 'retail' | 'trade' | 'warranty' | 'internal' = 'retail'
): Promise<{ suggestedPrice: number; confidence: number; reasoning: string } | null> {
  try {
    console.log(`🛞 [TYRE-PRICING-SUGGESTION] Getting pricing suggestion for: ${tyreSize}`)

    const response = await fetch(`/api/tyre-pricing-analysis?action=size-specific&size=${encodeURIComponent(tyreSize)}`)
    const result = await response.json()

    if (!response.ok || !result.success) {
      return null
    }

    const data = result.data
    let suggestedPrice = data.recommendedPrice || data.averagePrice
    let confidence = 0.8 // Base confidence

    // Adjust price based on customer type
    switch (customerType) {
      case 'trade':
        suggestedPrice *= 0.85 // 15% trade discount
        break
      case 'warranty':
        suggestedPrice *= 0.9 // 10% warranty discount
        break
      case 'internal':
        suggestedPrice *= 0.7 // 30% internal discount
        break
    }

    // Adjust confidence based on data quality
    if (data.totalSales >= 5) confidence = 0.9
    if (data.totalSales >= 10) confidence = 0.95
    if (data.priceStability === 'stable') confidence += 0.05
    if (data.priceStability === 'volatile') confidence -= 0.1

    const reasoning = `Based on ${data.totalSales} sales with ${data.priceStability} pricing. Average: £${data.averagePrice.toFixed(2)}`

    return {
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      confidence: Math.min(confidence, 1.0),
      reasoning
    }

  } catch (error) {
    console.error('❌ [TYRE-PRICING-SUGGESTION] Error getting pricing suggestion:', error)
    return null
  }
}
