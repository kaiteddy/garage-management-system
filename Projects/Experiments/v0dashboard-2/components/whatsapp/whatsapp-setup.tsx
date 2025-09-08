"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Settings,
  Send,
  Loader2,
  Copy,
  ExternalLink,
  Shield,
  Zap
} from "lucide-react"
import { toast } from "sonner"

interface WhatsAppConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
  whatsappNumber: string
  webhookUrl: string
  verifyToken: string
}

interface WhatsAppStatus {
  twilioConnected: boolean
  whatsappConfigured: boolean
  webhookVerified: boolean
  businessProfileSetup: boolean
  templatesApproved: boolean
  readyForProduction: boolean
}

export function WhatsAppSetup() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    whatsappNumber: '',
    webhookUrl: '',
    verifyToken: ''
  })
  
  const [status, setStatus] = useState<WhatsAppStatus>({
    twilioConnected: false,
    whatsappConfigured: false,
    webhookVerified: false,
    businessProfileSetup: false,
    templatesApproved: false,
    readyForProduction: false
  })
  
  const [loading, setLoading] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')

  useEffect(() => {
    checkWhatsAppStatus()
    loadConfiguration()
  }, [])

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error)
    }
  }

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/whatsapp/config')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    }
  }

  const testWhatsAppConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/test-connection', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('WhatsApp connection test successful!')
        await checkWhatsAppStatus()
      } else {
        toast.error(`Connection test failed: ${data.error}`)
      }
    } catch (error) {
      toast.error('Error testing connection')
    } finally {
      setLoading(false)
    }
  }

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Please enter phone number and message')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: testPhone,
          message: testMessage
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Test message sent successfully!')
        setTestMessage('')
      } else {
        toast.error(`Failed to send message: ${data.error}`)
      }
    } catch (error) {
      toast.error('Error sending test message')
    } finally {
      setLoading(false)
    }
  }

  const initializeWhatsApp = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/initialize', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('WhatsApp initialized successfully!')
        await checkWhatsAppStatus()
      } else {
        toast.error(`Initialization failed: ${data.error}`)
      }
    } catch (error) {
      toast.error('Error initializing WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard!')
  }

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={status ? 'text-green-700' : 'text-red-700'}>{label}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold">WhatsApp Business Setup</h1>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Status & Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                WhatsApp Business Status
              </CardTitle>
              <CardDescription>
                Current status of your WhatsApp Business integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusIndicator status={status.twilioConnected} label="Twilio Connected" />
                <StatusIndicator status={status.whatsappConfigured} label="WhatsApp Configured" />
                <StatusIndicator status={status.webhookVerified} label="Webhook Verified" />
                <StatusIndicator status={status.businessProfileSetup} label="Business Profile Setup" />
                <StatusIndicator status={status.templatesApproved} label="Templates Approved" />
                <StatusIndicator status={status.readyForProduction} label="Ready for Production" />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={testWhatsAppConnection}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Test Connection
                </Button>
                
                <Button 
                  onClick={initializeWhatsApp}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  Initialize WhatsApp
                </Button>
              </div>

              {status.readyForProduction && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 WhatsApp Business is ready for production! You can now send messages to customers.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>
                Your Twilio account settings for WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account SID</Label>
                  <Input 
                    value={config.accountSid} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                </div>
                
                <div>
                  <Label>Phone Number</Label>
                  <Input 
                    value={config.phoneNumber} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                </div>
                
                <div>
                  <Label>WhatsApp Number</Label>
                  <Input 
                    value={config.whatsappNumber} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                </div>
                
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/api/whatsapp/webhook`}
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These settings are configured via environment variables. Contact your administrator to modify them.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
              <CardDescription>
                Test your WhatsApp integration by sending a message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Phone Number (with country code)</Label>
                <Input 
                  placeholder="+447123456789"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Test Message</Label>
                <Input 
                  placeholder="Hello from ELI MOTORS LTD!"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={sendTestMessage}
                disabled={loading || !testPhone || !testMessage}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Test Message
              </Button>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Test messages will be sent via WhatsApp if configured, or SMS as fallback.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Manage your WhatsApp Business message templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Message templates will be managed here once WhatsApp Business is fully configured.
                </p>
                <Button variant="outline" asChild>
                  <a href="/whatsapp-management" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Go to WhatsApp Management
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
