'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Car, Search, Database, DollarSign, Image, Wrench, Shield, 
  RefreshCw, Eye, TrendingUp, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { VehicleDataSelector } from '@/components/vehicle/vehicle-data-selector'

interface VehicleDataSummary {
  registration: string
  make?: string
  model?: string
  year?: number
  dataCompletenessScore: number
  lastDataUpdate?: string
  dataSources: string[]
  hasValidImage: boolean
  hasTechnicalSpecs: boolean
  hasServiceData: boolean
  totalCost: number
  lastLookupCost: number
}

export default function VehicleDataDashboard() {
  const [vehicles, setVehicles] = useState<VehicleDataSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [showDataSelector, setShowDataSelector] = useState(false)

  useEffect(() => {
    fetchVehicleData()
  }, [])

  const fetchVehicleData = async () => {
    try {
      setLoading(true)
      // This would fetch from your vehicle_data_summary view
      const response = await fetch('/api/vehicles/data-summary')
      const data = await response.json()
      setVehicles(data.vehicles || [])
    } catch (error) {
      console.error('Error fetching vehicle data:', error)
      toast({
        title: "Error",
        description: "Failed to load vehicle data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEnhanceVehicle = (registration: string) => {
    setSelectedVehicle(registration)
    setShowDataSelector(true)
  }

  const handleDataFetch = async (data: any, cost: number) => {
    // Refresh the vehicle data after enhancement
    await fetchVehicleData()
    setShowDataSelector(false)
    setSelectedVehicle(null)
    
    toast({
      title: "Vehicle data enhanced",
      description: `Cost: £${cost.toFixed(4)} | Data updated successfully`
    })
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  // Calculate summary statistics
  const totalVehicles = vehicles.length
  const averageCompleteness = vehicles.length > 0 
    ? vehicles.reduce((sum, v) => sum + v.dataCompletenessScore, 0) / vehicles.length 
    : 0
  const totalCost = vehicles.reduce((sum, v) => sum + v.totalCost, 0)
  const vehiclesWithImages = vehicles.filter(v => v.hasValidImage).length

  if (showDataSelector && selectedVehicle) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowDataSelector(false)}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
        </div>
        <VehicleDataSelector
          registration={selectedVehicle}
          onDataFetch={handleDataFetch}
          onClose={() => setShowDataSelector(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vehicle Data Dashboard</h1>
          <p className="text-muted-foreground">Monitor and enhance your vehicle database</p>
        </div>
        <Button onClick={fetchVehicleData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completeness</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompleteness.toFixed(1)}%</div>
            <Progress value={averageCompleteness} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Images</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehiclesWithImages}</div>
            <p className="text-xs text-muted-foreground">
              {totalVehicles > 0 ? ((vehiclesWithImages / totalVehicles) * 100).toFixed(1) : 0}% coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Data Overview</CardTitle>
          <CardDescription>Manage and enhance vehicle data completeness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Completeness</TableHead>
                  <TableHead>Data Sources</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading vehicle data...
                    </TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.registration}>
                      <TableCell>
                        <div>
                          <button
                            onClick={() => window.open(`/vehicle-profile/${vehicle.registration}`, '_blank')}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {vehicle.registration}
                          </button>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCompletenessIcon(vehicle.dataCompletenessScore)}
                          <span className={`font-medium ${getCompletenessColor(vehicle.dataCompletenessScore)}`}>
                            {vehicle.dataCompletenessScore}%
                          </span>
                        </div>
                        <Progress value={vehicle.dataCompletenessScore} className="w-16 mt-1" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vehicle.dataSources.map((source) => (
                            <Badge key={source} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {vehicle.hasValidImage && <Image className="h-4 w-4 text-green-600" />}
                          {vehicle.hasTechnicalSpecs && <Wrench className="h-4 w-4 text-blue-600" />}
                          {vehicle.hasServiceData && <Database className="h-4 w-4 text-purple-600" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">£{vehicle.totalCost.toFixed(4)}</div>
                          {vehicle.lastLookupCost > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Last: £{vehicle.lastLookupCost.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.lastDataUpdate 
                            ? new Date(vehicle.lastDataUpdate).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/vehicle-profile/${vehicle.registration}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEnhanceVehicle(vehicle.registration)}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Enhance
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
