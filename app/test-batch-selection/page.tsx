'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function TestBatchSelectionPage() {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [batchSize, setBatchSize] = useState<number>(5)
  const [showBatchOptions, setShowBatchOptions] = useState(true)

  // Mock vehicles for testing
  const mockVehicles = Array.from({ length: 50 }, (_, i) => ({
    id: `vehicle-${i + 1}`,
    registration: `TEST${String(i + 1).padStart(3, '0')}`,
    customer: `Customer ${i + 1}`,
    motExpiry: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
  }))

  const selectBatch = (size: number) => {
    const availableVehicles = mockVehicles.filter(v => !selectedVehicles.includes(v.id))
    const batchToSelect = availableVehicles.slice(0, size)
    const newSelection = [...selectedVehicles, ...batchToSelect.map(v => v.id)]
    setSelectedVehicles(newSelection)
  }

  const selectNextBatch = () => {
    selectBatch(batchSize)
  }

  const clearSelection = () => {
    setSelectedVehicles([])
  }

  const availableCount = mockVehicles.filter(v => !selectedVehicles.includes(v.id)).length

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Batch Selection Test</h1>
        <p className="text-muted-foreground">
          Test the batch selection functionality for MOT reminders
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selection Status</CardTitle>
          <CardDescription>
            Current selection and available vehicles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedVehicles.length}</div>
              <div className="text-sm text-muted-foreground">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableCount}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{mockVehicles.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button variant="outline" onClick={clearSelection} disabled={selectedVehicles.length === 0}>
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Selection Controls - Same as MOT Critical */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Batch Selection Controls</CardTitle>
          <CardDescription>
            Test the same batch selection interface used in MOT Critical page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-3 p-3 bg-white rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Quick Batch Selection:</span>
              <Button
                size="sm"
                variant={showBatchOptions ? "default" : "outline"}
                onClick={() => setShowBatchOptions(!showBatchOptions)}
                className="text-xs"
              >
                {showBatchOptions ? 'Hide' : 'Show'} Batch Options
              </Button>
            </div>
            
            {showBatchOptions && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 50].map(size => {
                    const canSelect = availableCount >= size
                    return (
                      <Button
                        key={size}
                        size="sm"
                        variant="outline"
                        onClick={() => selectBatch(size)}
                        disabled={!canSelect}
                        className={`text-xs ${
                          canSelect 
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700' 
                            : 'opacity-50'
                        }`}
                        title={canSelect ? `Select next ${size} vehicles` : `Only ${availableCount} vehicles available`}
                      >
                        +{size}
                      </Button>
                    )
                  })}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Custom batch size:</span>
                  <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50, 100].map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectNextBatch}
                    disabled={availableCount < batchSize}
                    className="text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                  >
                    Select Next {batchSize}
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500">
                  💡 Start small (5-10) to build confidence, then increase batch sizes
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Calculator */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cost Calculator</CardTitle>
          <CardDescription>
            Real-time cost calculation for selected vehicles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedVehicles.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">SMS Cost</h4>
                  <div className="text-2xl font-bold text-blue-700">
                    £{(selectedVehicles.length * 0.04).toFixed(2)}
                  </div>
                  <div className="text-sm text-blue-600">
                    {selectedVehicles.length} × £0.04 per SMS
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">WhatsApp Cost</h4>
                  <div className="text-2xl font-bold text-green-700">
                    £{(selectedVehicles.length * 0.005).toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600">
                    {selectedVehicles.length} × £0.005 per WhatsApp
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Save £{(selectedVehicles.length * (0.04 - 0.005)).toFixed(2)} vs SMS
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Batch Recommendations</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <div>• Start with 5-10 vehicles to test the system</div>
                  <div>• Use SMS for immediate delivery (works now)</div>
                  <div>• Switch to WhatsApp when verification completes (90% savings)</div>
                  <div>• Scale up to 25-50 once comfortable</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Vehicles Preview */}
      {selectedVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Vehicles ({selectedVehicles.length})</CardTitle>
            <CardDescription>
              Preview of vehicles selected for batch messaging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {selectedVehicles.slice(0, 20).map(vehicleId => {
                const vehicle = mockVehicles.find(v => v.id === vehicleId)
                return vehicle ? (
                  <div key={vehicleId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <Badge variant="outline">{vehicle.registration}</Badge>
                    <span className="text-muted-foreground">{vehicle.customer}</span>
                  </div>
                ) : null
              })}
              {selectedVehicles.length > 20 && (
                <div className="p-2 text-center text-muted-foreground text-sm">
                  ... and {selectedVehicles.length - 20} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
