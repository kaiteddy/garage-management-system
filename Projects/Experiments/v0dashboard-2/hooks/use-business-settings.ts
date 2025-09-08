"use client"

import { useState, useEffect } from 'react'

interface BusinessSettings {
  [key: string]: {
    value: any
    type: string
    category: string
    description: string
  }
}

interface Technician {
  id: number
  name: string
  email: string
  phone: string
  specialization: string
  is_active: boolean
}

interface ServiceBay {
  id: number
  name: string
  description: string
  bay_type: string
  is_active: boolean
}

interface UseBusinessSettingsReturn {
  settings: BusinessSettings
  technicians: Technician[]
  serviceBays: ServiceBay[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getSetting: (key: string, defaultValue?: any) => any
  getTechnicians: () => Technician[]
  getServiceBays: () => ServiceBay[]
}

export function useBusinessSettings(): UseBusinessSettingsReturn {
  const [settings, setSettings] = useState<BusinessSettings>({})
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [serviceBays, setServiceBays] = useState<ServiceBay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/business-settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings || {})
        setTechnicians(data.technicians || [])
        setServiceBays(data.serviceBays || [])
      } else {
        setError(data.error || 'Failed to fetch business settings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const getSetting = (key: string, defaultValue: any = null) => {
    return settings[key]?.value ?? defaultValue
  }

  const getTechnicians = () => {
    return technicians.filter(tech => tech.is_active)
  }

  const getServiceBays = () => {
    return serviceBays.filter(bay => bay.is_active)
  }

  return {
    settings,
    technicians,
    serviceBays,
    loading,
    error,
    refetch: fetchSettings,
    getSetting,
    getTechnicians,
    getServiceBays
  }
}
