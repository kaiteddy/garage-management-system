"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  ExternalLink, 
  Settings, 
  Wrench, 
  Car, 
  Package, 
  Globe, 
  Key,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface PartsLookupProps {
  vin?: string
  registration?: string
  make?: string
  model?: string
  year?: string
  onPartSelect?: (part: any) => void
  className?: string
}

interface PartSource {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'working' | 'limited' | 'requires-auth' | 'blocked'
  authRequired: boolean
  website: string
  features: string[]
}

export function EnhancedPartsLookup({
  vin = '',
  registration = '',
  make = '',
  model = '',
  year = '',
  onPartSelect,
  className = ""
}: PartsLookupProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVin, setSelectedVin] = useState(vin)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('search')

  // Available parts sources
  const partSources: PartSource[] = [
    {
      id: '7zap',
      name: '7Zap',
      description: 'OEM parts catalog with VIN lookup',
      icon: <Car className="h-4 w-4" />,
      status: 'blocked',
      authRequired: true,
      website: 'https://7zap.com',
      features: ['OEM Parts', 'VIN Lookup', 'Diagrams', 'Genuine Parts']
    },
    {
      id: 'partsouq',
      name: 'PartSouq',
      description: 'Comprehensive parts marketplace',
      icon: <Package className="h-4 w-4" />,
      status: 'limited',
      authRequired: false,
      website: 'https://partsouq.com',
      features: ['OEM & Aftermarket', 'Price Comparison', 'Availability', 'Multiple Suppliers']
    },
    {
      id: 'eurocarparts',
      name: 'Euro Car Parts',
      description: 'UK parts retailer with API',
      icon: <Wrench className="h-4 w-4" />,
      status: 'requires-auth',
      authRequired: true,
      website: 'https://www.eurocarparts.com',
      features: ['Trade Prices', 'Stock Levels', 'Next Day Delivery', 'Professional Range']
    },
    {
      id: 'gsfcarparts',
      name: 'GSF Car Parts',
      description: 'Trade parts supplier',
      icon: <Settings className="h-4 w-4" />,
      status: 'requires-auth',
      authRequired: true,
      website: 'https://www.gsfcarparts.com',
      features: ['Trade Account', 'Bulk Pricing', 'Technical Support', 'Fast Delivery']
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800 border-green-200'
      case 'limited': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'requires-auth': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="h-3 w-3" />
      case 'limited': return <AlertCircle className="h-3 w-3" />
      case 'requires-auth': return <Key className="h-3 w-3" />
      case 'blocked': return <AlertCircle className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const searchParts = async (source: string) => {
    if (!selectedVin && !searchTerm) {
      toast.error('Please enter a VIN or part number')
      return
    }

    setLoading(true)
    setActiveTab('results')

    try {
      console.log(`🔍 [PARTS-LOOKUP] Searching ${source} for: ${selectedVin || searchTerm}`)

      const response = await fetch('/api/parts/search-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin: selectedVin,
          partNumber: searchTerm,
          source,
          make,
          model,
          year
        })
      })

      const data = await response.json()
      setResults(data)

      if (data.success && data.parts?.length > 0) {
        toast.success(`Found ${data.parts.length} parts from ${source}`)
      } else {
        toast.error(data.error || `No parts found from ${source}`)
      }

    } catch (error) {
      console.error('Parts search error:', error)
      toast.error('Failed to search for parts')
      setResults({
        success: false,
        error: 'Search failed',
        parts: []
      })
    } finally {
      setLoading(false)
    }
  }

  const openExternalSite = (source: PartSource) => {
    let url = source.website
    
    if (selectedVin) {
      // Add VIN to search URL where possible
      switch (source.id) {
        case '7zap':
          url = `https://7zap.com/en/search?q=${encodeURIComponent(selectedVin)}`
          break
        case 'partsouq':
          url = `https://partsouq.com/en/catalog/genuine/vehicle?q=${encodeURIComponent(selectedVin)}`
          break
        case 'eurocarparts':
          url = `https://www.eurocarparts.com/search?q=${encodeURIComponent(selectedVin)}`
          break
        case 'gsfcarparts':
          url = `https://www.gsfcarparts.com/search?q=${encodeURIComponent(selectedVin)}`
          break
      }
    }

    window.open(url, '_blank')
    toast.info(`Opening ${source.name} in new tab`)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enhanced Parts Lookup
          </CardTitle>
          <CardDescription>
            Search for parts across multiple suppliers and catalogs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Information */}
          {(vin || registration || make) && (
            <Alert>
              <Car className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-4 text-sm">
                  {vin && <span><strong>VIN:</strong> {vin}</span>}
                  {registration && <span><strong>Reg:</strong> {registration}</span>}
                  {make && <span><strong>Vehicle:</strong> {[make, model, year].filter(Boolean).join(' ')}</span>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN Number</Label>
              <Input
                id="vin"
                placeholder="e.g. WVWZZZ1JZ3W386752"
                value={selectedVin}
                onChange={(e) => setSelectedVin(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number / Search</Label>
              <Input
                id="partNumber"
                placeholder="e.g. brake pads, oil filter, 1K0615301"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parts Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Available Parts Sources</CardTitle>
          <CardDescription>
            Choose a parts supplier to search or browse manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partSources.map((source) => (
              <Card key={source.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {source.icon}
                      <CardTitle className="text-base">{source.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(source.status)}>
                      {getStatusIcon(source.status)}
                      <span className="ml-1 text-xs">
                        {source.status.replace('-', ' ')}
                      </span>
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {source.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Features */}
                    <div className="flex flex-wrap gap-1">
                      {source.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => searchParts(source.id)}
                        disabled={loading || (!selectedVin && !searchTerm) || source.status === 'blocked'}
                        size="sm"
                        className="flex-1"
                      >
                        {loading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Search className="h-3 w-3 mr-1" />
                        )}
                        Search
                      </Button>
                      
                      <Button
                        onClick={() => openExternalSite(source)}
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>

                    {/* Status Messages */}
                    {source.status === 'blocked' && (
                      <p className="text-xs text-red-600">
                        ⚠️ Blocked by Cloudflare - use manual search
                      </p>
                    )}
                    {source.status === 'requires-auth' && (
                      <p className="text-xs text-blue-600">
                        🔑 Requires account setup for API access
                      </p>
                    )}
                    {source.status === 'limited' && (
                      <p className="text-xs text-yellow-600">
                        ⚡ Limited functionality - manual search recommended
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {results.success 
                ? `Found ${results.parts?.length || 0} parts`
                : 'Search failed'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.success && results.parts?.length > 0 ? (
              <div className="space-y-3">
                {results.parts.map((part: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{part.name || part.description}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Part Number: {part.partNumber || part.oemNumber}
                        </p>
                        {part.price && (
                          <p className="text-sm font-medium text-green-600 mt-1">
                            {part.currency || '£'}{part.price}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => onPartSelect?.(part)}
                        size="sm"
                        variant="outline"
                      >
                        Select
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {results.error || 'No parts found'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">To improve parts lookup functionality:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><strong>7Zap:</strong> Contact 7zap.com for API access or account setup</li>
                  <li><strong>Euro Car Parts:</strong> Apply for trade account and API access</li>
                  <li><strong>GSF Car Parts:</strong> Set up trade account for better pricing</li>
                  <li><strong>PartSouq:</strong> Consider premium scraping service for better reliability</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Alternative Solutions:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Manual browsing with auto-filled VIN/part numbers</li>
                  <li>Browser bookmarks with search templates</li>
                  <li>Integration with existing parts management system</li>
                  <li>Custom parts database with supplier links</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
