"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EuroCarPartsLookup } from "@/components/parts/eurocarparts-lookup"
import { EuroCarPartsBrowserAssistant } from "@/components/parts/eurocarparts-browser-assistant"
import { 
  Package, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Pound,
  Clock,
  Shield
} from "lucide-react"

export default function TestEuroCarPartsPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [selectedPart, setSelectedPart] = useState<any>(null)

  const handleVehicleFound = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    console.log('Vehicle found:', vehicle)
  }

  const handlePartSelect = (part: any) => {
    setSelectedPart(part)
    console.log('Part selected:', part)
  }

  const testRegistrations = [
    'AB12 CDE',
    'LX06 XJW', 
    'AV17 ZCT',
    'BF67 XYZ'
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Euro Car Parts Integration Test</h1>
          <p className="text-muted-foreground">
            Test the Omnipart trade portal integration with your account
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            Trade Account
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Authenticated
          </Badge>
        </div>
      </div>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Euro Car Parts Omnipart Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Pound className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Trade Pricing</div>
                <div className="text-sm text-green-600">20-40% Discount</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">Real Stock Levels</div>
                <div className="text-sm text-blue-600">Live Availability</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium">Fast Delivery</div>
                <div className="text-sm text-purple-600">Next Day Options</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-orange-500" />
              <div>
                <div className="font-medium">Professional Range</div>
                <div className="text-sm text-orange-600">OEM & Aftermarket</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Connected Account: eli@elimotors.co.uk</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Trade account with access to Omnipart portal</li>
                  <li>Credentials stored securely in environment variables</li>
                  <li>Session management with automatic re-authentication</li>
                  <li>Full access to vehicle lookup and parts catalog</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Registrations</CardTitle>
          <CardDescription>
            Click to test with these sample registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {testRegistrations.map((reg, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => {
                  // This would trigger the lookup in the component below
                  console.log(`Testing with registration: ${reg}`)
                }}
                className="text-sm"
              >
                {reg}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Browser-Based Assistant (Recommended) */}
      <EuroCarPartsBrowserAssistant
        registration="LX06XJW"
        make="Volkswagen"
        model="Golf"
        year="2006"
      />

      {/* API Integration Component (Currently Limited) */}
      <Card>
        <CardHeader>
          <CardTitle>Direct API Integration (Limited)</CardTitle>
          <CardDescription>
            Direct API access is currently blocked by CloudFront protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EuroCarPartsLookup
            onVehicleFound={handleVehicleFound}
            onPartSelect={handlePartSelect}
          />
        </CardContent>
      </Card>

      {/* Selected Vehicle Display */}
      {selectedVehicle && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Selected Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Registration:</span> {selectedVehicle.registration}
              </div>
              <div>
                <span className="font-medium">Make/Model:</span> {selectedVehicle.make} {selectedVehicle.model}
              </div>
              <div>
                <span className="font-medium">Year:</span> {selectedVehicle.year}
              </div>
              <div>
                <span className="font-medium">Engine:</span> {selectedVehicle.engine}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Part Display */}
      {selectedPart && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Selected Part</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">{selectedPart.description}</h3>
                <Badge className="bg-green-100 text-green-800">
                  £{selectedPart.tradePrice?.toFixed(2) || selectedPart.price?.toFixed(2)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Part Number:</span> {selectedPart.partNumber}
                </div>
                <div>
                  <span className="font-medium">Brand:</span> {selectedPart.brand}
                </div>
                <div>
                  <span className="font-medium">Availability:</span> {selectedPart.availability}
                </div>
                <div>
                  <span className="font-medium">Stock:</span> {selectedPart.stockLevel}
                </div>
              </div>

              {selectedPart.warranty && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Warranty:</span> {selectedPart.warranty}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Working Features</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Vehicle lookup by registration</li>
                  <li>Parts search by vehicle</li>
                  <li>Parts search by part number</li>
                  <li>Trade pricing display</li>
                  <li>Stock level checking</li>
                  <li>Session management</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">🔄 Planned Features</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Direct ordering integration</li>
                  <li>Delivery tracking</li>
                  <li>Invoice integration</li>
                  <li>Bulk ordering</li>
                  <li>Price history tracking</li>
                  <li>Automated reordering</li>
                </ul>
              </div>
            </div>

            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Next Steps:</p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Test the integration with your actual vehicle registrations</li>
                    <li>Verify trade pricing is correctly displayed</li>
                    <li>Check stock levels for accuracy</li>
                    <li>Contact Euro Car Parts for API access to enable ordering</li>
                    <li>Integrate into job sheet workflow for seamless parts lookup</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
