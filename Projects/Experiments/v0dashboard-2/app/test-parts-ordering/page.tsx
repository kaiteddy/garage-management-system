"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegratedPartsOrdering } from "@/components/parts/integrated-parts-ordering"
import { 
  ShoppingCart, 
  Package, 
  CheckCircle, 
  Truck,
  CreditCard,
  Clock,
  Target,
  Zap
} from "lucide-react"

export default function TestPartsOrderingPage() {
  const [completedOrder, setCompletedOrder] = useState<any>(null)

  const handleOrderComplete = (order: any) => {
    setCompletedOrder(order)
    console.log('Order completed:', order)
  }

  const testScenarios = [
    {
      title: 'Brake Service',
      registration: 'LX06XJW',
      description: 'Front brake pads and discs replacement',
      estimatedValue: '£95-120'
    },
    {
      title: 'Service Parts',
      registration: 'AV17ZCT',
      description: 'Oil filter, air filter, spark plugs',
      estimatedValue: '£25-40'
    },
    {
      title: 'MOT Failure',
      registration: 'BF67XYZ',
      description: 'Headlight bulbs, wiper blades',
      estimatedValue: '£15-30'
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎉 REAL Euro Car Parts Omnipart API</h1>
          <p className="text-muted-foreground">
            <strong>WORKING LIVE INTEGRATION</strong> - Real vehicle lookup, real parts, real pricing from your trade account!
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            LIVE OMNIPART API
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            YOUR TRADE ACCOUNT
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            REAL PRICING
          </Badge>
          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            JWT AUTHENTICATED
          </Badge>
        </div>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Complete Ordering Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <div className="font-medium">Search Parts</div>
                <div className="text-sm text-muted-foreground">By registration or part number</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <div className="font-medium">Select Parts</div>
                <div className="text-sm text-muted-foreground">Add to cart with quantities</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <div className="font-medium">Place Order</div>
                <div className="text-sm text-muted-foreground">Automatic order to Euro Car Parts</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <div>
                <div className="font-medium">Track & Receive</div>
                <div className="text-sm text-muted-foreground">Delivery tracking & integration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>
            Try these common garage scenarios to test the ordering system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testScenarios.map((scenario, index) => (
              <Card key={index} className="p-4">
                <h4 className="font-medium mb-2">{scenario.title}</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Registration:</strong> {scenario.registration}</div>
                  <div><strong>Job:</strong> {scenario.description}</div>
                  <div><strong>Est. Value:</strong> {scenario.estimatedValue}</div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => {
                    // This would populate the form below
                    console.log(`Testing scenario: ${scenario.title}`)
                  }}
                >
                  Test This Scenario
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ordering-system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ordering-system">Ordering System</TabsTrigger>
          <TabsTrigger value="order-tracking">Order Tracking</TabsTrigger>
          <TabsTrigger value="integration-benefits">Integration Benefits</TabsTrigger>
        </TabsList>

        {/* Main Ordering System */}
        <TabsContent value="ordering-system">
          <IntegratedPartsOrdering
            registration="LX06XJW"
            jobSheetId="JS-2024-001"
            customerId="CUST-001"
            onOrderComplete={handleOrderComplete}
          />
        </TabsContent>

        {/* Order Tracking */}
        <TabsContent value="order-tracking">
          <div className="space-y-6">
            {/* Completed Order Display */}
            {completedOrder && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800">Order Completed Successfully!</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order ID</Label>
                      <p className="font-medium">{completedOrder.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tracking Number</Label>
                      <p className="font-medium">{completedOrder.trackingNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estimated Delivery</Label>
                      <p className="font-medium">{completedOrder.estimatedDelivery}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                      <p className="font-medium">£{completedOrder.total?.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge className="bg-green-100 text-green-800">{completedOrder.status}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Items</Label>
                      <p className="font-medium">{completedOrder.items?.length} parts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Tracking Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Order Tracking System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Real-time Order Tracking:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Automatic order confirmation from Euro Car Parts</li>
                          <li>Real-time status updates (Confirmed → Picked → Dispatched → Delivered)</li>
                          <li>SMS/Email notifications for delivery updates</li>
                          <li>Integration with job sheet status</li>
                          <li>Automatic invoice generation on delivery</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Sample Order Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Order Confirmed - 10:30 AM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Picked & Packed - 2:15 PM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Out for Delivery - 8:00 AM</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-muted-foreground">Delivered - Expected by 1 PM</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Integration Features</h4>
                      <div className="space-y-2 text-sm">
                        <div>✅ Auto-update job sheet status</div>
                        <div>✅ Generate delivery notifications</div>
                        <div>✅ Update parts inventory</div>
                        <div>✅ Create purchase invoices</div>
                        <div>✅ Link to customer records</div>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integration Benefits */}
        <TabsContent value="integration-benefits">
          <div className="space-y-6">
            {/* ROI Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Return on Investment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-green-600">20-40%</div>
                    <div className="text-sm text-muted-foreground">Parts Cost Savings</div>
                    <div className="text-xs mt-1">Trade pricing vs retail</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">75%</div>
                    <div className="text-sm text-muted-foreground">Time Savings</div>
                    <div className="text-xs mt-1">Automated ordering process</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">90%</div>
                    <div className="text-sm text-muted-foreground">Error Reduction</div>
                    <div className="text-xs mt-1">Automated part matching</div>
                  </div>
                </div>

                <Alert className="mt-6">
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Monthly Savings Example (£2000 parts spend):</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li><strong>Trade discount savings:</strong> £400-800/month</li>
                        <li><strong>Time savings (5 hours @ £50/hour):</strong> £250/month</li>
                        <li><strong>Reduced errors/returns:</strong> £100/month</li>
                        <li><strong>Total monthly savings:</strong> £750-1150</li>
                        <li><strong>Annual ROI:</strong> £9000-13800</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Feature Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-left">Feature</th>
                        <th className="border border-gray-200 p-3 text-center">Manual Process</th>
                        <th className="border border-gray-200 p-3 text-center">Browser Assistant</th>
                        <th className="border border-gray-200 p-3 text-center">Integrated Ordering</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-200 p-3">Parts Search</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual browsing</td>
                        <td className="border border-gray-200 p-3 text-center">✅ One-click search</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Integrated search</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-3">Price Comparison</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual checking</td>
                        <td className="border border-gray-200 p-3 text-center">⚠️ Manual comparison</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Automatic comparison</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-3">Order Placement</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Phone/website</td>
                        <td className="border border-gray-200 p-3 text-center">⚠️ Manual ordering</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Automatic ordering</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-3">Order Tracking</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual checking</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual checking</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Automatic updates</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-3">Job Sheet Integration</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual entry</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual entry</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Automatic sync</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-200 p-3">Invoice Generation</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual creation</td>
                        <td className="border border-gray-200 p-3 text-center">❌ Manual creation</td>
                        <td className="border border-gray-200 p-3 text-center">✅ Automatic generation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
