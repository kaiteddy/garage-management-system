"use client"

import { useState, useCallback } from 'react'
import { VehicleOilData } from '@/app/api/vehicle-oils/route'

interface UseVehicleOilsReturn {
  oilData: VehicleOilData | null
  loading: boolean
  error: string | null
  fetchOilData: (vin: string, vehicleInfo?: {
    make?: string
    model?: string
    year?: string
    engineSize?: string
    fuelType?: string
  }) => Promise<void>
  clearOilData: () => void
}

export function useVehicleOils(): UseVehicleOilsReturn {
  const [oilData, setOilData] = useState<VehicleOilData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOilData = useCallback(async (
    vin: string,
    vehicleInfo?: {
      make?: string
      model?: string
      year?: string
      engineSize?: string
      fuelType?: string
      registration?: string
    }
  ) => {
    if (!vin || vin.length !== 17) {
      setError('Valid 17-character VIN is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🛢️ [USE-VEHICLE-OILS] Fetching oil data for VIN: ${vin}`)

      // First, try to get oil data from database if we have registration
      if (vehicleInfo?.registration) {
        try {
          console.log(`💾 [USE-VEHICLE-OILS] Checking database for existing oil data...`)
          const dbResponse = await fetch(`/api/vehicles?registration=${encodeURIComponent(vehicleInfo.registration)}`)
          const dbData = await dbResponse.json()

          if (dbData.success && dbData.data?.oil_data) {
            console.log('✅ [USE-VEHICLE-OILS] Found existing oil data in database')
            const existingOilData = typeof dbData.data.oil_data === 'string'
              ? JSON.parse(dbData.data.oil_data)
              : dbData.data.oil_data

            setOilData(existingOilData)
            setLoading(false)
            return // Use database data, don't call API
          }
        } catch (dbError) {
          console.warn('⚠️ [USE-VEHICLE-OILS] Could not load from database, falling back to API:', dbError)
        }
      }

      // If no database data, fetch from API
      console.log(`🌐 [USE-VEHICLE-OILS] Fetching fresh oil data from API...`)
      const response = await fetch('/api/vehicle-oils', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vin,
          ...vehicleInfo
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.success && data.data) {
        setOilData(data.data)
        console.log(`✅ [USE-VEHICLE-OILS] Oil data loaded from API:`, data.data)
      } else {
        throw new Error(data.error || 'No oil data returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch oil data'
      console.error('❌ [USE-VEHICLE-OILS] Error:', errorMessage)
      setError(errorMessage)
      setOilData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearOilData = useCallback(() => {
    setOilData(null)
    setError(null)
  }, [])

  return {
    oilData,
    loading,
    error,
    fetchOilData,
    clearOilData
  }
}
