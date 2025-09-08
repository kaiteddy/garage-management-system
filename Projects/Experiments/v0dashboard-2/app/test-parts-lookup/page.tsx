"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EnhancedPartsLookup } from "@/components/parts/enhanced-parts-lookup"
import { PartsIntegrationManager } from "@/components/parts/parts-integration-manager"
import { SmartPartsAssistant } from "@/components/parts/smart-parts-assistant"
import { 
  Search, 
  Settings, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink,
  Key
} from "lucide-react"

export default function TestPartsLookupPage() {
  const [selectedPart, setSelectedPart] = useState<any>(null)

  // Sample vehicle data for testing
  const sampleVehicle = {
    vin: 'WVWZZZ1JZ3W386752',
    registration: 'AB12 CDE',
    make: 'Volkswagen',
    model: 'Golf',
    year: '2019'
  }

  const handlePartSelect = (part: any) => {
    setSelectedPart(part)
    console.log('Selected part:', part)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parts Lookup System</h1>
          <p className="text-muted-foreground">
            Comprehensive parts lookup with multiple supplier integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Smart Assistant
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Multi-Source
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>Current status of parts supplier integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="font-medium">7Zap</div>
                <div className="text-sm text-red-600">Blocked by Cloudflare</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">PartSouq</div>
                <div className="text-sm text-yellow-600">Limited Access</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Key className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">Euro Car Parts</div>
                <div className="text-sm text-blue-600">Requires Trade Account</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Smart Assistant</div>
                <div className="text-sm text-green-600">Working</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="smart-assistant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart-assistant">Smart Assistant</TabsTrigger>
          <TabsTrigger value="enhanced-lookup">Enhanced Lookup</TabsTrigger>
          <TabsTrigger value="integration-setup">Integration Setup</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
        </TabsList>

        {/* Smart Parts Assistant */}
        <TabsContent value="smart-assistant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Smart Parts Assistant
              </CardTitle>
              <CardDescription>
                Intelligent parts lookup that works around authentication issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmartPartsAssistant
                vin={sampleVehicle.vin}
                registration={sampleVehicle.registration}
                make={sampleVehicle.make}
                model={sampleVehicle.model}
                year={sampleVehicle.year}
                onPartAdd={handlePartSelect}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Lookup */}
        <TabsContent value="enhanced-lookup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Enhanced Parts Lookup
              </CardTitle>
              <CardDescription>
                Direct API integration attempts with fallback options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedPartsLookup
                vin={sampleVehicle.vin}
                registration={sampleVehicle.registration}
                make={sampleVehicle.make}
                model={sampleVehicle.model}
                year={sampleVehicle.year}
                onPartSelect={handlePartSelect}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Setup */}
        <TabsContent value="integration-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parts Integration Setup
              </CardTitle>
              <CardDescription>
                Configure your parts supplier accounts and credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PartsIntegrationManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solutions */}
        <TabsContent value="solutions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Challenges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Current Challenges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">7Zap Integration Issues:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Protected by Cloudflare anti-bot measures</li>
                        <li>Requires user authentication/login</li>
                        <li>No public API available</li>
                        <li>Web scraping blocked</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">PartSouq Limitations:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>No official API for small businesses</li>
                        <li>Web scraping has limited success</li>
                        <li>Requires business partnership for full access</li>
                        <li>Rate limiting and IP blocking</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Practical Solutions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Practical Solutions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Smart Assistant Approach:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Pre-populated search URLs with VIN/part data</li>
                        <li>One-click access to multiple suppliers</li>
                        <li>Copy-paste helpers for quick searches</li>
                        <li>No authentication issues</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Trade Account Benefits:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Euro Car Parts: 20-40% trade discount</li>
                        <li>GSF Car Parts: Professional pricing</li>
                        <li>API access with trade accounts</li>
                        <li>Better stock visibility</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Immediate Solution</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use the Smart Parts Assistant for instant access to all suppliers
                    </p>
                    <Badge className="bg-green-100 text-green-800">Ready Now</Badge>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Short Term</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Set up trade accounts with Euro Car Parts and GSF for better pricing
                    </p>
                    <Badge className="bg-blue-100 text-blue-800">1-2 Weeks</Badge>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Long Term</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Negotiate API access with 7Zap and PartSouq for full integration
                    </p>
                    <Badge className="bg-purple-100 text-purple-800">1-3 Months</Badge>
                  </Card>
                </div>

                <Alert>
                  <ExternalLink className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Next Steps:</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Start using the Smart Parts Assistant immediately</li>
                        <li>Contact Euro Car Parts (0345 758 5058) for trade account</li>
                        <li>Email GSF Car Parts (trade@gsfcarparts.com) for setup</li>
                        <li>Reach out to 7Zap and PartSouq for business partnerships</li>
                        <li>Consider premium scraping services as interim solution</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Part Display */}
      {selectedPart && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Selected Part</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-white p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(selectedPart, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
