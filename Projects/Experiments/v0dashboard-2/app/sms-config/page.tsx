"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react"

export default function SMSConfigPage() {
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    fullyConfigured: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/sms/send-mot-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, limit: 1 })
      })
      const data = await response.json()

      if (data.success && data.twilioConfig) {
        setConfig(data.twilioConfig)
      }
    } catch (error) {
      console.error('Error fetching SMS config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testSMSSystem = async () => {
    setTestResult(null)
    try {
      const response = await fetch('/api/sms/send-mot-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, limit: 3 })
      })
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test SMS system'
      })
    }
  }

  const initializeTables = async () => {
    try {
      const response = await fetch('/api/sms/initialize-tables', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        alert('SMS tables initialized successfully!')
      } else {
        alert('Failed to initialize SMS tables')
      }
    } catch (error) {
      alert('Error initializing SMS tables')
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Configuration</h1>
          <p className="text-gray-600">Configure Twilio SMS integration for MOT reminders</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.fullyConfigured ? "default" : "destructive"}>
            {config.fullyConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Configured
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="test">Test System</TabsTrigger>
          <TabsTrigger value="responses">Customer Responses</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          {/* Current Configuration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Configuration
              </CardTitle>
              <CardDescription>
                Current Twilio SMS configuration status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Account SID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={config.accountSid}
                      readOnly
                      type={showTokens ? "text" : "password"}
                      className="font-mono text-sm"
                    />
                    {config.accountSid !== 'NOT_SET' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(config.accountSid)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={config.authToken}
                      readOnly
                      type="password"
                      className="font-mono text-sm"
                    />
                    <Badge variant={config.authToken === 'NOT_SET' ? "destructive" : "default"}>
                      {config.authToken === 'NOT_SET' ? 'Not Set' : 'Set'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={config.phoneNumber}
                      readOnly
                      className="font-mono text-sm"
                    />
                    {config.phoneNumber !== 'NOT_SET' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(config.phoneNumber)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showTokens ? 'Hide' : 'Show'} Tokens
                </Button>
                <Button onClick={fetchConfig}>
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Actions */}
          <Card>
            <CardHeader>
              <CardTitle>System Actions</CardTitle>
              <CardDescription>
                Initialize database tables and test the SMS system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={initializeTables} variant="outline">
                  Initialize SMS Tables
                </Button>
                <Button onClick={testSMSSystem}>
                  Test SMS System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Twilio Setup Guide</CardTitle>
              <CardDescription>
                Step-by-step guide to configure Twilio SMS integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg">Step 1: Create Twilio Account</h3>
                  <p className="text-gray-600 mb-2">
                    Sign up for a Twilio account and get your credentials
                  </p>
                  <Button variant="outline" asChild>
                    <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sign up for Twilio
                    </a>
                  </Button>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-lg">Step 2: Get Your Credentials</h3>
                  <p className="text-gray-600 mb-2">
                    From your Twilio Console, copy these values:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li><strong>Account SID</strong> - Your unique account identifier</li>
                    <li><strong>Auth Token</strong> - Your authentication token</li>
                    <li><strong>Phone Number</strong> - Your Twilio phone number (format: +1234567890)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-lg">Step 3: Set Environment Variables</h3>
                  <p className="text-gray-600 mb-2">
                    Add these environment variables to your .env.local file:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-md font-mono text-sm space-y-1">
                    <div>TWILIO_ACCOUNT_SID=your_account_sid_here</div>
                    <div>TWILIO_AUTH_TOKEN=your_auth_token_here</div>
                    <div>TWILIO_PHONE_NUMBER=+1234567890</div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-lg">Step 4: Restart Application</h3>
                  <p className="text-gray-600">
                    Restart your Next.js application to load the new environment variables.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>SMS System Test</CardTitle>
              <CardDescription>
                Test the SMS system with sample MOT reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testSMSSystem} disabled={!config.fullyConfigured}>
                Run SMS Test (Dry Run)
              </Button>

              {testResult && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {testResult.success
                        ? `Test completed successfully. Found ${testResult.summary?.totalCustomers || 0} customers with ${testResult.summary?.totalVehicles || 0} vehicles needing MOT reminders.`
                        : `Test failed: ${testResult.error}`
                      }
                    </AlertDescription>
                  </Alert>

                  {testResult.success && testResult.sampleMessages && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Sample Messages:</h4>
                      {testResult.sampleMessages.slice(0, 3).map((msg: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                          <div className="font-medium">To: {msg.customer.name} ({msg.phone})</div>
                          <div className="text-gray-600 mt-1">{msg.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Estimated cost: £{msg.estimatedCost} | Urgency: {msg.urgency}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          {/* Customer Response Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Response Testing</CardTitle>
              <CardDescription>
                Simulate customer responses to test the automated processing system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Simulate Customer Response</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Customer Phone Number</Label>
                      <Input
                        placeholder="+447123456789"
                        className="font-mono"
                        id="test-phone"
                      />
                    </div>
                    <div>
                      <Label>Vehicle Registration (optional)</Label>
                      <Input
                        placeholder="AB12 CDE"
                        className="font-mono"
                        id="test-reg"
                      />
                    </div>
                    <div>
                      <Label>Customer Message</Label>
                      <Input
                        placeholder="SOLD"
                        id="test-message"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        const phone = (document.getElementById('test-phone') as HTMLInputElement)?.value
                        const reg = (document.getElementById('test-reg') as HTMLInputElement)?.value
                        const message = (document.getElementById('test-message') as HTMLInputElement)?.value

                        if (!phone || !message) {
                          alert('Please enter phone number and message')
                          return
                        }

                        try {
                          const response = await fetch('/api/sms/simulate-response', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phoneNumber: phone, message, vehicleRegistration: reg })
                          })
                          const data = await response.json()

                          if (data.success) {
                            alert(`Response processed: ${data.actionTaken}`)
                          } else {
                            alert(`Error: ${data.error}`)
                          }
                        } catch (error) {
                          alert('Failed to simulate response')
                        }
                      }}
                    >
                      Simulate Response
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Response Examples</h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="font-medium text-green-800">"SOLD"</div>
                      <div className="text-green-600">Marks the vehicle as sold and removes from MOT reminders</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-md">
                      <div className="font-medium text-red-800">"STOP"</div>
                      <div className="text-red-600">Opts the customer out of all SMS communications</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="font-medium text-blue-800">"john@example.com"</div>
                      <div className="text-blue-600">Updates the customer's email address</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-medium text-gray-800">"Thanks for the reminder"</div>
                      <div className="text-gray-600">Logged for manual review - no automatic action</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button variant="outline" asChild>
                      <a href="/sms-dashboard" target="_blank">
                        View SMS Dashboard
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-6">
          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure Twilio webhook to handle customer responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/api/sms/webhook`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/sms/webhook`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure this URL in your Twilio Console under Phone Numbers → Messaging
                  </p>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your webhook URL is publicly accessible. For local development, use ngrok or similar tunneling service.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold">Supported Customer Responses:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li><strong>SOLD</strong> - Mark vehicle as sold</li>
                    <li><strong>STOP</strong> - Opt out of SMS communications</li>
                    <li><strong>Email address</strong> - Update customer email</li>
                    <li><strong>Other responses</strong> - Logged for manual review</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
