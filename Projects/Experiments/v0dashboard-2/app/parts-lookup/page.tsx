"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CategoryPartsSelector } from "@/components/parts/category-parts-selector"
import { 
  Car, 
  Search, 
  Loader2,
  Package,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Plus
} from "lucide-react"

interface Vehicle {
  vrm: string
  vin: string
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
  tradePrice?: number
  availability: string
  stockLevel?: number
  category: string
  subcategory?: string
  imageUrl?: string
  warranty?: string
  vehicleRegistration?: string
}

export default function PartsLookupPage() {
  const [activeTab, setActiveTab] = useState('vehicle-search')
  const [searchReg, setSearchReg] = useState('LX06XJW') // Pre-filled for testing
  const [loading, setLoading] = useState(false)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [selectedParts, setSelectedParts] = useState<Part[]>([])
  const { toast } = useToast()

  const searchVehicle = async () => {
    if (!searchReg.trim()) {
      toast({
        title: "Registration Required",
        description: "Please enter a vehicle registration number",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log(`🚗 [PARTS-LOOKUP] Searching vehicle: ${searchReg}`)

      const response = await fetch('/api/parts/ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-parts',
          query: searchReg.trim(),
          type: 'registration'
        })
      })

      const data = await response.json()

      if (data.success && data.vehicle) {
        setVehicle(data.vehicle)
        setActiveTab('parts-categories')
        toast({
          title: "Vehicle Found",
          description: `${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})`,
        })
      } else {
        setVehicle(null)
        toast({
          title: "Vehicle Not Found",
          description: data.error || "No vehicle found with that registration",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ [PARTS-LOOKUP] Vehicle search failed:', error)
      toast({
        title: "Search Error",
        description: "Failed to search for vehicle",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePartSelect = (part: Part) => {
    // Check if part is already selected
    const isAlreadySelected = selectedParts.some(p => p.partNumber === part.partNumber)
    
    if (isAlreadySelected) {
      toast({
        title: "Part Already Selected",
        description: `${part.description} is already in your selection`,
        variant: "destructive"
      })
      return
    }

    setSelectedParts(prev => [...prev, part])
    toast({
      title: "Part Added",
      description: `${part.description} added to your selection`,
    })
  }

  const removePart = (partNumber: string) => {
    setSelectedParts(prev => prev.filter(p => p.partNumber !== partNumber))
    toast({
      title: "Part Removed",
      description: "Part removed from selection",
    })
  }

  const getTotalPrice = () => {
    return selectedParts.reduce((total, part) => total + part.price, 0)
  }

  const getTotalTradePrice = () => {
    return selectedParts.reduce((total, part) => total + (part.tradePrice || part.price), 0)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Real Euro Car Parts Lookup</h1>
        <p className="text-gray-600">Live integration with Euro Car Parts Omnipart API</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vehicle-search">Vehicle Search</TabsTrigger>
          <TabsTrigger value="parts-categories" disabled={!vehicle}>Parts Categories</TabsTrigger>
          <TabsTrigger value="selected-parts">
            Selected Parts
            {selectedParts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedParts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Vehicle Search Tab */}
        <TabsContent value="vehicle-search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Lookup
              </CardTitle>
              <CardDescription>
                Enter a vehicle registration to find compatible parts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registration">Vehicle Registration</Label>
                <div className="flex gap-2">
                  <Input
                    id="registration"
                    placeholder="e.g. LT19 DHD"
                    value={searchReg}
                    onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && searchVehicle()}
                  />
                  <Button
                    onClick={searchVehicle}
                    disabled={loading || !searchReg.trim()}
                    className="min-w-[100px]"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>

              {vehicle && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {vehicle.make} {vehicle.model} ({vehicle.year})
                      </div>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <span><strong>Registration:</strong> {vehicle.vrm}</span>
                        <span><strong>VIN:</strong> {vehicle.vin}</span>
                        <span><strong>Engine:</strong> {vehicle.engine}</span>
                        <span><strong>Fuel:</strong> {vehicle.fuelType}</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {vehicle && (
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setActiveTab('parts-categories')}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Browse Parts Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Categories Tab */}
        <TabsContent value="parts-categories" className="space-y-6">
          <CategoryPartsSelector 
            vehicle={vehicle || undefined}
            onPartSelect={handlePartSelect}
          />
        </TabsContent>

        {/* Selected Parts Tab */}
        <TabsContent value="selected-parts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Selected Parts
                <Badge variant="secondary">{selectedParts.length} items</Badge>
              </CardTitle>
              <CardDescription>
                Review your selected parts and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedParts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Parts Selected</h3>
                  <p className="text-gray-600 mb-4">Browse parts categories to add items to your selection</p>
                  <Button 
                    onClick={() => setActiveTab('parts-categories')}
                    disabled={!vehicle}
                  >
                    Browse Parts
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Parts List */}
                  {selectedParts.map((part, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{part.description}</h4>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Brand:</span> {part.brand} | 
                            <span className="font-medium"> Part #:</span> {part.partNumber}
                          </p>
                          {part.vehicleRegistration && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">For:</span> {part.vehicleRegistration}
                            </p>
                          )}
                          {part.availability && (
                            <Badge variant={part.availability === 'In Stock' ? 'default' : 'secondary'} className="mt-1">
                              {part.availability}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-lg font-bold">£{part.price.toFixed(2)}</div>
                          {part.tradePrice && (
                            <div className="text-sm text-gray-600">
                              Trade: £{part.tradePrice.toFixed(2)}
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => removePart(part.partNumber)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Retail Price:</span>
                      <span className="text-xl font-bold">£{getTotalPrice().toFixed(2)}</span>
                    </div>
                    {selectedParts.some(p => p.tradePrice) && (
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Total Trade Price:</span>
                        <span className="font-semibold">£{getTotalTradePrice().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button className="flex-1">
                      Add to Job Sheet
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Create Quote
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
