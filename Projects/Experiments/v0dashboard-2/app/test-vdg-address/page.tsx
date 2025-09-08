"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VDGAddressLookup } from "@/components/ui/vdg-address-lookup"

export default function TestVDGAddressPage() {
  const [registration, setRegistration] = useState('AV17ZCT')
  const [addressData, setAddressData] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)

  const testVDGPackages = async () => {
    const packages = [
      'VehicleDetails',
      'VehicleDetailsWithImage', 
      'AddressDetails',
      'MotHistoryDetails',
      'SpecAndOptionsDetails',
      'TyreDetails',
      'BatteryDetails'
    ]

    const results: any = {}

    for (const packageName of packages) {
      try {
        console.log(`Testing package: ${packageName}`)
        const response = await fetch('/api/test-vdg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registration,
            packages: [packageName]
          })
        })

        const data = await response.json()
        results[packageName] = {
          success: data.success,
          cost: data.cost,
          hasData: !!data.vdgData,
          error: data.error,
          dataKeys: data.vdgData ? Object.keys(data.vdgData) : []
        }
      } catch (error) {
        results[packageName] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    setTestResults(results)
  }

  const handleAddressFound = (address: any) => {
    setAddressData(address)
    console.log('Address found:', address)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VDG Address Lookup Test</h1>
          <p className="text-muted-foreground">
            Test the Vehicle Data Global address lookup functionality
          </p>
        </div>
      </div>

      {/* VDG Address Lookup Component */}
      <VDGAddressLookup
        registration={registration}
        onRegistrationChange={setRegistration}
        onAddressFound={handleAddressFound}
        showCost={true}
      />

      {/* Address Data Display */}
      {addressData && (
        <Card>
          <CardHeader>
            <CardTitle>Found Address Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(addressData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Package Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test VDG Packages</CardTitle>
          <CardDescription>
            Test which VDG packages are available for the registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Registration"
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              className="max-w-xs"
            />
            <Button onClick={testVDGPackages}>
              Test All Packages
            </Button>
          </div>

          {testResults && (
            <div className="space-y-2">
              <h3 className="font-semibold">Package Test Results:</h3>
              {Object.entries(testResults).map(([packageName, result]: [string, any]) => (
                <div key={packageName} className="flex items-center gap-2 p-2 border rounded">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {packageName}
                  </Badge>
                  <span className="text-sm">
                    {result.success ? (
                      <>
                        ✅ Success - Cost: £{result.cost?.toFixed(4) || '0.00'}
                        {result.hasData && ` - Data: ${result.dataKeys?.join(', ')}`}
                      </>
                    ) : (
                      <>❌ Failed - {result.error}</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Manual API Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/vdg-address-lookup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ registration })
                })
                const data = await response.json()
                console.log('Manual API test result:', data)
                alert(JSON.stringify(data, null, 2))
              } catch (error) {
                console.error('Manual API test error:', error)
                alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
              }
            }}
          >
            Test Address API Directly
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
