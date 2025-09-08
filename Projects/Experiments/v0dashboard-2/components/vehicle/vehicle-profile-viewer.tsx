'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Car, Settings, Shield, DollarSign, Eye, ArrowLeft, RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface VehicleProfileData {
  registration: string
  make?: string
  model?: string
  year?: number
  derivative?: string
  bodyStyle?: string
  doors?: number
  transmission?: string
  fuelType?: string
  colour?: string
  
  // Technical specifications
  engineCapacityCC?: number
  powerBHP?: number
  torqueNM?: number
  fuelEconomyCombinedMPG?: number
  co2Emissions?: number
  euroStatus?: string
  
  // Image data
  imageUrl?: string
  imageExpiryDate?: string
  
  // Service data
  serviceData?: any
  technicalSpecs?: any
  factoryOptions?: any
  
  // MOT data
  motHistory?: any[]
  motExpiryDate?: string
  
  // Metadata
  dataSources?: string[]
  lastDataUpdate?: string
  dataCompletenessScore?: number
  totalCost?: number
}

interface VehicleProfileViewerProps {
  registration: string
  onClose?: () => void
  onEnhance?: () => void
  onRefresh?: () => void
}

export function VehicleProfileViewer({ registration, onClose, onEnhance, onRefresh }: VehicleProfileViewerProps) {
  const [vehicleData, setVehicleData] = useState<VehicleProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')

  useEffect(() => {
    fetchVehicleProfile()
  }, [registration])

  const fetchVehicleProfile = async () => {
    try {
      setLoading(true)
      // Reduced logging for performance

      // First try to get fresh data from our enhanced vehicle data API
      const enhancedResponse = await fetch(`/api/vehicle-data?registration=${encodeURIComponent(registration)}&dataTypes=basic,technical,image`)
      const enhancedResult = await enhancedResponse.json()

      if (enhancedResult.success && enhancedResult.data) {
        // Reduced logging for performance

        // Transform enhanced API data to vehicle profile format
        const basicData = enhancedResult.data?.basic
        const technicalData = enhancedResult.data?.technical
        const imageData = enhancedResult.data?.image

        // Merge all data sources, prioritizing technical data
        const mergedData = {
          ...basicData,
          ...technicalData
        }

        // Reduced logging for performance

        // Extract specifications if available from any source
        let specs = {}

        // Helper function to extract numeric value from specification description
        const extractNumericValue = (description: string) => {
          if (!description) return null
          const match = description.match(/[\d.]+/)
          return match ? parseFloat(match[0]) : null
        }

        // Check technical data specifications first
        if (technicalData?.specifications && Array.isArray(technicalData.specifications)) {
          technicalData.specifications.forEach((spec: any) => {
            if (spec.name && (spec.value || spec.description)) {
              const name = spec.name.toLowerCase()
              const value = spec.description || spec.value

              if (name.includes('engine') && name.includes('capacity')) {
                specs.engineCapacityCC = extractNumericValue(value)
              } else if (name === 'power') {
                specs.powerBHP = extractNumericValue(value)
              } else if (name === 'torque') {
                specs.torqueNM = extractNumericValue(value)
              } else if (name.includes('fuel economy') && name.includes('combined')) {
                specs.fuelEconomyCombinedMPG = extractNumericValue(value)
              } else if (name.includes('co2') && name.includes('emissions')) {
                specs.co2Emissions = extractNumericValue(value)
              } else if (name.includes('euro') && name.includes('status')) {
                specs.euroStatus = value
              }
            }
          })
        }

        // Check basic data specifications as fallback
        if (basicData?.specifications && Array.isArray(basicData.specifications)) {
          basicData.specifications.forEach((spec: any) => {
            if (spec.name && (spec.value || spec.description)) {
              const name = spec.name.toLowerCase()
              const value = spec.description || spec.value

              if (!specs.engineCapacityCC && name.includes('engine') && name.includes('capacity')) {
                specs.engineCapacityCC = extractNumericValue(value)
              } else if (!specs.powerBHP && name === 'power') {
                specs.powerBHP = extractNumericValue(value)
              } else if (!specs.torqueNM && name === 'torque') {
                specs.torqueNM = extractNumericValue(value)
              } else if (!specs.fuelEconomyCombinedMPG && name.includes('fuel economy') && name.includes('combined')) {
                specs.fuelEconomyCombinedMPG = extractNumericValue(value)
              } else if (!specs.co2Emissions && name.includes('co2') && name.includes('emissions')) {
                specs.co2Emissions = extractNumericValue(value)
              } else if (!specs.euroStatus && name.includes('euro') && name.includes('status')) {
                specs.euroStatus = value
              }
            }
          })
        }

        // Reduced logging for performance

        // Helper function to safely parse numeric values
        const parseNumeric = (value: any) => {
          if (!value) return null
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const parsed = parseInt(value.replace(/[^\d]/g, ''))
            return isNaN(parsed) ? null : parsed
          }
          return null
        }

        const transformedData = {
          registration: registration,
          make: mergedData?.make || 'Unknown',
          model: mergedData?.model || 'Unknown',
          year: mergedData?.year || mergedData?.yearOfManufacture || null,
          derivative: mergedData?.derivative || mergedData?.variant || null,
          bodyStyle: mergedData?.bodyStyle || mergedData?.bodyType || null,
          doors: mergedData?.doors || mergedData?.numberOfDoors || null,
          transmission: mergedData?.transmission || mergedData?.gearbox || null,
          fuelType: mergedData?.fuelType || mergedData?.fuel || null,
          colour: mergedData?.colour || mergedData?.color || null,

          // Technical specifications - prioritize extracted specs from API specifications array
          engineCapacityCC: specs.engineCapacityCC ||
                           parseNumeric(mergedData?.engineCapacityCC) ||
                           parseNumeric(mergedData?.engineSize) ||
                           parseNumeric(mergedData?.engine_capacity_cc) ||
                           parseNumeric(mergedData?.engine_size) ||
                           null,

          powerBHP: specs.powerBHP ||
                   parseNumeric(mergedData?.powerBHP) ||
                   parseNumeric(mergedData?.power) ||
                   parseNumeric(mergedData?.power_bhp) ||
                   parseNumeric(mergedData?.maxPower) ||
                   null,

          torqueNM: specs.torqueNM ||
                   parseNumeric(mergedData?.torqueNM) ||
                   parseNumeric(mergedData?.torque) ||
                   parseNumeric(mergedData?.torque_nm) ||
                   parseNumeric(mergedData?.maxTorque) ||
                   null,

          fuelEconomyCombinedMPG: specs.fuelEconomyCombinedMPG ||
                                 parseNumeric(mergedData?.fuelEconomyCombinedMPG) ||
                                 parseNumeric(mergedData?.fuelEconomy) ||
                                 parseNumeric(mergedData?.fuel_economy_combined) ||
                                 parseNumeric(mergedData?.combinedMPG) ||
                                 null,

          co2Emissions: specs.co2Emissions ||
                       parseNumeric(mergedData?.co2Emissions) ||
                       parseNumeric(mergedData?.co2) ||
                       parseNumeric(mergedData?.co2_emissions) ||
                       null,

          euroStatus: specs.euroStatus ||
                     mergedData?.euroStatus ||
                     mergedData?.euro_status ||
                     mergedData?.euroEmissionStandard ||
                     null,

          // Image data
          imageUrl: imageData?.imageUrl || mergedData?.imageUrl || null,
          imageExpiryDate: imageData?.imageExpiryDate || mergedData?.imageExpiryDate || null,

          // Service data
          serviceData: mergedData?.serviceData || null,

          // Metadata
          dataSources: enhancedResult.metadata?.sources || enhancedResult.sources || [],
          totalCost: enhancedResult.metadata?.totalCost || enhancedResult.totalCost || 0,
          totalRequests: enhancedResult.metadata?.apiCalls || enhancedResult.apiCalls || 0,
          dataCompletenessScore: enhancedResult.metadata?.completenessScore || enhancedResult.completenessScore || 0,
          lastDataUpdate: new Date().toISOString()
        }

        // Calculate local completeness score to override API score
        const calculateLocalCompletenessScore = (data: any) => {
          const criticalFields = [
            'make', 'model', 'year', 'derivative', 'bodyStyle', 'doors',
            'transmission', 'fuelType', 'colour', 'engineCapacityCC',
            'powerBHP', 'torqueNM', 'fuelEconomyCombinedMPG', 'co2Emissions', 'euroStatus'
          ]

          const filledFields = criticalFields.filter(field => {
            const value = data[field]
            return value !== null && value !== undefined && value !== '' && value !== 'Unknown' && value !== 'N/A'
          })

          const score = Math.round((filledFields.length / criticalFields.length) * 100)
          // Reduced logging for performance

          return score
        }

        // Override the API completeness score with our local calculation
        const localCompletenessScore = calculateLocalCompletenessScore(transformedData)
        transformedData.dataCompletenessScore = localCompletenessScore

        // Reduced logging for performance
        setVehicleData(transformedData)

      } else {
        // Fallback to database profile if enhanced API fails
        // Reduced logging for performance
        const response = await fetch(`/api/vehicles/profile/${registration}`)
        const result = await response.json()

        if (result.success) {
          setVehicleData(result.vehicle)
        } else {
          throw new Error(result.error || 'Failed to fetch vehicle profile')
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle profile:', error)
      toast({
        title: "Error",
        description: "Failed to load vehicle profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchVehicleProfile()
    setRefreshing(false)
  }

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompletenessIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const handleEnhanceData = async (packageType: 'basic' | 'comprehensive') => {
    if (!vehicleData?.registration) return

    try {
      setRefreshing(true)
      console.log(`🔍 [FRONTEND] Enhancing data for ${vehicleData.registration} with ${packageType} package`)

      const requestBody = {
        packageType,
        useComprehensiveData: packageType === 'comprehensive'
      }

      console.log(`📤 [FRONTEND] Request body:`, requestBody)
      console.log(`🌐 [FRONTEND] Making request to: /api/vehicles/${vehicleData.registration}/enhance-data`)

      const response = await fetch(`/api/vehicles/${vehicleData.registration}/enhance-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log(`📡 [FRONTEND] Response status: ${response.status}`)
      console.log(`📡 [FRONTEND] Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [FRONTEND] HTTP Error ${response.status}:`, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log(`📥 [FRONTEND] Response data:`, result)

      if (result.success) {
        console.log(`✅ [FRONTEND] Data enhanced successfully. Cost: £${result.cost?.toFixed(4) || '0.0000'}`)

        // Refresh the vehicle data to show the enhanced information
        await fetchVehicleProfile()

        // Show success message
        toast({
          title: "✅ Vehicle data enhanced successfully!",
          description: `Cost: £${result.cost?.toFixed(4) || '0.0000'} | Fields enhanced: ${result.fieldsEnhanced?.join(', ') || 'N/A'}`,
          duration: 5000,
        })
      } else {
        console.error('❌ [FRONTEND] Failed to enhance data:', result.error)
        toast({
          title: "❌ Failed to enhance vehicle data",
          description: result.error,
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error enhancing data:', error)
      console.error('❌ [FRONTEND] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        registration: vehicleData?.registration,
        packageType
      })

      toast({
        title: "❌ Error enhancing vehicle data",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading vehicle profile...</span>
        </div>
      </div>
    )
  }

  if (!vehicleData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Vehicle profile not found</p>
            <Button onClick={onClose} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{vehicleData.registration}</h1>
            <p className="text-sm text-gray-600">
              {vehicleData.make} {vehicleData.model} {vehicleData.derivative && `• ${vehicleData.derivative}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            £{(vehicleData.totalCost || 0).toFixed(3)} cost
          </Badge>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left Column - Vehicle Image */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardContent className="p-4">
              {vehicleData.imageUrl ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={vehicleData.imageUrl}
                      alt={`${vehicleData.make} ${vehicleData.model}`}
                      className="w-full h-auto rounded-lg border shadow-sm"
                      onError={(e) => {
                        console.error('❌ [IMAGE] Failed to load:', vehicleData.imageUrl)
                        e.currentTarget.style.display = 'none'
                        const placeholder = e.currentTarget.parentElement?.nextElementSibling as HTMLElement
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                      onLoad={() => {
                        console.log('✅ [IMAGE] Loaded successfully:', vehicleData.imageUrl)
                      }}
                    />
                  </div>
                  {/* Hidden placeholder for when image fails to load */}
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
                    <div className="text-center text-gray-400">
                      <Car className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Image failed to load</p>
                      <p className="text-xs mt-1">VDG API image unavailable</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      Professional VDG Image (£0.02)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Car className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No image available</p>
                    <p className="text-xs mt-1">Try fetching enhanced data</p>
                    {onEnhance && (
                      <Button onClick={onEnhance} size="sm" className="mt-2">
                        Get Image (£0.02)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Information Sections */}
        <div className="lg:col-span-2 space-y-4">

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant={activeSection === 'basic' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setActiveSection('basic')}
            >
              <Car className="h-4 w-4" />
              <span className="text-xs">Basic Info</span>
            </Button>
            <Button
              variant={activeSection === 'technical' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setActiveSection('technical')}
            >
              <Settings className="h-4 w-4" />
              <span className="text-xs">Technical</span>
            </Button>
            <Button
              variant={activeSection === 'mot' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setActiveSection('mot')}
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs">MOT History</span>
            </Button>
            <Button
              variant={activeSection === 'cost' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setActiveSection('cost')}
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Data Sources</span>
            </Button>
          </div>

          {/* Content Section */}
          <Card>
            <CardContent className="p-4">
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Basic Vehicle Information</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration:</span>
                      <span className="font-medium">{vehicleData.registration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Make:</span>
                      <span className="font-medium">{vehicleData.make || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model:</span>
                      <span className="font-medium">{vehicleData.model || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year:</span>
                      <span className="font-medium">{vehicleData.year || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Derivative:</span>
                      <span className="font-medium">{vehicleData.derivative || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Body Style:</span>
                      <span className="font-medium">{vehicleData.bodyStyle || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doors:</span>
                      <span className="font-medium">{vehicleData.doors || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transmission:</span>
                      <span className="font-medium">{vehicleData.transmission || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Type:</span>
                      <span className="font-medium">{vehicleData.fuelType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Colour:</span>
                      <span className="font-medium">{vehicleData.colour || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'technical' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Technical Specifications</h3>

                  {/* Technical Data Grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Engine Size:</span>
                      <span className="font-medium">{vehicleData.engineCapacityCC ? `${vehicleData.engineCapacityCC}cc` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Power:</span>
                      <span className="font-medium">{vehicleData.powerBHP ? `${vehicleData.powerBHP} BHP` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Torque:</span>
                      <span className="font-medium">{vehicleData.torqueNM ? `${vehicleData.torqueNM} NM` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Economy:</span>
                      <span className="font-medium">{vehicleData.fuelEconomyCombinedMPG ? `${vehicleData.fuelEconomyCombinedMPG} MPG` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CO2 Emissions:</span>
                      <span className="font-medium">{vehicleData.co2Emissions ? `${vehicleData.co2Emissions} g/km` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Euro Status:</span>
                      <span className="font-medium">{vehicleData.euroStatus || vehicleData.euro_status || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Engine Code:</span>
                      <span className="font-medium">{vehicleData.engineCode || vehicleData.engine_code || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Check if there are significant missing technical data values that can be enhanced */}
                  {(() => {
                    const criticalFields = [
                      vehicleData.powerBHP,
                      vehicleData.torqueNM,
                      vehicleData.fuelEconomyCombinedMPG,
                      vehicleData.co2Emissions,
                      vehicleData.euroStatus
                    ];
                    const missingCriticalFields = criticalFields.filter(field => !field || field === 'N/A').length;
                    return missingCriticalFields >= 3; // Show warning only if 3 or more critical fields are missing
                  })() && (
                    <div className="mt-6 text-center py-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-yellow-800">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <p className="font-medium">Missing Technical Data Detected</p>
                        <p className="text-sm mt-1">Some technical specifications are missing. Enhance with VDG API to fill gaps.</p>
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-yellow-700 mb-3">Choose data package:</div>
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => handleEnhanceData('basic')}
                              className="text-xs py-1 px-3"
                              size="sm"
                              variant="outline"
                            >
                              Basic Data (£0.14)
                            </Button>
                            <Button
                              onClick={() => handleEnhanceData('comprehensive')}
                              className="text-xs py-1 px-3"
                              size="sm"
                            >
                              Comprehensive Data (£0.40) - Eliminates N/A
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  )

                  {/* Tyre Information */}
                  {(vehicleData.tyreSizeFront || vehicleData.tyre_size_front || vehicleData.tyrePressureFront || vehicleData.tyre_pressure_front) && (
                    <div className="mt-6 pt-4 border-t bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Tyre Specifications
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-orange-700">Front Tyre Size:</span>
                          <span className="font-medium text-orange-900">{vehicleData.tyreSizeFront || vehicleData.tyre_size_front || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-700">Rear Tyre Size:</span>
                          <span className="font-medium text-orange-900">{vehicleData.tyreSizeRear || vehicleData.tyre_size_rear || vehicleData.tyreSizeFront || vehicleData.tyre_size_front || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-700">Front Pressure:</span>
                          <span className="font-medium text-orange-900">{vehicleData.tyrePressureFront || vehicleData.tyre_pressure_front || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-700">Rear Pressure:</span>
                          <span className="font-medium text-orange-900">{vehicleData.tyrePressureRear || vehicleData.tyre_pressure_rear || vehicleData.tyrePressureFront || vehicleData.tyre_pressure_front || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service Information - Always show if available */}
                  {(vehicleData.serviceData && Object.keys(vehicleData.serviceData).length > 0) || vehicleData.timingBeltInterval || vehicleData.timing_belt_interval ? (
                    <div className="mt-6 pt-4 border-t bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Critical Service Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        {vehicleData.serviceData?.oilSpecification && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Oil Specification:</span>
                            <span className="font-medium text-blue-900">{vehicleData.serviceData.oilSpecification}</span>
                          </div>
                        )}
                        {vehicleData.serviceData?.oilCapacity && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Oil Capacity:</span>
                            <span className="font-medium text-blue-900">{vehicleData.serviceData.oilCapacity}</span>
                          </div>
                        )}
                        {vehicleData.serviceData?.sparkPlugs && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Spark Plugs:</span>
                            <span className="font-medium text-blue-900">{vehicleData.serviceData.sparkPlugs}</span>
                          </div>
                        )}
                        {(vehicleData.timingBeltInterval || vehicleData.timing_belt_interval) && (
                          <div className="flex justify-between">
                            <span className="text-blue-700">Timing Belt Interval:</span>
                            <span className="font-medium text-blue-900">{vehicleData.timingBeltInterval || vehicleData.timing_belt_interval}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {activeSection === 'mot' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">MOT History & Compliance</h3>
                  {vehicleData.motHistory && vehicleData.motHistory.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">MOT Expiry:</span>
                        <Badge variant={vehicleData.motExpiryDate ? 'default' : 'destructive'}>
                          {vehicleData.motExpiryDate ? formatDate(vehicleData.motExpiryDate) : 'No Data'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Recent Tests</h4>
                        {vehicleData.motHistory.slice(0, 3).map((test: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{formatDate(test.testDate)}</div>
                              <div className="text-xs text-gray-600">{test.testResult}</div>
                            </div>
                            <Badge variant={test.testResult === 'PASS' ? 'default' : 'destructive'}>
                              {test.testResult}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No MOT history available</p>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'cost' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">API Usage & Data Sources</h3>

                  {/* Cost Summary */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-green-800">Total API Cost:</span>
                      <span className="font-bold text-green-600 text-lg">£{(vehicleData.totalCost || 0).toFixed(4)}</span>
                    </div>
                    <div className="text-sm text-green-700">
                      {vehicleData.totalRequests || 0} API requests made • Professional vehicle data
                    </div>
                  </div>

                  {/* API Sources Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Data Sources Used</h4>

                    {vehicleData.dataSources && vehicleData.dataSources.length > 0 ? (
                      <div className="space-y-2">
                        {vehicleData.dataSources.map((source: string, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full" />
                              <span className="font-medium">{source}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {source.includes('VDG') && '£0.02 per lookup'}
                              {source.includes('DVLA') && 'Free'}
                              {source.includes('MOT') && 'Free'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <div className="text-sm">No API sources recorded</div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Data Quality Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Data Quality</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vehicleData.imageUrl ? 'bg-green-500' : 'bg-red-500'}`} />
                          Vehicle Image
                        </span>
                        <span className={vehicleData.imageUrl ? 'text-green-600' : 'text-red-600'}>
                          {vehicleData.imageUrl ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vehicleData.engineCapacityCC ? 'bg-green-500' : 'bg-red-500'}`} />
                          Technical Data
                        </span>
                        <span className={vehicleData.engineCapacityCC ? 'text-green-600' : 'text-red-600'}>
                          {vehicleData.engineCapacityCC ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vehicleData.motHistory?.length ? 'bg-green-500' : 'bg-red-500'}`} />
                          MOT History
                        </span>
                        <span className={vehicleData.motHistory?.length ? 'text-green-600' : 'text-red-600'}>
                          {vehicleData.motHistory?.length ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${vehicleData.serviceData ? 'bg-green-500' : 'bg-red-500'}`} />
                          Service Data
                        </span>
                        <span className={vehicleData.serviceData ? 'text-green-600' : 'text-red-600'}>
                          {vehicleData.serviceData ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
