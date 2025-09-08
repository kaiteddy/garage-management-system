"use client"

import { useState, useCallback } from 'react'

export interface VehicleTechnicalData {
  vrm: string
  vin: string
  metadata: {
    make: string
    model: string
    year: string
    engineSize: string
    fuelType: string
    transmission: string
    bodyType: string
    doors: number
    seats: number
    co2Emissions: number
    engineCode: string
    derivative: string
    colour: string
  }
  lubricants: {
    engineOil: {
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
      filterPartNumber?: string
    }
    transmissionOil?: {
      type: string
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    brakeFluid: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    coolant: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
      mixRatio?: string
    }
    powerSteeringFluid?: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    airConRefrigerant?: {
      type: string
      capacity: number
      specification: string
      partNumber: string
    }
    differentialOil?: {
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
  }
  repairTimes: {
    [operation: string]: {
      description: string
      timeHours: number
      difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
      category: string
      notes?: string
    }
  }
  diagrams?: {
    wiring?: string[]
    parts?: string[]
    maintenance?: string[]
  }
}

interface UseVehicleTechnicalDataReturn {
  technicalData: VehicleTechnicalData | null
  loading: boolean
  error: string | null
  fetchTechnicalData: (vrm?: string, vin?: string) => Promise<void>
  clearTechnicalData: () => void
  getRepairTime: (operation: string) => number | null
  getLubricantByType: (type: string) => any | null
}

export function useVehicleTechnicalData(): UseVehicleTechnicalDataReturn {
  const [technicalData, setTechnicalData] = useState<VehicleTechnicalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTechnicalData = useCallback(async (vrm?: string, vin?: string) => {
    if (!vrm && !vin) {
      setError('VRM or VIN is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 [USE-TECH-DATA] Fetching technical data for VRM: ${vrm}, VIN: ${vin}`)

      // First try to get cached data
      const cacheParams = new URLSearchParams()
      if (vrm) cacheParams.set('vrm', vrm)
      if (vin) cacheParams.set('vin', vin)

      const cacheResponse = await fetch(`/api/vehicle-technical-data?${cacheParams}`)
      
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json()
        if (cacheData.success) {
          console.log('💾 [USE-TECH-DATA] Using cached technical data')
          setTechnicalData(cacheData.data)
          setLoading(false)
          return
        }
      }

      // If no cache, fetch fresh data
      console.log('🌐 [USE-TECH-DATA] Fetching fresh technical data from API')
      const response = await fetch('/api/vehicle-technical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vrm, vin })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.success && data.data) {
        setTechnicalData(data.data)
        console.log('✅ [USE-TECH-DATA] Technical data loaded successfully')
      } else {
        throw new Error(data.error || 'No technical data returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch technical data'
      console.error('❌ [USE-TECH-DATA] Error:', errorMessage)
      setError(errorMessage)
      setTechnicalData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearTechnicalData = useCallback(() => {
    setTechnicalData(null)
    setError(null)
  }, [])

  const getRepairTime = useCallback((operation: string): number | null => {
    if (!technicalData?.repairTimes) return null
    
    // Try exact match first
    if (technicalData.repairTimes[operation]) {
      return technicalData.repairTimes[operation].timeHours
    }

    // Try partial match
    const matchingKey = Object.keys(technicalData.repairTimes).find(key =>
      key.toLowerCase().includes(operation.toLowerCase()) ||
      operation.toLowerCase().includes(key.toLowerCase())
    )

    return matchingKey ? technicalData.repairTimes[matchingKey].timeHours : null
  }, [technicalData])

  const getLubricantByType = useCallback((type: string): any | null => {
    if (!technicalData?.lubricants) return null

    const lowerType = type.toLowerCase()
    
    if (lowerType.includes('engine') || lowerType.includes('motor')) {
      return technicalData.lubricants.engineOil
    }
    if (lowerType.includes('transmission') || lowerType.includes('gearbox')) {
      return technicalData.lubricants.transmissionOil
    }
    if (lowerType.includes('brake')) {
      return technicalData.lubricants.brakeFluid
    }
    if (lowerType.includes('coolant') || lowerType.includes('antifreeze')) {
      return technicalData.lubricants.coolant
    }
    if (lowerType.includes('power steering')) {
      return technicalData.lubricants.powerSteeringFluid
    }
    if (lowerType.includes('air con') || lowerType.includes('refrigerant')) {
      return technicalData.lubricants.airConRefrigerant
    }
    if (lowerType.includes('differential')) {
      return technicalData.lubricants.differentialOil
    }

    return null
  }, [technicalData])

  return {
    technicalData,
    loading,
    error,
    fetchTechnicalData,
    clearTechnicalData,
    getRepairTime,
    getLubricantByType
  }
}
