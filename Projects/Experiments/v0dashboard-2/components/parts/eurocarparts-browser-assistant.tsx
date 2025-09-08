"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ExternalLink, 
  Copy, 
  Package, 
  Car, 
  Pound,
  CheckCircle,
  Info,
  User,
  Key
} from "lucide-react"
import { toast } from "sonner"

interface EuroCarPartsBrowserAssistantProps {
  registration?: string
  vin?: string
  make?: string
  model?: string
  year?: string
  className?: string
}

export function EuroCarPartsBrowserAssistant({
  registration = '',
  vin = '',
  make = '',
  model = '',
  year = '',
  className = ""
}: EuroCarPartsBrowserAssistantProps) {
  const [searchReg, setSearchReg] = useState(registration)
  const [partSearch, setPartSearch] = useState('')

  const credentials = {
    username: 'eli@elimotors.co.uk',
    password: 'Rutstein8029'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const openOmnipartWithSearch = (searchTerm: string, searchType: 'registration' | 'part' = 'registration') => {
    // Open Omnipart in new tab
    const omnipartUrl = 'https://omnipart.eurocarparts.com/'
    window.open(omnipartUrl, '_blank')
    
    // Copy search term to clipboard for easy pasting
    copyToClipboard(searchTerm, `${searchType} search term`)
    
    toast.info(`Omnipart opened - paste ${searchTerm} in the search box`)
  }

  const openOmnipartLogin = () => {
    window.open('https://omnipart.eurocarparts.com/', '_blank')
    toast.info('Omnipart opened - login with your trade account')
  }

  const quickSearches = [
    { label: 'Brake Pads', search: 'brake pads' },
    { label: 'Oil Filter', search: 'oil filter' },
    { label: 'Air Filter', search: 'air filter' },
    { label: 'Spark Plugs', search: 'spark plugs' },
    { label: 'Brake Discs', search: 'brake discs' },
    { label: 'Wiper Blades', search: 'wiper blades' },
    { label: 'Battery', search: 'battery' },
    { label: 'Headlight Bulbs', search: 'headlight bulbs' }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Euro Car Parts Browser Assistant
          </CardTitle>
          <CardDescription>
            Smart browser integration for Omnipart trade portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">How it works:</p>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  <li>Click "Open Omnipart" to launch the trade portal</li>
                  <li>Login with your credentials (copied to clipboard)</li>
                  <li>Search terms are automatically copied for easy pasting</li>
                  <li>Get trade pricing and real stock levels</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Trade Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="flex gap-2">
                <Input 
                  value={credentials.username} 
                  readOnly 
                  className="bg-muted"
                />
                <Button
                  onClick={() => copyToClipboard(credentials.username, 'Username')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input 
                  value="••••••••••••" 
                  readOnly 
                  className="bg-muted"
                />
                <Button
                  onClick={() => copyToClipboard(credentials.password, 'Password')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={openOmnipartLogin}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Omnipart Trade Portal
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Parts Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Vehicle Info */}
          {(registration || make) && (
            <Alert>
              <Car className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-4 text-sm">
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
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reg-search">Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="reg-search"
                  placeholder="e.g. AB12 CDE"
                  value={searchReg}
                  onChange={(e) => setSearchReg(e.target.value.toUpperCase())}
                />
                <Button
                  onClick={() => openOmnipartWithSearch(searchReg, 'registration')}
                  disabled={!searchReg.trim()}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-search">Part Description</Label>
              <div className="flex gap-2">
                <Input
                  id="part-search"
                  placeholder="e.g. brake pads, oil filter"
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                />
                <Button
                  onClick={() => openOmnipartWithSearch(partSearch, 'part')}
                  disabled={!partSearch.trim()}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={() => openOmnipartWithSearch(searchReg || registration, 'registration')}
            disabled={!searchReg.trim() && !registration}
            className="w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            Search All Parts for Vehicle
          </Button>
        </CardContent>
      </Card>

      {/* Quick Part Searches */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Part Searches</CardTitle>
          <CardDescription>
            Common parts with instant Omnipart search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickSearches.map((item, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => openOmnipartWithSearch(item.search, 'part')}
                className="text-sm"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trade Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pound className="h-5 w-5 text-green-600" />
            Trade Account Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">20-40%</div>
              <div className="text-sm text-muted-foreground">Trade Discount</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">Real-time</div>
              <div className="text-sm text-muted-foreground">Stock Levels</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">Next Day</div>
              <div className="text-sm text-muted-foreground">Delivery</div>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">Professional</div>
              <div className="text-sm text-muted-foreground">Catalog</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Tips for Omnipart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Maximize Your Omnipart Experience:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Use registration first:</strong> Most accurate vehicle match</li>
                    <li><strong>Check multiple brands:</strong> Compare OEM vs aftermarket pricing</li>
                    <li><strong>Note stock levels:</strong> Green = in stock, Red = order only</li>
                    <li><strong>Save frequent searches:</strong> Use Omnipart's favorites feature</li>
                    <li><strong>Check delivery options:</strong> Next day vs standard delivery</li>
                    <li><strong>Use part images:</strong> Verify correct fitment</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Keyboard Shortcuts in Omnipart:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Ctrl+F:</strong> Quick search on page</li>
                    <li><strong>Tab:</strong> Navigate between search fields</li>
                    <li><strong>Enter:</strong> Submit search</li>
                    <li><strong>Ctrl+T:</strong> Open new tab for comparison</li>
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
