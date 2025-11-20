"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Phone, 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  TestTube
} from "lucide-react"
import { toast } from "sonner"

interface TwilioConfig {
  twilio: {
    status: string
    accountSid: string
  }
  phoneNumber: {
    number: string
    info: any
  }
  whatsapp: {
    status: string
    number: string
  }
  webhooks: {
    voice: string
    sms: string
    whatsapp: string
  }
}

export default function TwilioConfigPage() {
  const [config, setConfig] = useState<TwilioConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/twilio/test-config')
      const result = await response.json()
      
      if (result.success) {
        setConfig(result.configuration)
      } else {
        toast.error("Failed to load Twilio configuration")
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error("Error loading configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const testVoiceWebhook = async () => {
    try {
      setIsTesting(true)
      const response = await fetch('/api/twilio/test-voice')
      
      if (response.ok) {
        toast.success("Voice webhook test successful! Check the response.")
      } else {
        toast.error("Voice webhook test failed")
      }
    } catch (error) {
      console.error('Error testing voice webhook:', error)
      toast.error("Error testing voice webhook")
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const getStatusIcon = (status: string) => {
    if (status.includes('✅')) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.includes('❌')) return <XCircle className="h-4 w-4 text-red-500" />
    if (status.includes('🧪')) return <TestTube className="h-4 w-4 text-orange-500" />
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusBadge = (status: string) => {
    if (status.includes('✅')) return <Badge variant="default" className="bg-green-600">Connected</Badge>
    if (status.includes('❌')) return <Badge variant="destructive">Not Configured</Badge>
    if (status.includes('🧪')) return <Badge variant="secondary">Sandbox</Badge>
    return <Badge variant="outline">Unknown</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Twilio Configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Twilio Configuration</h2>
          <p className="text-muted-foreground">
            Configure and test your Twilio services for ELI MOTORS LTD
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadConfiguration} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={testVoiceWebhook} disabled={isTesting}>
            <TestTube className="mr-2 h-4 w-4" />
            {isTesting ? 'Testing...' : 'Test Voice'}
          </Button>
        </div>
      </div>

      {config && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Twilio Account Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Twilio Account</CardTitle>
              {getStatusIcon(config.twilio.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {getStatusBadge(config.twilio.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                Account: {config.twilio.accountSid}
              </p>
            </CardContent>
          </Card>

          {/* Phone Number Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone Number</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {config.phoneNumber.number}
              </div>
              <p className="text-xs text-muted-foreground">
                Voice: {config.phoneNumber.info?.capabilities?.voice || '❌'}
                SMS: {config.phoneNumber.info?.capabilities?.sms || '❌'}
              </p>
            </CardContent>
          </Card>

          {/* WhatsApp Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {getStatusBadge(config.whatsapp.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {config.whatsapp.number}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhook Configuration</TabsTrigger>
          <TabsTrigger value="phone">Phone Number Setup</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Business</TabsTrigger>
          <TabsTrigger value="testing">Testing & Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook URLs</CardTitle>
              <CardDescription>
                Configure these URLs in your Twilio Console for proper functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice Webhook</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                        {config.webhooks.voice}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(config.webhooks.voice)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">SMS Webhook</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                        {config.webhooks.sms}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(config.webhooks.sms)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Webhook</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                        {config.webhooks.whatsapp}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(config.webhooks.whatsapp)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phone Number Configuration</CardTitle>
              <CardDescription>
                Configure your Twilio phone number (+447488896449) for voice and SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Step 1: Access Twilio Console</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Go to your Twilio Console to configure the phone number
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Open Twilio Console
                    </a>
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Step 2: Configure Webhooks</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Click on your phone number (+447488896449)</li>
                    <li>Set Voice webhook to: {config?.webhooks.voice}</li>
                    <li>Set SMS webhook to: {config?.webhooks.sms}</li>
                    <li>Set HTTP method to POST for both</li>
                    <li>Save configuration</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Step 3: Test Configuration</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Test your phone number after configuration
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Phone className="mr-2 h-3 w-3" />
                      Call +447488896449
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="mr-2 h-3 w-3" />
                      Send Test SMS
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business API</CardTitle>
              <CardDescription>
                Set up WhatsApp Business API for ELI MOTORS LTD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="flex items-center space-x-2">
                    {config && getStatusBadge(config.whatsapp.status)}
                    <span className="text-sm text-muted-foreground">
                      {config?.whatsapp.number}
                    </span>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Apply for Production WhatsApp</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Apply for WhatsApp Business API to send messages to any customer
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Apply for WhatsApp Business
                    </a>
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Message Templates</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create and submit message templates for approval
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://console.twilio.com/us1/develop/sms/senders/whatsapp-templates" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Manage Templates
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing & Validation</CardTitle>
              <CardDescription>
                Test your Twilio configuration to ensure everything works correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Voice System Test</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Test the voice webhook and menu system
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testVoiceWebhook}
                    disabled={isTesting}
                  >
                    <TestTube className="mr-2 h-3 w-3" />
                    {isTesting ? 'Testing...' : 'Test Voice Webhook'}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">WhatsApp Test</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send a test WhatsApp message
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/whatsapp-management">
                      <MessageSquare className="mr-2 h-3 w-3" />
                      WhatsApp Management
                    </a>
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">SMS Test</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Test SMS functionality
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/sms-dashboard">
                      <MessageSquare className="mr-2 h-3 w-3" />
                      SMS Dashboard
                    </a>
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">MOT Reminders</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Test MOT reminder system
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/mot-critical">
                      <Settings className="mr-2 h-3 w-3" />
                      MOT Critical
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
