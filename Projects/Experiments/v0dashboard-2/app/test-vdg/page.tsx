'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface VDGData {
  registration: string
  make: string
  model: string
  derivative: string
  year: number
  engineSize?: string
  fuelType: string
  colour: string
  imageUrl?: string
  specifications?: Array<{
    category: string
    name: string
    description: string
    fitment: string
  }>
  source: string
}

interface VDGResponse {
  success: boolean
  data: VDGData
  packages: string[]
  cost: string
  savings: string
  comparison: {
    sws_cost: string
    vdg_cost: string
    savings_per_lookup: string
    savings_percentage: string
  }
}

// Available VDG packages with costs
const VDG_PACKAGES = [
  { id: 'VehicleDetails', name: 'Basic Vehicle Details', cost: '£0.05', description: 'Make, model, year, fuel type' },
  { id: 'VehicleDetailsWithImage', name: 'Vehicle Details + Image', cost: '£0.14', description: 'Basic details plus vehicle image' },
  { id: 'MotHistoryDetails', name: 'MOT History', cost: '£0.05', description: 'Complete MOT test history' },
  { id: 'SpecAndOptionsDetails', name: 'Specifications & Options', cost: '£0.18', description: 'Factory equipment and options' },
  { id: 'TyreDetails', name: 'Tyre Information', cost: '£0.08', description: 'Tyre specifications and recommendations' },
  { id: 'BatteryDetails', name: 'Battery Information', cost: '£0.06', description: 'Battery specifications' },
  { id: 'AddressDetails', name: 'Address Information', cost: '£0.05', description: 'Registered keeper address' }
]

export default function TestVDGPage() {
  const [registration, setRegistration] = useState('LN64XFG')
  const [apiKey, setApiKey] = useState('4765ECC6-E012-4D86-AC26-24067AE25AB9')
  const [selectedPackages, setSelectedPackages] = useState<string[]>(['VehicleDetailsWithImage'])
  const [loading, setLoading] = useState(false)
  const [vdgData, setVdgData] = useState<VDGData | null>(null)
  const [vdgResponse, setVdgResponse] = useState<VDGResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testVDG = async () => {
    if (selectedPackages.length === 0) {
      setError('Please select at least one package')
      return
    }

    setLoading(true)
    setError(null)
    setVdgData(null)
    setVdgResponse(null)

    try {
      const packagesParam = selectedPackages.join(',')
      const response = await fetch(`/api/test-vdg?registration=${encodeURIComponent(registration)}&packages=${encodeURIComponent(packagesParam)}`)
      const result = await response.json()

      if (result.success) {
        setVdgData(result.data)
        setVdgResponse(result)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/test-vdg?test=true')
      const result = await response.json()

      if (result.success) {
        alert('✅ VDG API connection successful!')
      } else {
        alert('❌ VDG API connection failed')
      }
    } catch (err) {
      alert('❌ Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vehicle Data Global Test</h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          £0.32 per lookup (54% savings vs SWS)
        </Badge>
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">£0.70</div>
              <div className="text-sm text-gray-600">SWS Current Cost</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">£0.32</div>
              <div className="text-sm text-gray-600">VDG Cost</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">54%</div>
              <div className="text-sm text-gray-600">Savings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test VDG API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter registration (e.g., LN64XFG)"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                className="flex-1"
              />
              <Button onClick={testVDG} disabled={loading || selectedPackages.length === 0}>
                {loading ? 'Testing...' : 'Test Vehicle Data'}
              </Button>
              <Button onClick={testConnection} variant="outline" disabled={loading}>
                Test Connection
              </Button>
            </div>

            {/* Package Selection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">📦 Select Data Packages</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VDG_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={pkg.id}
                      checked={selectedPackages.includes(pkg.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPackages([...selectedPackages, pkg.id])
                        } else {
                          setSelectedPackages(selectedPackages.filter(p => p !== pkg.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <label htmlFor={pkg.id} className="text-sm font-medium cursor-pointer">
                        {pkg.name}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{pkg.cost}</Badge>
                        <span className="text-xs text-gray-500">{pkg.description}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPackages.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">
                    Selected: {selectedPackages.length} package{selectedPackages.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Total estimated cost: £{VDG_PACKAGES
                      .filter(pkg => selectedPackages.includes(pkg.id))
                      .reduce((total, pkg) => total + parseFloat(pkg.cost.replace('£', '')), 0)
                      .toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">🔑 API Key Configuration</h4>
              <p className="text-sm text-yellow-700 mb-2">
                If the connection test fails, please check your VDG portal for the correct API key:
              </p>
              <Input
                placeholder="Enter your VDG API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-yellow-600">
                Current key: {apiKey.substring(0, 8)}...
                <br />
                Visit <a href="https://portal.vehicledataglobal.com/" target="_blank" className="underline">VDG Portal</a> to get your API key
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
              {error.includes('API key not found') && (
                <div className="mt-2 text-sm">
                  <strong>Solution:</strong> Please check your VDG portal for the correct API key. The key shown in your account overview might be different from the API key needed for API calls.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VDG Results */}
      {vdgData && vdgResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✅ Vehicle Data Global Results
              <Badge variant="outline">{vdgResponse.cost}</Badge>
              <Badge variant="secondary">{vdgResponse.savings}</Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {vdgResponse.packages.map((pkg) => (
                <Badge key={pkg} variant="outline" className="text-xs">
                  {VDG_PACKAGES.find(p => p.id === pkg)?.name || pkg}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vehicle Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Vehicle Details</h3>
                <div className="space-y-2">
                  <div><strong>Registration:</strong> {vdgData.registration}</div>
                  <div><strong>Make:</strong> {vdgData.make}</div>
                  <div><strong>Model:</strong> {vdgData.model}</div>
                  <div><strong>Derivative:</strong> {vdgData.derivative}</div>
                  <div><strong>Year:</strong> {vdgData.year}</div>
                  <div><strong>Engine:</strong> {vdgData.engineSize || 'N/A'}</div>
                  <div><strong>Fuel Type:</strong> {vdgData.fuelType}</div>
                  <div><strong>Colour:</strong> {vdgData.colour}</div>
                </div>
              </div>

              {/* Vehicle Image */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Vehicle Image</h3>
                {vdgData.imageUrl ? (
                  <img 
                    src={vdgData.imageUrl} 
                    alt={`${vdgData.make} ${vdgData.model}`}
                    className="w-full max-w-md rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Specifications */}
            {vdgData.specifications && vdgData.specifications.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-4">Specifications & Equipment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vdgData.specifications.slice(0, 12).map((spec, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{spec.name}</span>
                        <Badge variant={spec.fitment === 'Standard' ? 'default' : 'secondary'} className="text-xs">
                          {spec.fitment}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">{spec.category}</div>
                      {spec.description && (
                        <div className="text-xs text-gray-500 mt-1">{spec.description}</div>
                      )}
                    </div>
                  ))}
                </div>
                {vdgData.specifications.length > 12 && (
                  <div className="text-center mt-4 text-gray-500">
                    ... and {vdgData.specifications.length - 12} more specifications
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">✅ Integration Ready</div>
              <div className="text-sm text-gray-600">VDG API integration code complete</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">🔑 API Key Needed</div>
              <div className="text-sm text-gray-600">Waiting for correct API key from VDG portal</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">💰 54% Savings</div>
              <div className="text-sm text-gray-600">£0.32 vs £0.70 per lookup</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Integration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">✅ What VDG Provides:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Complete vehicle specifications</li>
                <li>• Vehicle images (side-on library photos)</li>
                <li>• Standard & optional equipment lists</li>
                <li>• Derivative information</li>
                <li>• Engine & fuel type details</li>
                <li>• DVLA registration data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">💡 Integration Benefits:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• 54% cost savings vs SWS</li>
                <li>• Same data quality</li>
                <li>• 1,000 daily lookups included</li>
                <li>• 10 lookups per second rate limit</li>
                <li>• No restrictions on lookup parameters</li>
                <li>• Easy API integration</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">🚀 Next Steps:</h4>
            <ol className="text-sm space-y-1 text-gray-600">
              <li>1. Log into your VDG portal at <a href="https://portal.vehicledataglobal.com/" target="_blank" className="text-blue-600 underline">portal.vehicledataglobal.com</a></li>
              <li>2. Find the API documentation or API keys section</li>
              <li>3. Copy the correct API key for API calls (might be different from account overview)</li>
              <li>4. Test the API key using the form above</li>
              <li>5. Once working, we can integrate VDG into your job sheet system</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
