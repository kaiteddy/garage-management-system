"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  ExternalLink, 
  Copy, 
  Zap, 
  Car, 
  Package, 
  Globe,
  CheckCircle,
  Bookmark,
  Clock
} from "lucide-react"
import { toast } from "sonner"

interface SmartPartsAssistantProps {
  vin?: string
  registration?: string
  make?: string
  model?: string
  year?: string
  onPartAdd?: (part: any) => void
  className?: string
}

interface QuickLink {
  name: string
  url: string
  description: string
  icon: React.ReactNode
  category: 'oem' | 'aftermarket' | 'trade'
}

export function SmartPartsAssistant({
  vin = '',
  registration = '',
  make = '',
  model = '',
  year = '',
  onPartAdd,
  className = ""
}: SmartPartsAssistantProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVin, setSelectedVin] = useState(vin)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Smart quick links that auto-populate with vehicle data
  const generateQuickLinks = (): QuickLink[] => {
    const vehicleQuery = selectedVin || `${make} ${model} ${year}`.trim()
    const partQuery = searchTerm || 'parts'
    
    return [
      {
        name: '7Zap',
        url: `https://7zap.com/en/search?q=${encodeURIComponent(vehicleQuery)}`,
        description: 'OEM parts catalog with diagrams',
        icon: <Car className="h-4 w-4" />,
        category: 'oem'
      },
      {
        name: 'PartSouq',
        url: selectedVin 
          ? `https://partsouq.com/en/catalog/genuine/vehicle?q=${encodeURIComponent(selectedVin)}`
          : `https://partsouq.com/en/search?q=${encodeURIComponent(vehicleQuery)}`,
        description: 'Genuine and aftermarket parts',
        icon: <Package className="h-4 w-4" />,
        category: 'oem'
      },
      {
        name: 'Euro Car Parts',
        url: `https://www.eurocarparts.com/search?q=${encodeURIComponent(vehicleQuery + ' ' + partQuery)}`,
        description: 'Trade pricing available',
        icon: <Globe className="h-4 w-4" />,
        category: 'trade'
      },
      {
        name: 'GSF Car Parts',
        url: `https://www.gsfcarparts.com/search?q=${encodeURIComponent(vehicleQuery + ' ' + partQuery)}`,
        description: 'Professional parts supplier',
        icon: <Globe className="h-4 w-4" />,
        category: 'trade'
      },
      {
        name: 'Motor Factor',
        url: `https://www.motorfactor.co.uk/search?q=${encodeURIComponent(vehicleQuery + ' ' + partQuery)}`,
        description: 'Independent parts specialist',
        icon: <Package className="h-4 w-4" />,
        category: 'aftermarket'
      },
      {
        name: 'Car Parts 4 Less',
        url: `https://www.carparts4less.co.uk/search?q=${encodeURIComponent(vehicleQuery + ' ' + partQuery)}`,
        description: 'Budget-friendly options',
        icon: <Package className="h-4 w-4" />,
        category: 'aftermarket'
      }
    ]
  }

  const openQuickLink = (link: QuickLink) => {
    window.open(link.url, '_blank')
    
    // Add to recent searches
    const searchKey = `${selectedVin || make} - ${searchTerm || 'general'}`
    setRecentSearches(prev => {
      const updated = [searchKey, ...prev.filter(s => s !== searchKey)].slice(0, 5)
      return updated
    })
    
    toast.success(`Opened ${link.name} in new tab`)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const openAllOEM = () => {
    const oemLinks = generateQuickLinks().filter(link => link.category === 'oem')
    oemLinks.forEach(link => window.open(link.url, '_blank'))
    toast.success(`Opened ${oemLinks.length} OEM parts sites`)
  }

  const openAllTrade = () => {
    const tradeLinks = generateQuickLinks().filter(link => link.category === 'trade')
    tradeLinks.forEach(link => window.open(link.url, '_blank'))
    toast.success(`Opened ${tradeLinks.length} trade parts sites`)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'oem': return 'bg-blue-100 text-blue-800'
      case 'trade': return 'bg-green-100 text-green-800'
      case 'aftermarket': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const quickLinks = generateQuickLinks()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Smart Parts Assistant
          </CardTitle>
          <CardDescription>
            Intelligent parts lookup with auto-populated search links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Information Display */}
          {(vin || registration || make) && (
            <Alert>
              <Car className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    {vin && (
                      <span className="flex items-center gap-1">
                        <strong>VIN:</strong> {vin}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(vin, 'VIN')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </span>
                    )}
                    {registration && (
                      <span className="flex items-center gap-1">
                        <strong>Reg:</strong> {registration}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(registration, 'Registration')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </span>
                    )}
                    {make && (
                      <span><strong>Vehicle:</strong> {[make, model, year].filter(Boolean).join(' ')}</span>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin-search">VIN Number</Label>
              <div className="flex gap-2">
                <Input
                  id="vin-search"
                  placeholder="e.g. WVWZZZ1JZ3W386752"
                  value={selectedVin}
                  onChange={(e) => setSelectedVin(e.target.value.toUpperCase())}
                />
                {selectedVin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedVin, 'VIN')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-search">Part Description</Label>
              <Input
                id="part-search"
                placeholder="e.g. brake pads, oil filter, headlight"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={openAllOEM} variant="outline" size="sm">
              <Car className="h-4 w-4 mr-2" />
              Open All OEM Sites
            </Button>
            <Button onClick={openAllTrade} variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              Open All Trade Sites
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Parts Links</CardTitle>
          <CardDescription>
            Pre-populated search links based on your vehicle and part requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {link.icon}
                      <h4 className="font-medium">{link.name}</h4>
                    </div>
                    <Badge className={getCategoryColor(link.category)}>
                      {link.category}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {link.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openQuickLink(link)}
                      size="sm"
                      className="flex-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    
                    <Button
                      onClick={() => copyToClipboard(link.url, `${link.name} URL`)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer">
                  <Bookmark className="h-3 w-3 mr-1" />
                  {search}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips and Tricks */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Maximize Your Parts Search:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Use VIN first:</strong> Most accurate results for OEM parts</li>
                    <li><strong>Try multiple sites:</strong> Prices and availability vary significantly</li>
                    <li><strong>Check trade accounts:</strong> Can save 20-40% on parts</li>
                    <li><strong>Compare OEM vs Aftermarket:</strong> Balance quality and cost</li>
                    <li><strong>Bookmark frequently used searches:</strong> Save time on repeat jobs</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Quick Keyboard Shortcuts:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Ctrl+C:</strong> Copy VIN or registration quickly</li>
                    <li><strong>Middle-click:</strong> Open links in new tabs</li>
                    <li><strong>Ctrl+Shift+T:</strong> Reopen closed tabs</li>
                    <li><strong>Ctrl+L:</strong> Focus address bar for quick searches</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
