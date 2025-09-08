"use client"

import { useState, useCallback } from 'react'

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

export interface PriceVarianceWarning {
  hasWarning: boolean
  variance: number
  message: string
  severity: 'low' | 'medium' | 'high'
}

interface UsePartsPricingReturn {
  // Data
  pricingHistory: PartsPricingHistory[]
  pricingSuggestions: PricingSuggestion[]
  analytics: any
  
  // Loading states
  loading: boolean
  loadingHistory: boolean
  loadingSuggestions: boolean
  
  // Error states
  error: string | null
  
  // Functions
  addPricingHistory: (data: PartsPricingHistory) => Promise<boolean>
  getPricingHistory: (partNumber: string, filters?: any) => Promise<void>
  getPricingSuggestions: (partNumber: string, partName?: string, customerType?: string) => Promise<void>
  getAnalytics: (partNumber: string) => Promise<void>
  calculatePriceVariance: (currentPrice: number, suggestedPrice: number) => PriceVarianceWarning
  clearData: () => void
}

export function usePartsPricing(): UsePartsPricingReturn {
  const [pricingHistory, setPricingHistory] = useState<PartsPricingHistory[]>([])
  const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addPricingHistory = useCallback(async (data: PartsPricingHistory): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🏷️ [USE-PARTS-PRICING] Adding pricing history:', data)

      const response = await fetch('/api/parts-pricing-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success) {
        console.log('✅ [USE-PARTS-PRICING] Pricing history added successfully')
        
        // Refresh data if we're viewing the same part
        if (pricingHistory.length > 0 && pricingHistory[0].part_number === data.part_number) {
          await getPricingHistory(data.part_number)
          await getAnalytics(data.part_number)
        }
        
        return true
      } else {
        throw new Error(result.error || 'Failed to add pricing history')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add pricing history'
      console.error('❌ [USE-PARTS-PRICING] Error:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [pricingHistory])

  const getPricingHistory = useCallback(async (
    partNumber: string, 
    filters?: {
      limit?: number
      offset?: number
      dateFrom?: string
      dateTo?: string
      customerType?: string
    }
  ) => {
    try {
      setLoadingHistory(true)
      setError(null)

      console.log(`🏷️ [USE-PARTS-PRICING] Fetching pricing history for: ${partNumber}`)

      const params = new URLSearchParams({
        action: 'history',
        part_number: partNumber,
        limit: (filters?.limit || 50).toString(),
        offset: (filters?.offset || 0).toString(),
        ...(filters?.dateFrom && { date_from: filters.dateFrom }),
        ...(filters?.dateTo && { date_to: filters.dateTo }),
        ...(filters?.customerType && { customer_type: filters.customerType })
      })

      const response = await fetch(`/api/parts-pricing-history?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success) {
        setPricingHistory(result.data.history || [])
        console.log(`✅ [USE-PARTS-PRICING] Loaded ${result.data.history?.length || 0} pricing history entries`)
      } else {
        throw new Error(result.error || 'Failed to fetch pricing history')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pricing history'
      console.error('❌ [USE-PARTS-PRICING] Error:', errorMessage)
      setError(errorMessage)
      setPricingHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const getPricingSuggestions = useCallback(async (
    partNumber: string, 
    partName?: string, 
    customerType: string = 'retail'
  ) => {
    try {
      setLoadingSuggestions(true)
      setError(null)

      console.log(`🏷️ [USE-PARTS-PRICING] Fetching pricing suggestions for: ${partNumber}`)

      const params = new URLSearchParams({
        part_number: partNumber,
        customer_type: customerType,
        ...(partName && { part_name: partName })
      })

      const response = await fetch(`/api/parts-pricing-suggestions?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success) {
        setPricingSuggestions(result.data || [])
        console.log(`✅ [USE-PARTS-PRICING] Loaded ${result.data?.length || 0} pricing suggestions`)
      } else {
        throw new Error(result.error || 'Failed to fetch pricing suggestions')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pricing suggestions'
      console.error('❌ [USE-PARTS-PRICING] Error:', errorMessage)
      setError(errorMessage)
      setPricingSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  const getAnalytics = useCallback(async (partNumber: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🏷️ [USE-PARTS-PRICING] Fetching analytics for: ${partNumber}`)

      const response = await fetch(`/api/parts-pricing-history?action=analytics&part_number=${partNumber}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (result.success) {
        setAnalytics(result.data)
        console.log('✅ [USE-PARTS-PRICING] Analytics loaded successfully')
      } else {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      console.error('❌ [USE-PARTS-PRICING] Error:', errorMessage)
      setError(errorMessage)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const calculatePriceVariance = useCallback((
    currentPrice: number, 
    suggestedPrice: number, 
    threshold: number = 0.2
  ): PriceVarianceWarning => {
    const variance = Math.abs(currentPrice - suggestedPrice) / suggestedPrice
    const hasWarning = variance > threshold
    
    let severity: 'low' | 'medium' | 'high' = 'low'
    if (variance > 0.5) severity = 'high'
    else if (variance > 0.3) severity = 'medium'
    
    let message = ''
    if (hasWarning) {
      const percentDiff = (variance * 100).toFixed(1)
      if (currentPrice > suggestedPrice) {
        message = `Price is ${percentDiff}% higher than suggested (£${suggestedPrice.toFixed(2)})`
      } else {
        message = `Price is ${percentDiff}% lower than suggested (£${suggestedPrice.toFixed(2)})`
      }
    }
    
    return { hasWarning, variance, message, severity }
  }, [])

  const clearData = useCallback(() => {
    setPricingHistory([])
    setPricingSuggestions([])
    setAnalytics(null)
    setError(null)
  }, [])

  return {
    // Data
    pricingHistory,
    pricingSuggestions,
    analytics,
    
    // Loading states
    loading,
    loadingHistory,
    loadingSuggestions,
    
    // Error states
    error,
    
    // Functions
    addPricingHistory,
    getPricingHistory,
    getPricingSuggestions,
    getAnalytics,
    calculatePriceVariance,
    clearData
  }
}

// Helper function to automatically record pricing history when parts are added to job sheets
export async function recordPartPricingHistory(
  partNumber: string,
  partName: string,
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
    const pricingData: PartsPricingHistory = {
      part_number: partNumber,
      part_name: partName,
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
      notes: notes
    }

    const response = await fetch('/api/parts-pricing-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pricingData),
    })

    const result = await response.json()
    
    if (result.success) {
      console.log(`✅ [RECORD-PRICING] Recorded pricing history for ${partNumber}: £${priceCharged}`)
      return true
    } else {
      console.error(`❌ [RECORD-PRICING] Failed to record pricing history:`, result.error)
      return false
    }
  } catch (error) {
    console.error(`❌ [RECORD-PRICING] Error recording pricing history:`, error)
    return false
  }
}
