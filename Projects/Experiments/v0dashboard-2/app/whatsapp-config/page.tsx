"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Settings,
  CheckCircle,
  AlertTriangle,
  Phone,
  Loader2,
  Send,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface WhatsAppConfig {
  current_setup: {
    whatsapp_type: string
    sms_configured: boolean
    whatsapp_configured: boolean
    fully_configured: boolean
  }
  environment_variables: {
    TWILIO_ACCOUNT_SID: string
    TWILIO_AUTH_TOKEN: string
    TWILIO_PHONE_NUMBER: string
    TWILIO_WHATSAPP_NUMBER: string
  }
  setup_instructions: string[]
  connection_test: any
}

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState("+447843275372")
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/setup-correct')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error("Failed to load WhatsApp configuration")
    } finally {
      setLoading(false)
    }
  }

  const testWhatsApp = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/whatsapp/setup-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_whatsapp',
          phoneNumber: testPhone
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`WhatsApp test sent via ${result.details.channel_used}`)
      } else {
        toast.error(`WhatsApp test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error("Error testing WhatsApp")
    } finally {
      setTestLoading(false)
    }
  }

  const testSMS = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/whatsapp/setup-correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_sms',
          phoneNumber: testPhone
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`SMS test sent successfully`)
      } else {
        toast.error(`SMS test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error("Error testing SMS")
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold">WhatsApp Configuration</h1>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Current Status</TabsTrigger>
          <TabsTrigger value="setup">Setup Instructions</TabsTrigger>
          <TabsTrigger value="test">Test Messages</TabsTrigger>
          <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">WhatsApp Type</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.current_setup.whatsapp_type === 'sandbox' ? 'secondary' : 'default'}>
                          {config.current_setup.whatsapp_type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">SMS Configured</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {config.current_setup.sms_configured ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {config.current_setup.sms_configured ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Environment Variables</Label>
                    <div className="grid grid-cols-1 gap-2 text-sm font-mono bg-muted p-3 rounded">
                      <div>TWILIO_ACCOUNT_SID: {config.environment_variables.TWILIO_ACCOUNT_SID}</div>
                      <div>TWILIO_AUTH_TOKEN: {config.environment_variables.TWILIO_AUTH_TOKEN}</div>
                      <div>TWILIO_PHONE_NUMBER: {config.environment_variables.TWILIO_PHONE_NUMBER}</div>
                      <div>TWILIO_WHATSAPP_NUMBER: {config.environment_variables.TWILIO_WHATSAPP_NUMBER}</div>
                    </div>
                  </div>

                  {config.connection_test && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Connection Test: {config.connection_test.success ? 
                          `✅ Connected (${config.connection_test.accountStatus})` : 
                          `❌ Failed: ${config.connection_test.error}`
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to configure WhatsApp properly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {config?.setup_instructions && config.setup_instructions.length > 0 ? (
                <div className="space-y-2">
                  {config.setup_instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <span className="text-sm">{instruction}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    WhatsApp not configured. Please set up environment variables first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Messages
              </CardTitle>
              <CardDescription>
                Send test messages to verify WhatsApp and SMS functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testPhone">Test Phone Number</Label>
                <Input
                  id="testPhone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+447123456789"
                  className="font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={testWhatsApp} 
                  disabled={testLoading}
                  className="flex items-center gap-2"
                >
                  {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Test WhatsApp
                </Button>
                
                <Button 
                  onClick={testSMS} 
                  disabled={testLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  Test SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshoot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Issues & Solutions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Phone Number Format</h4>
                  <p className="text-sm text-muted-foreground">
                    Use international format: +447123456789 (not 07123456789)
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">WhatsApp Sandbox</h4>
                  <p className="text-sm text-muted-foreground">
                    Users must join sandbox by sending "join art-taught" to +14155238886
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">Automatic Fallback</h4>
                  <p className="text-sm text-muted-foreground">
                    System automatically falls back to SMS if WhatsApp fails
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp Business verification has rate limits. Wait 24-48 hours between attempts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
