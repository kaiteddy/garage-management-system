'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Search, Car, Package, Plus, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface OmnipartVehicle {
  vrm: string
  vin?: string
  make: string
  model: string
  variant: string
  year: string
  engine: string
  fuelType: string
  transmission: string
  bodyType: string
  doors: string
  engineCode?: string
}

interface OmnipartPart {
  id: string
  productCode: string
  description: string
  brand: string
  category: string
  price: number
  tradePrice: number
  vatRate: number
  availability: string
  stockLevel: number
  deliveryTime: string
  imageUrl?: string

  // Vehicle reference for ordering
  vehicleReference?: {
    vrm: string
    make: string
    model: string
    year: string
    engineCode?: string
  }

  // Brand selection options
  brandOptions?: Array<{
    brand: string
    productCode: string
    price: number
    tradePrice: number
    availability: string
    stockLevel: number
  }>

  // Ordering requirements
  requiresVehicleReference?: boolean
  orderingNotes?: string
}

interface RealOmnipartLookupProps {
  vehicleRegistration?: string
  onAddPart: (part: {
    type: string
    description: string
    qty: number
    netPrice: number
    netTotal: number
    vatRate: string
    vat: number
    lineTotal: number
    partData?: any
  }) => void
}

export function RealOmnipartLookup({ vehicleRegistration = '', onAddPart }: RealOmnipartLookupProps) {
  const [activeTab, setActiveTab] = useState('search')
  const [searchReg, setSearchReg] = useState(vehicleRegistration)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')
  
  const [vehicle, setVehicle] = useState<OmnipartVehicle | null>(null)
  const [parts, setParts] = useState<OmnipartPart[]>([])
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({})

  // Test connection on component mount
  useEffect(() => {
    testConnection()
  }, [])

  // Update search registration when prop changes
  useEffect(() => {
    if (vehicleRegistration) {
      setSearchReg(vehicleRegistration)
    }
  }, [vehicleRegistration])

  const testConnection = async () => {
    try {
      const response = await fetch('/api/parts/ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      })

      const data = await response.json()
      
      if (data.success) {
        setConnectionStatus('connected')
        console.log('✅ [OMNIPART-LOOKUP] Connected to real API')
      } else {
        setConnectionStatus('error')
        console.log('❌ [OMNIPART-LOOKUP] Connection failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('❌ [OMNIPART-LOOKUP] Connection test failed:', error)
    }
  }

  const searchByRegistration = async () => {
    if (!searchReg.trim()) {
      toast({
        title: "Error",
        description: "Please enter a vehicle registration",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log(`🔍 [OMNIPART-LOOKUP] Searching by registration: ${searchReg}`)

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

      if (data.success) {
        setVehicle(data.vehicle)
        setParts(data.parts || [])
        setActiveTab('results')
        
        toast({
          title: "Search Complete",
          description: `Found ${data.parts?.length || 0} parts for ${data.vehicle?.make} ${data.vehicle?.model}`,
        })

        console.log(`✅ [OMNIPART-LOOKUP] Found vehicle and ${data.parts?.length || 0} parts`)
      } else {
        toast({
          title: "Search Failed",
          description: data.error || "No vehicle or parts found",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ [OMNIPART-LOOKUP] Search failed:', error)
      toast({
        title: "Error",
        description: "Failed to search for parts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const searchByPartName = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a part name or description",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log(`🔍 [OMNIPART-LOOKUP] Searching by part name: ${searchTerm}`)

      const response = await fetch('/api/parts/ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-parts',
          query: searchTerm.trim(),
          type: 'part'
        })
      })

      const data = await response.json()

      if (data.success) {
        setParts(data.parts || [])
        setActiveTab('results')
        
        toast({
          title: "Search Complete",
          description: `Found ${data.parts?.length || 0} parts matching "${searchTerm}"`,
        })

        console.log(`✅ [OMNIPART-LOOKUP] Found ${data.parts?.length || 0} parts`)
      } else {
        toast({
          title: "Search Failed",
          description: data.error || "No parts found",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ [OMNIPART-LOOKUP] Search failed:', error)
      toast({
        title: "Error",
        description: "Failed to search for parts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addPartToJobSheet = (part: OmnipartPart, quantity: number = 1) => {
    const netPrice = part.tradePrice || part.price
    const netTotal = netPrice * quantity
    const vatAmount = netTotal * (part.vatRate || 0.2)
    const lineTotal = netTotal + vatAmount

    const jobSheetItem = {
      type: 'Parts',
      description: `${part.brand} ${part.description}`,
      qty: quantity,
      netPrice: netPrice,
      netTotal: netTotal,
      vatRate: `${(part.vatRate || 0.2) * 100}%`,
      vat: vatAmount,
      lineTotal: lineTotal,
      partData: {
        productCode: part.productCode,
        brand: part.brand,
        category: part.category,
        availability: part.availability,
        stockLevel: part.stockLevel,
        deliveryTime: part.deliveryTime,
        source: 'Euro Car Parts Omnipart API'
      }
    }

    onAddPart(jobSheetItem)

    toast({
      title: "Part Added",
      description: `Added ${part.brand} ${part.description} (£${netPrice.toFixed(2)}) to job sheet`,
    })

    console.log(`✅ [OMNIPART-LOOKUP] Added part to job sheet:`, jobSheetItem)
  }

  const togglePartSelection = (partId: string) => {
    const newSelection = new Set(selectedParts)
    if (newSelection.has(partId)) {
      newSelection.delete(partId)
    } else {
      newSelection.add(partId)
    }
    setSelectedParts(newSelection)
  }

  const handleBrandSelection = (partId: string, brandOption: any) => {
    setSelectedBrands(prev => ({
      ...prev,
      [partId]: brandOption.brand
    }))

    // Update the part with the selected brand information
    setParts(prevParts =>
      prevParts.map(part =>
        part.id === partId
          ? {
              ...part,
              brand: brandOption.brand,
              productCode: brandOption.productCode,
              price: brandOption.price,
              tradePrice: brandOption.tradePrice,
              availability: brandOption.availability,
              stockLevel: brandOption.stockLevel
            }
          : part
      )
    )
  }

  const addSelectedParts = () => {
    const partsToAdd = parts.filter(part => selectedParts.has(part.id))
    partsToAdd.forEach(part => addPartToJobSheet(part))
    setSelectedParts(new Set())
    
    toast({
      title: "Parts Added",
      description: `Added ${partsToAdd.length} parts to job sheet`,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Real Euro Car Parts Lookup
            </CardTitle>
            <CardDescription>
              Live integration with your Omnipart trade account
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {connectionStatus === 'unknown' && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Testing...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Parts</TabsTrigger>
            <TabsTrigger value="results">Results ({parts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            {/* Vehicle Search */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                Search by Vehicle Registration
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter registration (e.g., LN64XFG)"
                  value={searchReg}
                  onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && searchByRegistration()}
                />
                <Button 
                  onClick={searchByRegistration} 
                  disabled={loading || !searchReg.trim()}
                  className="min-w-[100px]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Part Name Search */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Search by Part Name
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter part name (e.g., brake pads, oil filter)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && searchByPartName()}
                />
                <Button 
                  onClick={searchByPartName} 
                  disabled={loading || !searchTerm.trim()}
                  className="min-w-[100px]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>
            </div>

            {/* Vehicle Info Display */}
            {vehicle && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Vehicle Found</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>{vehicle.registration}</strong> - {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.variant}
                    <br />
                    {vehicle.engine} {vehicle.fuelType}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {parts.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Found {parts.length} parts {vehicle && `for ${vehicle.make} ${vehicle.model}`}
                  </div>
                  {selectedParts.size > 0 && (
                    <Button onClick={addSelectedParts} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Selected ({selectedParts.size})
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Trade Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Vehicle Ref</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parts.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedParts.has(part.id)}
                              onChange={() => togglePartSelection(part.id)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{part.description}</div>
                              <div className="text-xs text-gray-500">
                                {part.productCode} • {part.category}
                              </div>
                              {part.orderingNotes && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {part.orderingNotes}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {part.brandOptions && part.brandOptions.length > 0 ? (
                                <Select
                                  value={selectedBrands[part.id] || part.brand}
                                  onValueChange={(value) => {
                                    const selectedOption = part.brandOptions?.find(option => option.brand === value) || {
                                      brand: part.brand,
                                      productCode: part.productCode,
                                      price: part.price,
                                      tradePrice: part.tradePrice,
                                      availability: part.availability,
                                      stockLevel: part.stockLevel
                                    }
                                    handleBrandSelection(part.id, selectedOption)
                                  }}
                                >
                                  <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={part.brand}>
                                      {part.brand} (Current)
                                    </SelectItem>
                                    {part.brandOptions.map((option, index) => (
                                      <SelectItem key={index} value={option.brand}>
                                        {option.brand}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline">{part.brand}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>£{part.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              £{(part.tradePrice || part.price).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={part.availability === 'In Stock' ? 'default' : 'secondary'}
                              className={part.availability === 'In Stock' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {part.availability}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {part.vehicleReference ? (
                              <div className="text-xs text-gray-600">
                                <div className="font-mono">{part.vehicleReference.vrm}</div>
                                <div>{part.vehicleReference.make} {part.vehicleReference.model}</div>
                                <div>{part.vehicleReference.year}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No vehicle ref</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => addPartToJobSheet(part)}
                              className="h-8"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No parts found. Try searching by vehicle registration or part name.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
