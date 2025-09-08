'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  ExternalLink, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Factory,
  Car,
  Wrench
} from 'lucide-react'

interface SevenZapPart {
  id: string
  name: string
  partNumber: string
  price: string
  availability: string
  description: string
  category: string
  manufacturer: string
  imageUrl?: string
}

interface SevenZapResult {
  success: boolean
  parts: SevenZapPart[]
  totalCount: number
  searchTime: number
  method: string
  domain: string
  searchUrl?: string
  vehicle?: {
    make: string
    model: string
    year: number
    engine: string
    vin: string
  }
  error?: string
}

interface SevenZapViewerProps {
  vin: string
  onClose?: () => void
}

export function SevenZapViewer({ vin, onClose }: SevenZapViewerProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SevenZapResult | null>(null)
  const [activeTab, setActiveTab] = useState('search')

  const searchParts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/parts/search-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin,
          source: '7zap'
        })
      })
      
      const data = await response.json()
      setResult(data)
      setActiveTab('results')
    } catch (error) {
      console.error('7zap search failed:', error)
      setResult({
        success: false,
        parts: [],
        totalCount: 0,
        searchTime: 0,
        method: 'error',
        domain: '7zap.com',
        error: error instanceof Error ? error.message : 'Search failed'
      })
    } finally {
      setLoading(false)
    }
  }

  const openSevenZap = () => {
    window.open(`https://7zap.com/en/search?q=${encodeURIComponent(vin)}`, '_blank')
  }

  const getStatusIcon = (part: SevenZapPart) => {
    if (part.category === 'Integration Info') return <Info className="h-4 w-4 text-blue-500" />
    if (part.category === 'Diagnostic') return <AlertTriangle className="h-4 w-4 text-orange-500" />
    if (part.category === 'Vehicle Selection') return <Car className="h-4 w-4 text-purple-500" />
    if (part.category === 'OEM Parts') return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Wrench className="h-4 w-4 text-gray-500" />
  }

  const getStatusColor = (part: SevenZapPart) => {
    if (part.category === 'Integration Info') return 'bg-blue-50 border-blue-200'
    if (part.category === 'Diagnostic') return 'bg-orange-50 border-orange-200'
    if (part.category === 'Vehicle Selection') return 'bg-purple-50 border-purple-200'
    if (part.category === 'OEM Parts') return 'bg-green-50 border-green-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">7zap OEM Parts Catalog</h2>
            <p className="text-sm text-muted-foreground">VIN: {vin}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSevenZap} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open 7zap.com
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-blue-800">
              🔧 7zap Integration - OEM Parts Catalog
            </p>
            <p className="text-blue-700">
              7zap.com provides access to Original Equipment Manufacturer (OEM) parts catalogs. 
              This integration attempts to find parts directly from manufacturer catalogs using your VIN.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Parts</TabsTrigger>
          <TabsTrigger value="results">Results {result && `(${result.totalCount})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                VIN Parts Search
              </CardTitle>
              <CardDescription>
                Search 7zap OEM catalogs for parts compatible with VIN: {vin}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium">Search Strategy:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium">1. Main Catalog</h4>
                    <p className="text-muted-foreground">Search main 7zap catalog with VIN</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium">2. Brand Catalog</h4>
                    <p className="text-muted-foreground">Try brand-specific domain</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-medium">3. Universal Search</h4>
                    <p className="text-muted-foreground">Fallback search methods</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={searchParts} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching 7zap catalogs...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search OEM Parts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {result ? (
            <>
              {/* Search Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Status</p>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">Parts Found</p>
                      <p>{result.totalCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Search Time</p>
                      <p>{result.searchTime}ms</p>
                    </div>
                    <div>
                      <p className="font-medium">Method</p>
                      <p className="text-muted-foreground">{result.method}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Info */}
              {result.vehicle && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Vehicle Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Make</p>
                        <p>{result.vehicle.make}</p>
                      </div>
                      <div>
                        <p className="font-medium">Model</p>
                        <p>{result.vehicle.model}</p>
                      </div>
                      <div>
                        <p className="font-medium">Year</p>
                        <p>{result.vehicle.year}</p>
                      </div>
                      <div>
                        <p className="font-medium">Engine</p>
                        <p>{result.vehicle.engine}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parts Results */}
              <div className="space-y-3">
                <h3 className="font-medium">Parts & Information</h3>
                {result.parts.map((part) => (
                  <Card key={part.id} className={getStatusColor(part)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(part)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{part.name}</h4>
                            <Badge variant="outline">{part.category}</Badge>
                          </div>
                          
                          {part.partNumber && part.partNumber !== 'INFO' && part.partNumber !== 'DIAGNOSTIC' && (
                            <p className="text-sm">
                              <strong>Part Number:</strong> {part.partNumber}
                            </p>
                          )}
                          
                          {part.price && part.price !== 'N/A' && (
                            <p className="text-sm">
                              <strong>Price:</strong> {part.price}
                            </p>
                          )}
                          
                          {part.availability && (
                            <p className="text-sm">
                              <strong>Availability:</strong> {part.availability}
                            </p>
                          )}
                          
                          {part.description && (
                            <p className="text-sm text-muted-foreground">
                              {part.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Search URL */}
              {result.searchUrl && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Search URL Used</p>
                        <p className="text-xs text-muted-foreground break-all">{result.searchUrl}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(result.searchUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No search results yet. Click "Search OEM Parts" to begin.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
