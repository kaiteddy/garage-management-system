"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertCircle, MessageSquare, Phone, DollarSign, Users, Clock, ExternalLink } from 'lucide-react'

interface WhatsAppConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
  whatsappNumber: string
  smsConfigured: boolean
  whatsappConfigured: boolean
  fullyConfigured: boolean
}

interface SetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  action?: string
  link?: string
}

export default function WhatsAppSetupPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/sms/dashboard')
      const data = await response.json()
      
      if (data.success && data.smsDashboard.twilioConfiguration) {
        setConfig(data.smsDashboard.twilioConfiguration)
      }
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testWhatsApp = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/sms/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: '+447123456789', // Test number
          message: 'Test WhatsApp message from GarageManager Pro'
        })
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: 'Failed to test WhatsApp' })
    } finally {
      setTestLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const setupSteps: SetupStep[] = [
    {
      id: 'meta-business',
      title: 'Create Meta Business Manager Account',
      description: 'Set up your Meta Business Manager account (free)',
      status: 'pending',
      action: 'Create Account',
      link: 'https://business.facebook.com/'
    },
    {
      id: 'twilio-account',
      title: 'Set up Twilio Account',
      description: 'Create or access your Twilio account',
      status: config?.accountSid !== 'NOT_SET' ? 'completed' : 'pending',
      action: 'Sign Up',
      link: 'https://www.twilio.com/try-twilio'
    },
    {
      id: 'whatsapp-sender',
      title: 'Register WhatsApp Sender',
      description: 'Register your business phone number with WhatsApp Business API',
      status: config?.whatsappConfigured ? 'completed' : 'pending',
      action: 'Register',
      link: 'https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders'
    },
    {
      id: 'configure-webhook',
      title: 'Configure Webhook',
      description: 'Set up webhook for receiving WhatsApp messages',
      status: 'pending',
      action: 'Configure'
    },
    {
      id: 'test-integration',
      title: 'Test Integration',
      description: 'Send test WhatsApp message to verify setup',
      status: config?.whatsappConfigured ? 'completed' : 'pending',
      action: 'Test'
    }
  ]

  const costComparison = [
    {
      channel: 'SMS',
      cost: '£0.04',
      description: 'Per message',
      volume: '1,000 messages = £40'
    },
    {
      channel: 'WhatsApp Service',
      cost: '£0.005',
      description: 'Per 24-hour conversation',
      volume: '1,000 conversations = £5'
    },
    {
      channel: 'WhatsApp Marketing',
      cost: '£0.025',
      description: 'Per 24-hour conversation',
      volume: '1,000 conversations = £25'
    }
  ]

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading WhatsApp configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Business API Setup</h1>
        <p className="text-gray-600">
          Set up WhatsApp Business API with Twilio for cost-effective customer communication
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cost Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Comparison: SMS vs WhatsApp
              </CardTitle>
              <CardDescription>
                WhatsApp Business API offers significant cost savings over traditional SMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {costComparison.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{item.channel}</h3>
                      <Badge variant={item.channel.includes('WhatsApp') ? 'default' : 'secondary'}>
                        {item.cost}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <p className="text-xs font-medium">{item.volume}</p>
                  </div>
                ))}
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Potential Savings:</strong> Switching to WhatsApp could save you up to 87.5% on messaging costs!
                  For 1,000 service reminders: SMS costs £40, WhatsApp costs just £5.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Current Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Twilio Account</span>
                    {config?.accountSid !== 'NOT_SET' ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Not Set
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>SMS Service</span>
                    {config?.smsConfigured ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>WhatsApp Service</span>
                    {config?.whatsappConfigured ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending Setup
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <p><strong>SMS Number:</strong> {config?.phoneNumber || 'Not configured'}</p>
                    <p><strong>WhatsApp Number:</strong> {config?.whatsappNumber || 'Not configured'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business API Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Cost Benefits</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 87.5% cheaper than SMS for service messages</li>
                    <li>• Conversation-based pricing (24-hour windows)</li>
                    <li>• No per-message charges within conversations</li>
                    <li>• Free customer-initiated conversations</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Feature Benefits</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Rich media support (images, documents)</li>
                    <li>• Higher engagement rates</li>
                    <li>• Read receipts and delivery status</li>
                    <li>• Better customer experience</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Setup Steps</CardTitle>
              <CardDescription>
                Follow these steps to set up WhatsApp Business API with Twilio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {setupSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.status === 'completed' ? 'bg-green-100 text-green-800' :
                        step.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-grow">
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      
                      {step.link && step.status !== 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(step.link, '_blank')}
                          className="flex items-center gap-2"
                        >
                          {step.action}
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <Badge variant={
                      step.status === 'completed' ? 'default' :
                      step.status === 'in-progress' ? 'secondary' :
                      'outline'
                    }>
                      {step.status === 'completed' ? 'Completed' :
                       step.status === 'in-progress' ? 'In Progress' :
                       'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Add these environment variables to your .env.local file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account-sid">TWILIO_ACCOUNT_SID</Label>
                  <Input 
                    id="account-sid"
                    value={config?.accountSid || ''}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Found in your Twilio Console Dashboard
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="auth-token">TWILIO_AUTH_TOKEN</Label>
                  <Input 
                    id="auth-token"
                    type="password"
                    placeholder="Your Twilio Auth Token"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Found in your Twilio Console Dashboard (keep secret!)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="sms-number">TWILIO_PHONE_NUMBER</Label>
                  <Input 
                    id="sms-number"
                    value={config?.phoneNumber || ''}
                    placeholder="+447xxxxxxxxx"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Twilio SMS phone number
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="whatsapp-number">TWILIO_WHATSAPP_NUMBER</Label>
                  <Input 
                    id="whatsapp-number"
                    value={config?.whatsappNumber || ''}
                    placeholder="whatsapp:+447xxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your WhatsApp Business number (with whatsapp: prefix)
                  </p>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    After adding these environment variables, restart your development server for changes to take effect.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test WhatsApp Integration</CardTitle>
              <CardDescription>
                Send a test WhatsApp message to verify your setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={testWhatsApp}
                  disabled={testLoading || !config?.whatsappConfigured}
                  className="w-full"
                >
                  {testLoading ? 'Sending Test Message...' : 'Send Test WhatsApp Message'}
                </Button>
                
                {testResult && (
                  <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      {testResult.success ? (
                        <div>
                          <p className="font-medium text-green-800">Test message sent successfully!</p>
                          <p className="text-sm text-green-700">Message SID: {testResult.messageSid}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-red-800">Test failed</p>
                          <p className="text-sm text-red-700">{testResult.error}</p>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {!config?.whatsappConfigured && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      WhatsApp is not configured yet. Complete the setup steps above to enable testing.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
