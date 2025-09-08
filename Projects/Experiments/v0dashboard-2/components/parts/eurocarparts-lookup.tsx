"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Car, 
  Package, 
  Pound, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  ShoppingCart,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface Vehicle {
  registration: string
  make: string
  model: string
  variant: string
  year: string
  engine: string
  fuelType: string
  transmission: string
  bodyType: string
  doors: string
}

interface Part {
  partNumber: string
  description: string
  brand: string
  price: number
  tradePrice: number
  availability: string
  stockLevel: number
  category: string
  subcategory: string
  imageUrl?: string
  warranty?: string
}

interface EuroCarPartsLookupProps {
  registration?: string
  onVehicleFound?: (vehicle: Vehicle) => void
  onPartSelect?: (part: Part) => void
  className?: string
}

export function EuroCarPartsLookup({
  registration = '',
  onVehicleFound,
  onPartSelect,
  className = ""
}: EuroCarPartsLookupProps) {
  const [searchReg, setSearchReg] = useState(registration)
  const [partNumber, setPartNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [activeTab, setActiveTab] = useState('vehicle-lookup')

  const testConnection = async () => {
    setLoading(true)
    try {
      console.log('🧪 [ECP-LOOKUP] Testing connection...')
      
      const response = await fetch('/api/parts/eurocarparts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectionStatus('connected')
        toast.success('Connected to Euro Car Parts Omnipart')
      } else {
        setConnectionStatus('failed')
        toast.error(data.message || 'Connection failed')
      }

    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('failed')
      toast.error('Failed to test connection')
    } finally {
      setLoading(false)
    }
  }

  const lookupVehicle = async () => {
    if (!searchReg.trim()) {
      toast.error('Please enter a registration number')
      return
    }

    setLoading(true)
    try {
      console.log(`🚗 [ECP-LOOKUP] Looking up vehicle: ${searchReg}`)

      const response = await fetch('/api/parts/eurocarparts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lookup-vehicle',
          registration: searchReg
        })
      })

      const data = await response.json()

      if (data.success && data.vehicle) {
        setVehicle(data.vehicle)
        setActiveTab('vehicle-details')
        onVehicleFound?.(data.vehicle)
        toast.success(`Vehicle found: ${data.vehicle.make} ${data.vehicle.model}`)
      } else {
        setVehicle(null)
        toast.error(data.error || 'Vehicle not found')
      }

    } catch (error) {
      console.error('Vehicle lookup failed:', error)
      toast.error('Failed to lookup vehicle')
    } finally {
      setLoading(false)
    }
  }

  const searchParts = async () => {
    if (!searchReg.trim()) {
      toast.error('Please enter a registration number')
      return
    }

    setLoading(true)
    try {
      console.log(`🔍 [ECP-LOOKUP] Searching parts for: ${searchReg}`)

      const response = await fetch('/api/parts/eurocarparts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-parts-by-registration',
          registration: searchReg
        })
      })

      const data = await response.json()

      if (data.success) {
        setParts(data.parts || [])
        setVehicle(data.vehicle || vehicle)
        setActiveTab('parts-results')
        toast.success(`Found ${data.parts?.length || 0} parts`)
      } else {
        setParts([])
        toast.error(data.error || 'No parts found')
      }

    } catch (error) {
      console.error('Parts search failed:', error)
      toast.error('Failed to search parts')
    } finally {
      setLoading(false)
    }
  }

  const searchByPartNumber = async () => {
    if (!partNumber.trim()) {
      toast.error('Please enter a part number')
      return
    }

    setLoading(true)
    try {
      console.log(`🔍 [ECP-LOOKUP] Searching by part number: ${partNumber}`)

      const response = await fetch('/api/parts/eurocarparts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-parts-by-number',
          partNumber: partNumber
        })
      })

      const data = await response.json()

      if (data.success) {
        setParts(data.parts || [])
        setActiveTab('parts-results')
        toast.success(`Found ${data.parts?.length || 0} parts`)
      } else {
        setParts([])
        toast.error(data.error || 'No parts found')
      }

    } catch (error) {
      console.error('Part number search failed:', error)
      toast.error('Failed to search by part number')
    } finally {
      setLoading(false)
    }
  }

  const handlePartSelect = (part: Part) => {
    onPartSelect?.(part)
    toast.success(`Selected: ${part.description}`)
  }

  const openOmnipart = (searchTerm?: string) => {
    let url = 'https://omnipart.eurocarparts.com/'

    // If we have a search term, try to pre-populate it
    if (searchTerm) {
      // This might need adjustment based on actual Omnipart URL structure
      url += `?search=${encodeURIComponent(searchTerm)}`
    }

    window.open(url, '_blank')
    toast.info('Opening Omnipart - please login with your credentials')
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Euro Car Parts Omnipart
              </CardTitle>
              <CardDescription>
                Trade portal integration with your account credentials
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getConnectionStatusBadge()}
              <Button
                onClick={testConnection}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Test
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Trade Account Benefits:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Access to trade pricing (typically 20-40% discount)</li>
                  <li>Real-time stock levels and availability</li>
                  <li>Professional parts catalog with technical data</li>
                  <li>Next day delivery options</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicle-lookup">Vehicle Lookup</TabsTrigger>
          <TabsTrigger value="vehicle-details">Vehicle Details</TabsTrigger>
          <TabsTrigger value="parts-results">Parts Results</TabsTrigger>
        </TabsList>

        {/* Vehicle Lookup */}
        <TabsContent value="vehicle-lookup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle & Parts Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration">Registration Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="registration"
                      placeholder="e.g. AB12 CDE"
                      value={searchReg}
                      onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
                      disabled={loading}
                    />
                    <Button
                      onClick={lookupVehicle}
                      disabled={loading || !searchReg.trim()}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number Search</Label>
                  <div className="flex gap-2">
                    <Input
                      id="partNumber"
                      placeholder="e.g. BP1234, oil filter"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      disabled={loading}
                    />
                    <Button
                      onClick={searchByPartNumber}
                      disabled={loading || !partNumber.trim()}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={searchParts}
                  disabled={loading || !searchReg.trim()}
                  className="flex-1"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Search All Parts for Vehicle
                </Button>
                
                <Button
                  onClick={openOmnipart}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Omnipart
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Details */}
        <TabsContent value="vehicle-details">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Registration</Label>
                      <p className="font-medium">{vehicle.registration}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Make & Model</Label>
                      <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Variant</Label>
                      <p className="font-medium">{vehicle.variant || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Year</Label>
                      <p className="font-medium">{vehicle.year}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Engine</Label>
                      <p className="font-medium">{vehicle.engine}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                      <p className="font-medium">{vehicle.fuelType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Transmission</Label>
                      <p className="font-medium">{vehicle.transmission}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Body Type</Label>
                      <p className="font-medium">{vehicle.bodyType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Doors</Label>
                      <p className="font-medium">{vehicle.doors}</p>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={searchParts}
                    disabled={loading}
                    className="w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Search Parts for This Vehicle
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vehicle selected. Use the Vehicle Lookup tab to find a vehicle.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Results */}
        <TabsContent value="parts-results">
          <Card>
            <CardHeader>
              <CardTitle>Parts Results ({parts?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {parts && parts.length > 0 ? (
                <div className="space-y-3">
                  {parts.map((part, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{part.description}</h4>
                            <Badge variant="outline">{part.brand}</Badge>
                            <Badge className={part.stockLevel > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {part.availability}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">Part Number</Label>
                              <p className="font-mono">{part.partNumber}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Category</Label>
                              <p>{part.category}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Trade Price</Label>
                              <p className="font-medium text-green-600">£{part.tradePrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Stock Level</Label>
                              <p>{part.stockLevel}</p>
                            </div>
                          </div>

                          {part.warranty && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Warranty: {part.warranty}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handlePartSelect(part)}
                          size="sm"
                          className="ml-4"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Select
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No parts found. Try searching by registration or part number.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
