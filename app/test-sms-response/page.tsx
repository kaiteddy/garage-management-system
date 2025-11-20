"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Phone, Mail, CheckCircle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function TestSMSResponsePage() {
  const [phone, setPhone] = useState("+447123456789")
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testResponses = [
    {
      label: "Customer sold vehicle",
      message: "SOLD - I no longer own this car",
      description: "Vehicle will be marked as sold and removed from MOT reminders"
    },
    {
      label: "Customer provides email",
      message: "EMAIL john.smith@email.com",
      description: "Email address will be added to customer record"
    },
    {
      label: "Customer opts out",
      message: "STOP",
      description: "Customer will be opted out of all communications"
    },
    {
      label: "Customer updates phone",
      message: "My new number is 07987654321",
      description: "Phone number will be updated in customer record"
    },
    {
      label: "General inquiry",
      message: "When is my MOT due?",
      description: "Response will be logged for manual review"
    }
  ]

  const handleTestResponse = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/customer-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message,
          source: "sms",
          vehicleRegistration: "BG21 UMG" // Test vehicle
        })
      })

      const data = await response.json()
      setResponse(data)

      if (data.success) {
        toast.success(`Response processed: ${data.responseType}`)
      } else {
        toast.error("Failed to process response")
      }
    } catch (error) {
      toast.error("Error processing response")
    } finally {
      setIsLoading(false)
    }
  }

  const loadTestMessage = (testMessage: string) => {
    setMessage(testMessage)
    setResponse(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customer-database-management">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Database Management
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Test SMS Response System</h1>
          <p className="text-muted-foreground">
            Test how the system processes different types of customer SMS responses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Simulate SMS Response
            </CardTitle>
            <CardDescription>
              Test how different customer responses are processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Customer Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+447123456789"
              />
            </div>

            <div>
              <Label htmlFor="message">SMS Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter customer's SMS response..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleTestResponse} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Process Response"}
            </Button>

            {response && (
              <Alert className={response.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CheckCircle className={`h-4 w-4 ${response.success ? "text-green-600" : "text-red-600"}`} />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Response Type:</span>
                      <Badge variant={response.success ? "default" : "destructive"}>
                        {response.responseType || "error"}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {response.message}
                    </div>
                    {response.processed && (
                      <div className="text-sm text-green-700">
                        ✓ Automatically processed and customer record updated
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Test Examples</CardTitle>
            <CardDescription>
              Click any example to test different response types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResponses.map((test, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => loadTestMessage(test.message)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{test.label}</span>
                  <Badge variant="outline" className="text-xs">
                    Click to test
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  "{test.message}"
                </div>
                <div className="text-xs text-blue-600">
                  {test.description}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How the SMS Response System Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Customer Responds</h3>
              <p className="text-sm text-muted-foreground">
                Customer replies to MOT reminder with SOLD, email address, STOP, or other message
              </p>
            </div>

            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Auto-Processing</h3>
              <p className="text-sm text-muted-foreground">
                System automatically detects response type and updates customer records immediately
              </p>
            </div>

            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Confirmation</h3>
              <p className="text-sm text-muted-foreground">
                Customer receives automatic confirmation and database is updated for future campaigns
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Supported Response Types:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><strong>SOLD</strong> - Marks vehicle as sold</div>
              <div><strong>EMAIL address</strong> - Adds email to customer</div>
              <div><strong>STOP</strong> - Opts customer out</div>
              <div><strong>Phone number</strong> - Updates contact info</div>
              <div><strong>Other messages</strong> - Logged for manual review</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
