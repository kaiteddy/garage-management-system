'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Car, Image, Wrench, FileText, Database, DollarSign, 
  Clock, CheckCircle, AlertTriangle, Info, Zap, Shield
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DataPackage {
  id: string
  name: string
  description: string
  cost: number
  source: 'FREE' | 'VDG' | 'SWS'
  icon: React.ReactNode
  category: 'basic' | 'technical' | 'image' | 'mot' | 'service'
  features: string[]
  recommended?: boolean
}

interface VehicleDataSelectorProps {
  registration: string
  onDataFetch: (data: any, cost: number) => void
  onClose?: () => void
  existingData?: any
}

const DATA_PACKAGES: DataPackage[] = [
  {
    id: 'basic-free',
    name: 'Basic Vehicle Data',
    description: 'Essential vehicle information from DVLA OpenData',
    cost: 0,
    source: 'FREE',
    icon: <Car className="h-4 w-4" />,
    category: 'basic',
    features: ['Make & Model', 'Year', 'Fuel Type', 'Engine Size', 'Tax Status'],
    recommended: true
  },
  {
    id: 'mot-free',
    name: 'MOT History',
    description: 'Complete MOT test history and results',
    cost: 0,
    source: 'FREE',
    icon: <Shield className="h-4 w-4" />,
    category: 'mot',
    features: ['Test Results', 'Failure Reasons', 'Advisory Items', 'Mileage History', 'Test Dates'],
    recommended: true
  },
  {
    id: 'technical-vdg',
    name: 'Technical Specifications',
    description: 'Detailed performance and technical data',
    cost: 0.14,
    source: 'VDG',
    icon: <Wrench className="h-4 w-4" />,
    category: 'technical',
    features: ['Power & Torque', 'Fuel Economy', 'Emissions', 'Performance Stats', 'Factory Specs'],
    recommended: true
  },
  {
    id: 'image-vdg',
    name: 'Vehicle Images',
    description: 'High-quality professional vehicle photos',
    cost: 0.09,
    source: 'VDG',
    icon: <Image className="h-4 w-4" />,
    category: 'image',
    features: ['Multiple Angles', 'High Resolution', 'Color Variants', 'Professional Quality']
  },
  {
    id: 'service-sws',
    name: 'Service Data',
    description: 'Oil specifications, A/C data, and repair times',
    cost: 0.48,
    source: 'SWS',
    icon: <Database className="h-4 w-4" />,
    category: 'service',
    features: ['Oil Specifications', 'A/C Gas Types', 'Repair Times', 'Service Intervals', 'Technical Procedures']
  }
]

export function VehicleDataSelector({ registration, onDataFetch, onClose, existingData }: VehicleDataSelectorProps) {
  const [selectedPackages, setSelectedPackages] = useState<string[]>(['basic-free', 'mot-free', 'technical-vdg'])
  const [loading, setLoading] = useState(false)
  const [fetchedData, setFetchedData] = useState<any>(null)
  const [completenessScore, setCompletenessScore] = useState(0)

  // Calculate total cost
  const totalCost = selectedPackages.reduce((sum, packageId) => {
    const pkg = DATA_PACKAGES.find(p => p.id === packageId)
    return sum + (pkg?.cost || 0)
  }, 0)

  // Calculate savings vs SWS
  const swsCost = 0.672 // SWS equivalent cost
  const savings = swsCost - totalCost
  const savingsPercentage = ((savings / swsCost) * 100).toFixed(0)

  // Check what data already exists
  useEffect(() => {
    if (existingData) {
      let score = 0
      if (existingData.basic) score += 30
      if (existingData.technical) score += 25
      if (existingData.image) score += 15
      if (existingData.mot) score += 20
      if (existingData.service) score += 10
      setCompletenessScore(score)
    }
  }, [existingData])

  const handlePackageToggle = (packageId: string) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    )
  }

  const handleFetchData = async () => {
    if (selectedPackages.length === 0) {
      toast({
        title: "No packages selected",
        description: "Please select at least one data package",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Map package IDs to data types
      const dataTypes = selectedPackages.map(packageId => {
        const pkg = DATA_PACKAGES.find(p => p.id === packageId)
        return pkg?.category
      }).filter(Boolean)

      console.log(`🔍 Fetching vehicle data for ${registration}:`, dataTypes)

      const response = await fetch(`/api/vehicle-data?registration=${registration}&dataTypes=${dataTypes.join(',')}`)
      const result = await response.json()

      if (result.success) {
        setFetchedData(result.data)
        onDataFetch(result.data, result.metadata.totalCost)
        
        toast({
          title: "Data fetched successfully",
          description: `Cost: £${result.metadata.totalCost.toFixed(4)} | Completeness: ${result.metadata.completenessScore}%`
        })
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch vehicle data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'FREE':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">FREE</Badge>
      case 'VDG':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">VDG</Badge>
      case 'SWS':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">SWS</Badge>
      default:
        return <Badge variant="outline">{source}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vehicle Data Selection</h2>
          <p className="text-muted-foreground">Choose which data to fetch for {registration}</p>
        </div>
        {existingData && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Data Completeness</div>
            <div className="flex items-center gap-2">
              <Progress value={completenessScore} className="w-20" />
              <span className="font-medium">{completenessScore}%</span>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="packages">Data Packages</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="existing">Existing Data</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_PACKAGES.map((pkg) => (
              <Card key={pkg.id} className={`cursor-pointer transition-all ${
                selectedPackages.includes(pkg.id) 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedPackages.includes(pkg.id)}
                        onCheckedChange={() => handlePackageToggle(pkg.id)}
                      />
                      <div className="flex items-center gap-2">
                        {pkg.icon}
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        {pkg.recommended && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Zap className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getSourceBadge(pkg.source)}
                      <div className="text-lg font-bold mt-1">
                        {pkg.cost === 0 ? 'FREE' : `£${pkg.cost.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Includes:</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">£{totalCost.toFixed(4)}</div>
                <p className="text-sm text-muted-foreground">
                  {selectedPackages.length} package{selectedPackages.length !== 1 ? 's' : ''} selected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  vs SWS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {savings > 0 ? '-' : '+'}£{Math.abs(savings).toFixed(4)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {savings > 0 ? `${savingsPercentage}% savings` : 'More expensive'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {selectedPackages.filter(id => DATA_PACKAGES.find(p => p.id === id)?.cost === 0).length}
                </div>
                <p className="text-sm text-muted-foreground">Free packages used</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedPackages.map(packageId => {
                  const pkg = DATA_PACKAGES.find(p => p.id === packageId)
                  if (!pkg) return null
                  
                  return (
                    <div key={packageId} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {pkg.icon}
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          <div className="text-sm text-muted-foreground">{pkg.source}</div>
                        </div>
                      </div>
                      <div className="font-bold">
                        {pkg.cost === 0 ? 'FREE' : `£${pkg.cost.toFixed(2)}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="space-y-4">
          {existingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(existingData).map(([dataType, data]) => (
                <Card key={dataType}>
                  <CardHeader>
                    <CardTitle className="capitalize">{dataType} Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No existing data found for this vehicle</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Total cost: <span className="font-bold">£{totalCost.toFixed(4)}</span>
          {savings > 0 && (
            <span className="text-green-600 ml-2">
              (Save £{savings.toFixed(4)} vs SWS)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleFetchData} 
            disabled={loading || selectedPackages.length === 0}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Fetch Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
