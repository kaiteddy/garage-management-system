"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  Phone, 
  Mail,
  Settings,
  Play,
  Zap,
  Database,
  Webhook,
  MessageCircle,
  ExternalLink,
  Copy,
  Shield
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TestResult {
  status: 'passed' | 'failed' | 'warning'
  details: any
  issues?: string[]
}

interface TestResults {
  configuration: TestResult | null
  database: TestResult | null
  sms: TestResult | null
  whatsapp: TestResult | null
  smartSend: TestResult | null
  webhooks: TestResult | null
}

interface WhatsAppSetup {
  configured: boolean
  sandbox: boolean
  production: boolean
  whatsappNumber: string
  senders: any[]
  messagingServices: any[]
  sandboxInfo: any
}

export default function TestCommunicationsPage() {
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [whatsappSetup, setWhatsappSetup] = useState<WhatsAppSetup | null>(null)
  const [loading, setLoading] = useState(false)
  const [testPhoneNumber, setTestPhoneNumber] = useState('+447488896449')
  const [dryRun, setDryRun] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchWhatsAppSetup()
  }, [])

  const fetchWhatsAppSetup = async () => {
    try {
      const response = await fetch('/api/whatsapp/setup-sender')
      const data = await response.json()
      
      if (data.success) {
        setWhatsappSetup(data.setup)
      }
    } catch (error) {
      console.error('Error fetching WhatsApp setup:', error)
    }
  }

  const runTest = async (testType: string = 'full') => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/test-communication-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType,
          testPhoneNumber,
          dryRun
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setTestResults(data.testResults.results)
        
        toast({
          title: "Test Completed",
          description: `${data.testResults.summary.passed}/${data.testResults.summary.totalTests} tests passed`,
        })
      } else {
        throw new Error(data.error || 'Test failed')
      }
    } catch (error) {
      console.error('Error running test:', error)
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const setupWhatsApp = async (action: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/whatsapp/setup-sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          phoneNumber: testPhoneNumber
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "WhatsApp Setup",
          description: data.result.message || "Action completed successfully",
        })
        
        // Refresh setup info
        fetchWhatsAppSetup()
      } else {
        throw new Error(data.error || 'Setup failed')
      }
    } catch (error) {
      console.error('Error setting up WhatsApp:', error)
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestCampaign = async (campaignType: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/reminders/mot-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType,
          dryRun: true,
          limit: 5
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Test Campaign",
          description: `Campaign preview generated for ${data.campaign.eligibleCustomers} customers`,
        })
      } else {
        throw new Error(data.error || 'Campaign test failed')
      }
    } catch (error) {
      console.error('Error testing campaign:', error)
      toast({
        title: "Campaign Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge variant="default">Passed</Badge>
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Not Tested</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication System Testing</h1>
          <p className="text-muted-foreground">
            Test and verify all communication channels and functionality
          </p>
        </div>
        <Button 
          onClick={() => runTest('full')} 
          disabled={loading}
          className="flex items-center space-x-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="h-4 w-4" />
          )}
          <span>Run Full Test</span>
        </Button>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure test parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testPhone">Test Phone Number</Label>
              <Input
                id="testPhone"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+447488896449"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use your own number for testing
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dryRun"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dryRun">Dry Run (recommended)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Setup</TabsTrigger>
          <TabsTrigger value="individual">Individual Tests</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Tests</TabsTrigger>
          <TabsTrigger value="results">Detailed Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Config</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.configuration?.status || 'not_tested')}
                  {getStatusBadge(testResults?.configuration?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Database</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.database?.status || 'not_tested')}
                  {getStatusBadge(testResults?.database?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>SMS</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.sms?.status || 'not_tested')}
                  {getStatusBadge(testResults?.sms?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.whatsapp?.status || 'not_tested')}
                  {getStatusBadge(testResults?.whatsapp?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Smart Send</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.smartSend?.status || 'not_tested')}
                  {getStatusBadge(testResults?.smartSend?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Webhook className="h-4 w-4" />
                  <span>Webhooks</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(testResults?.webhooks?.status || 'not_tested')}
                  {getStatusBadge(testResults?.webhooks?.status || 'not_tested')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common testing and setup tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  onClick={() => runTest('config')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Settings className="h-6 w-6 mb-2" />
                  Test Config
                </Button>

                <Button
                  onClick={() => runTest('sms')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Phone className="h-6 w-6 mb-2" />
                  Test SMS
                </Button>

                <Button
                  onClick={() => runTest('whatsapp')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <MessageCircle className="h-6 w-6 mb-2" />
                  Test WhatsApp
                </Button>

                <Button
                  onClick={() => setupWhatsApp('verify')}
                  disabled={loading}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Shield className="h-6 w-6 mb-2" />
                  Verify Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Sender Configuration</CardTitle>
              <CardDescription>
                Setup and verify WhatsApp Business API integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-medium">Configuration</span>
                  </div>
                  <Badge variant={whatsappSetup?.configured ? "default" : "destructive"}>
                    {whatsappSetup?.configured ? "Configured" : "Not Configured"}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {whatsappSetup?.whatsappNumber || "No WhatsApp number set"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TestTube className="h-5 w-5" />
                    <span className="font-medium">Mode</span>
                  </div>
                  <Badge variant={whatsappSetup?.sandbox ? "secondary" : whatsappSetup?.production ? "default" : "destructive"}>
                    {whatsappSetup?.sandbox ? "Sandbox" : whatsappSetup?.production ? "Production" : "Not Set"}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {whatsappSetup?.sandbox ? "Testing mode" : whatsappSetup?.production ? "Live mode" : "No mode configured"}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">Senders</span>
                  </div>
                  <div className="text-2xl font-bold">{whatsappSetup?.senders?.length || 0}</div>
                  <p className="text-sm text-muted-foreground">Active senders</p>
                </div>
              </div>

              {/* Sandbox Setup */}
              {whatsappSetup?.sandbox && whatsappSetup?.sandboxInfo && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🧪 Sandbox Configuration</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Sandbox Number:</strong> {whatsappSetup.sandboxInfo.number}</p>
                    <p><strong>Join Code:</strong> {whatsappSetup.sandboxInfo.joinCode}</p>
                    <p className="text-blue-600">{whatsappSetup.sandboxInfo.note}</p>
                  </div>
                </div>
              )}

              {/* Setup Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Setup Actions</h4>
                  
                  <Button
                    onClick={() => setupWhatsApp('setup_sandbox')}
                    disabled={loading}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Setup Sandbox (Testing)
                  </Button>

                  <Button
                    onClick={() => setupWhatsApp('setup_production')}
                    disabled={loading}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Setup Production
                  </Button>

                  <Button
                    onClick={() => setupWhatsApp('verify')}
                    disabled={loading}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Configuration
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Testing Actions</h4>
                  
                  <Button
                    onClick={() => setupWhatsApp('test_send')}
                    disabled={loading || !whatsappSetup?.configured}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Send Test Message
                  </Button>

                  <Button
                    onClick={() => window.open('https://console.twilio.com/us1/develop/sms/whatsapp/senders', '_blank')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Twilio Console
                  </Button>

                  <Button
                    onClick={() => copyToClipboard(whatsappSetup?.whatsappNumber || '', 'WhatsApp Number')}
                    disabled={!whatsappSetup?.whatsappNumber}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy WhatsApp Number
                  </Button>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Required Environment Variables</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex items-center justify-between">
                    <span>TWILIO_WHATSAPP_NUMBER</span>
                    <Badge variant={whatsappSetup?.whatsappNumber ? "default" : "destructive"}>
                      {whatsappSetup?.whatsappNumber ? "Set" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>TWILIO_ACCOUNT_SID</span>
                    <Badge variant={process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID ? "default" : "destructive"}>
                      {process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID ? "Set" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>TWILIO_AUTH_TOKEN</span>
                    <Badge variant={process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN ? "default" : "destructive"}>
                      {process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN ? "Set" : "Missing"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration Test</CardTitle>
                <CardDescription>Verify environment variables and credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('config')}
                  disabled={loading}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Test Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Database Test</CardTitle>
                <CardDescription>Check database connectivity and tables</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('database')}
                  disabled={loading}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Test Database
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SMS Test</CardTitle>
                <CardDescription>Test SMS sending functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('sms')}
                  disabled={loading}
                  className="w-full"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Test SMS
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">WhatsApp Test</CardTitle>
                <CardDescription>Test WhatsApp messaging functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('whatsapp')}
                  disabled={loading}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Test WhatsApp
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Smart Send Test</CardTitle>
                <CardDescription>Test intelligent multi-channel communication</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('smartsend')}
                  disabled={loading}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Smart Send
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Webhook Test</CardTitle>
                <CardDescription>Verify webhook configuration and accessibility</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTest('webhooks')}
                  disabled={loading}
                  className="w-full"
                >
                  <Webhook className="h-4 w-4 mr-2" />
                  Test Webhooks
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Testing</CardTitle>
              <CardDescription>Test MOT reminder campaigns with dry run</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-red-600 mb-2">Critical Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test expired and critical MOT reminders
                  </p>
                  <Button
                    onClick={() => sendTestCampaign('critical')}
                    disabled={loading}
                    variant="destructive"
                    className="w-full"
                  >
                    Test Critical Campaign
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-orange-600 mb-2">Due Soon Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test MOTs expiring within 30 days
                  </p>
                  <Button
                    onClick={() => sendTestCampaign('due_soon')}
                    disabled={loading}
                    variant="secondary"
                    className="w-full"
                  >
                    Test Due Soon Campaign
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-blue-600 mb-2">Upcoming Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test MOTs expiring within 60 days
                  </p>
                  <Button
                    onClick={() => sendTestCampaign('upcoming')}
                    disabled={loading}
                    variant="default"
                    className="w-full"
                  >
                    Test Upcoming Campaign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {testResults ? (
            <div className="space-y-4">
              {Object.entries(testResults).map(([testName, result]) => (
                result && (
                  <Card key={testName}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <span className="capitalize">{testName} Test</span>
                        {getStatusBadge(result.status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.issues && result.issues.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-red-600">Issues:</h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {result.issues.map((issue, index) => (
                                <li key={index} className="text-red-600">{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-semibold">Details:</h4>
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground">No test results yet. Run a test to see detailed results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
