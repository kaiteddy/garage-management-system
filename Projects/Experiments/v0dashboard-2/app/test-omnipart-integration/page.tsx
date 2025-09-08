'use client'

import React from 'react'
import { RealOmnipartLookup } from '@/components/job-sheet/real-omnipart-lookup'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Package, Car, Zap } from "lucide-react"

export default function TestOmnipartIntegration() {
  const handleAddPart = (part: any) => {
    console.log('Part added to job sheet:', part)
    alert(`Added: ${part.description} - £${part.netPrice.toFixed(2)}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">🎉 REAL Omnipart Integration Test</h1>
        <p className="text-xl text-muted-foreground">
          Live Euro Car Parts API with your trade account - <strong>WORKING NOW!</strong>
        </p>
        
        <div className="flex justify-center gap-3">
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            LIVE API
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Car className="h-4 w-4" />
            Real Vehicle Data
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <Package className="h-4 w-4" />
            Trade Pricing
          </Badge>
          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
            <Zap className="h-4 w-4" />
            JWT Authenticated
          </Badge>
        </div>
      </div>

      {/* Success Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            🎉 FIXED: Vehicle-Specific Parts with Brand Selection!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-800">✅ NEW Features Working:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Vehicle-specific parts</strong> (not random!)</li>
                <li>• <strong>Brand selection dropdowns</strong> when multiple options</li>
                <li>• <strong>Vehicle reference</strong> for each part (VRM, make, model)</li>
                <li>• <strong>Registration requirements</strong> for ordering</li>
                <li>• <strong>Trade pricing</strong> with brand comparisons</li>
                <li>• <strong>Real stock levels</strong> per brand option</li>
                <li>• <strong>Ordering notes</strong> with vehicle details</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-800">🎯 Test the New Features:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Search "LX06XJW" → See vehicle-specific brake pads</li>
                <li>• <strong>Click brand dropdown</strong> → Choose ATE vs Brembo vs Febi</li>
                <li>• Notice <strong>vehicle reference</strong> column shows VRM</li>
                <li>• See <strong>ordering notes</strong> with vehicle details</li>
                <li>• Compare <strong>trade prices</strong> across brands</li>
                <li>• Try "brake" or "filter" for category search</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-green-300">
            <h4 className="font-semibold text-green-800 mb-2">🔧 How It Works Now:</h4>
            <p className="text-sm text-green-700">
              When you search by registration, the system finds the specific vehicle and returns parts
              <strong> specifically for that vehicle</strong>. Each part shows multiple brand options
              (Brembo, ATE, Febi, etc.) with different pricing. The vehicle registration is automatically
              included for Euro Car Parts ordering requirements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Real Omnipart Lookup Component */}
      <RealOmnipartLookup 
        vehicleRegistration="LX06XJW"
        onAddPart={handleAddPart}
      />

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Enhanced Technical Implementation</CardTitle>
          <CardDescription>
            Vehicle-specific parts with brand selection and ordering requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle-Specific Search
              </h4>
              <p className="text-sm text-muted-foreground">
                Parts are now filtered specifically for the searched vehicle (VRM, make, model, year, engine code)
                instead of showing random parts.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Brand Selection
              </h4>
              <p className="text-sm text-muted-foreground">
                Multiple brand options (Brembo, ATE, Febi, etc.) with individual pricing, stock levels,
                and product codes for each alternative.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Ordering Integration
              </h4>
              <p className="text-sm text-muted-foreground">
                Vehicle registration automatically included for Euro Car Parts ordering requirements.
                Each part shows vehicle reference and ordering notes.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">🚀 Problem Solved:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-red-600 mb-1">❌ Before (Issues):</h5>
                <ul className="space-y-1 text-red-700">
                  <li>• Random parts not specific to vehicle</li>
                  <li>• No brand selection options</li>
                  <li>• Missing vehicle reference for orders</li>
                  <li>• No registration requirements</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-600 mb-1">✅ After (Fixed):</h5>
                <ul className="space-y-1 text-green-700">
                  <li>• Vehicle-specific parts only</li>
                  <li>• Brand dropdown with pricing</li>
                  <li>• VRM included for each part</li>
                  <li>• Ordering notes with vehicle details</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">API Implementation:</h4>
            <ul className="text-sm space-y-1 font-mono">
              <li>• <code>searchVehicleParts(vehicle, category)</code> - Vehicle-specific search</li>
              <li>• <code>brandOptions[]</code> - Multiple brand alternatives</li>
              <li>• <code>vehicleReference{`{vrm, make, model}`}</code> - Ordering data</li>
              <li>• <code>requiresVehicleReference: true</code> - ECP requirement</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Your Trade Account:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Account:</strong> eli@elimotors.co.uk</li>
              <li>• <strong>User ID:</strong> 6556</li>
              <li>• <strong>Group:</strong> Trade</li>
              <li>• <strong>Discount:</strong> 32% off retail prices</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🚀 Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-blue-800">Immediate (Ready Now):</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Test with your customer vehicles</li>
                <li>• Verify trade pricing accuracy</li>
                <li>• Train staff on the interface</li>
                <li>• Start creating real quotes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800">Integration (Next Week):</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Fix job sheets database connection</li>
                <li>• Add to job sheet creation forms</li>
                <li>• Enable direct ordering</li>
                <li>• Add delivery tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
