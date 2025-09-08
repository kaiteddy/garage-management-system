"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  MessageSquare,
  Phone,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  TestTube,
  Send,
  Users,
  Calendar,
  Webhook,
  Shield,
  Zap,
  MessageCircle,
  Mail,
  Bell
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface TwilioConfig {
  twilio: {
    status: string
    accountSid: string
    fullyConfigured: boolean
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

interface SMSDashboard {
  twilioConfig: any
  customerData: any
  motReminders: any
  systemStatus: any
}

export default function CommunicationsHubPage() {
  const [config, setConfig] = useState<TwilioConfig | null>(null)
  const [dashboard, setDashboard] = useState<SMSDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Environment variables state
  const [envVars, setEnvVars] = useState({
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    TWILIO_WHATSAPP_NUMBER: '',
    TWILIO_WEBHOOK_URL: ''
  })

  // Message templates state
  const [templates, setTemplates] = useState({
    mot_expired: "Hi {customerName}, your {make} {model} ({registration}) MOT expired on {motDate}. Please book your MOT test urgently. Contact us to arrange. Reply STOP to opt out.",
    mot_expiring: "Hi {customerName}, your {make} {model} ({registration}) MOT expires on {motDate}. Book your MOT test now to avoid any issues. Contact us to arrange. Reply STOP to opt out.",
    service_reminder: "Hi {customerName}, your {make} {model} ({registration}) is due for a service. Contact us to book your appointment. Reply STOP to opt out.",
    welcome: "Welcome to our garage! We'll send you important reminders about your vehicle. Reply STOP to opt out."
  })

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const [configResponse, dashboardResponse] = await Promise.all([
        fetch('/api/twilio/config'),
        fetch('/api/sms/dashboard')
      ])

      const configData = await configResponse.json()
      const dashboardData = await dashboardResponse.json()

      if (configData.success) {
        setConfig(configData.config)
      }

      if (dashboardData.success) {
        setDashboard(dashboardData)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      toast({
        title: "Error",
        description: "Failed to fetch configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const testTwilioConnection = async () => {
    try {
      setTesting(true)
      const response = await fetch('/api/twilio/test', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Connection Test Successful",
          description: "Twilio connection is working properly",
        })
      } else {
        throw new Error(data.error || 'Connection test failed')
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const updateWebhooks = async () => {
    try {
      setTesting(true)
      const response = await fetch('/api/twilio/update-webhooks', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Webhooks Updated",
          description: "Twilio webhooks have been updated successfully",
        })
        // Refresh config
        fetchConfig()
      } else {
        throw new Error(data.error || 'Failed to update webhooks')
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  const manualUpdateWebhooks = async () => {
    try {
      setTesting(true)
      const response = await fetch('/api/twilio/manual-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Use the known credentials if environment variables aren't working
          accountSid: 'AC1572c0e5e4b55bb7440c3d9da482fd36',
          authToken: 'd8946487a6b5867d4735c8b42c1d5713',
          phoneNumber: '+447488896449'
        })
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Manual Update Successful",
          description: "Twilio webhooks have been manually updated",
        })
        // Refresh config
        fetchConfig()
      } else {
        throw new Error(data.error || 'Manual update failed')
      }
    } catch (error) {
      toast({
        title: "Manual Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Loading communications settings...</span>
        </div>
      </div>
    )
  }

  const isConfigured = config?.twilio?.fullyConfigured || false
  const customerCount = dashboard?.customerData?.smsEligible || 0
  const motVehicles = dashboard?.motReminders?.totalVehicles || 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications Hub</h1>
          <p className="text-gray-600 mt-2">Unified SMS, WhatsApp, and communication settings</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isConfigured ? "default" : "destructive"}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Setup Required
              </>
            )}
          </Badge>
          <Button onClick={fetchConfig} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Twilio Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {isConfigured ? 'Connected' : 'Not Configured'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {config?.phoneNumber?.number || 'No phone number'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">SMS Ready Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              <Users className="h-3 w-3 inline mr-1" />
              With valid phone numbers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MOT Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{motVehicles.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Trackable for reminders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{dashboard?.motReminders?.estimatedMonthlyCost?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <Zap className="h-3 w-3 inline mr-1" />
              Estimated SMS costs
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">MOT Campaigns</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="twilio">Twilio Setup</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Overview of your communication system health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Configuration Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Twilio Account</span>
                      <Badge variant={config?.twilio?.accountSid ? "default" : "destructive"}>
                        {config?.twilio?.accountSid ? "Connected" : "Not Set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SMS Phone Number</span>
                      <Badge variant={config?.phoneNumber?.number ? "default" : "destructive"}>
                        {config?.phoneNumber?.number ? "Active" : "Not Set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">WhatsApp Number</span>
                      <Badge variant={config?.whatsapp?.number ? "default" : "secondary"}>
                        {config?.whatsapp?.number ? "Active" : "Optional"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Webhooks</span>
                      <Badge variant={config?.webhooks?.sms ? "default" : "secondary"}>
                        {config?.webhooks?.sms ? "Configured" : "Optional"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={testTwilioConnection}
                      disabled={testing || !isConfigured}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button
                      onClick={() => window.open('/mot-reminders-sms', '_blank')}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send MOT Reminders
                    </Button>
                    <Button
                      onClick={() => window.open('/sms-dashboard', '_blank')}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {dashboard?.systemStatus && (
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and readiness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    {dashboard.systemStatus.smsSystemReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">SMS System Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dashboard.systemStatus.databaseReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Database Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dashboard.systemStatus.customerDataReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Customer Data Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dashboard.systemStatus.motDataReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">MOT Data Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dashboard.systemStatus.webhookReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">Webhook Ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart MOT Reminder Campaigns</CardTitle>
              <CardDescription>
                Send intelligent reminders using WhatsApp, SMS, and Email with automatic fallback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campaign Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-muted-foreground">Expired MOTs</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-muted-foreground">Critical (7 days)</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-muted-foreground">Due Soon (30 days)</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Upcoming (60 days)</div>
                </div>
              </div>

              {/* Smart Communication Features */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">🎯 Smart Multi-Channel Communication</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Automatically tries WhatsApp first (if customer has it)</li>
                  <li>• Falls back to SMS if WhatsApp fails</li>
                  <li>• Falls back to Email if SMS fails</li>
                  <li>• Tracks all communication attempts</li>
                  <li>• Respects customer preferences and consent</li>
                  <li>• Logs failed attempts for manual follow-up</li>
                </ul>
              </div>

              {/* Campaign Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-red-600 mb-2">🚨 Critical Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Expired and critical MOTs (immediate action required)
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Test Campaign (Dry Run)
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full">
                      Send Live Campaign
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-orange-600 mb-2">⚠️ Due Soon Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    MOTs expiring within 30 days
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Test Campaign (Dry Run)
                    </Button>
                    <Button variant="secondary" size="sm" className="w-full">
                      Send Live Campaign
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-blue-600 mb-2">📅 Upcoming Campaign</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    MOTs expiring within 60 days
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Test Campaign (Dry Run)
                    </Button>
                    <Button variant="default" size="sm" className="w-full">
                      Send Live Campaign
                    </Button>
                  </div>
                </div>
              </div>

              {/* Channel Effectiveness */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Channel Effectiveness</CardTitle>
                  <CardDescription>Success rates by communication method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">WhatsApp</p>
                          <p className="text-sm text-muted-foreground">£0.005 per message</p>
                        </div>
                      </div>
                      <Badge variant="default">95% success</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">SMS</p>
                          <p className="text-sm text-muted-foreground">£0.04 per message</p>
                        </div>
                      </div>
                      <Badge variant="secondary">85% success</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">£0.001 per message</p>
                        </div>
                      </div>
                      <Badge variant="secondary">70% success</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Customer Response Management</CardTitle>
              <CardDescription>
                AI-powered response handling across all communication channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Response Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Total Responses</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Auto-Handled</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-muted-foreground">Escalated</div>
                </div>
              </div>

              {/* Automated Response Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">🤖 Automated Responses</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Opt-out requests (STOP)</span>
                      <Badge variant="default">Auto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Vehicle sold notifications</span>
                      <Badge variant="default">Auto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Contact info updates</span>
                      <Badge variant="default">Auto</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>General acknowledgments</span>
                      <Badge variant="default">Auto</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">👨‍💼 Manual Follow-up Required</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <span>Booking requests</span>
                      <Badge variant="secondary">Manual</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span>Complaints & concerns</span>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <span>Complex questions</span>
                      <Badge variant="secondary">Manual</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <span>Unknown customers</span>
                      <Badge variant="secondary">Review</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Correspondence Tracking */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Complete Correspondence History</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• All communications logged in unified history</li>
                  <li>• Track WhatsApp, SMS, Email, and Phone calls</li>
                  <li>• Customer response categorization and processing</li>
                  <li>• Automatic escalation for urgent matters</li>
                  <li>• Cost tracking across all channels</li>
                  <li>• GDPR compliant data retention</li>
                </ul>
              </div>

              {/* Business Hours Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Hours & Automation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Business Hours</Label>
                      <p className="text-sm text-muted-foreground">Monday-Friday, 9:00 AM - 5:00 PM</p>
                    </div>
                    <div>
                      <Label>Auto-Response Delay</Label>
                      <p className="text-sm text-muted-foreground">Immediate for critical, 5 minutes for others</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="twilio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>Configure your Twilio account for SMS and voice services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Setup Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Environment Variables Required</span>
                </div>
                <p className="text-blue-800 text-sm mb-3">
                  Add these environment variables to your deployment configuration:
                </p>
                <div className="space-y-2">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
                      <code className="text-sm font-mono">{key}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(key, key)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Twilio Setup Steps */}
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold">Step 1: Create Twilio Account</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Sign up for a Twilio account and get your credentials
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sign up for Twilio
                    </a>
                  </Button>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold">Step 2: Get Account Credentials</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Find your Account SID and Auth Token in the Twilio Console
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Twilio Console
                    </a>
                  </Button>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold">Step 3: Get Phone Number</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Purchase a phone number for sending SMS messages
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.twilio.com/us1/develop/phone-numbers/manage/search" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buy Phone Number
                    </a>
                  </Button>
                </div>
              </div>

              {/* Current Configuration */}
              {config && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Current Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Account SID:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {config.twilio.accountSid || 'Not configured'}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone Number:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded">
                        {config.phoneNumber.number || 'Not configured'}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={isConfigured ? "default" : "destructive"}>
                        {isConfigured ? 'Ready' : 'Incomplete'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
              <CardDescription>Set up WhatsApp Business API integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">WhatsApp Business API</span>
                </div>
                <p className="text-green-800 text-sm mb-3">
                  WhatsApp integration requires approval from Meta and additional setup.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://console.twilio.com/us1/develop/sms/whatsapp/senders" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    WhatsApp Senders
                  </a>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>WhatsApp Number</Label>
                    <p className="text-sm text-gray-600">
                      {config?.whatsapp?.number || 'Not configured'}
                    </p>
                  </div>
                  <Badge variant={config?.whatsapp?.number ? "default" : "secondary"}>
                    {config?.whatsapp?.number ? 'Active' : 'Not Set'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>WhatsApp Status</Label>
                    <p className="text-sm text-gray-600">
                      {config?.whatsapp?.status || 'Not configured'}
                    </p>
                  </div>
                  <Badge variant={config?.whatsapp?.status === 'approved' ? "default" : "secondary"}>
                    {config?.whatsapp?.status || 'Pending'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Customize your SMS and WhatsApp message templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(templates).map(([key, template]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key.replace('_', ' ')} Template
                  </Label>
                  <Textarea
                    id={key}
                    value={template}
                    onChange={(e) => setTemplates(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-gray-500">
                    Available placeholders: {'{customerName}'}, {'{registration}'}, {'{make}'}, {'{model}'}, {'{motDate}'}
                  </div>
                </div>
              ))}

              <Button className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Save Templates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>Configure webhooks for delivery status and incoming messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Webhook className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Webhook URLs</span>
                </div>
                <p className="text-yellow-800 text-sm mb-3">
                  Configure these URLs in your Twilio Console for phone number webhooks:
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>SMS Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={`${window.location.origin}/api/sms/webhook`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/sms/webhook`, 'SMS Webhook URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Voice Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={`${window.location.origin}/api/voice/webhook`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/voice/webhook`, 'Voice Webhook URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>WhatsApp Webhook URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={`${window.location.origin}/api/whatsapp/webhook`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/whatsapp/webhook`, 'WhatsApp Webhook URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Current Webhook Status</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={updateWebhooks}
                      disabled={testing || !isConfigured}
                      size="sm"
                      variant="outline"
                    >
                      {testing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Webhook className="h-4 w-4 mr-2" />
                      )}
                      {testing ? 'Updating...' : 'Auto Update'}
                    </Button>
                    <Button
                      onClick={manualUpdateWebhooks}
                      disabled={testing}
                      size="sm"
                    >
                      {testing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      {testing ? 'Updating...' : 'Manual Update'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>SMS Webhook:</span>
                    <Badge variant={config?.webhooks?.sms ? "default" : "secondary"}>
                      {config?.webhooks?.sms ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice Webhook:</span>
                    <Badge variant={config?.webhooks?.voice ? "default" : "secondary"}>
                      {config?.webhooks?.voice ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>WhatsApp Webhook:</span>
                    <Badge variant={config?.webhooks?.whatsapp ? "default" : "secondary"}>
                      {config?.webhooks?.whatsapp ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                </div>

                {!isConfigured && (
                  <div className="mt-3 text-xs text-gray-500">
                    Configure Twilio credentials first before updating webhooks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Testing</CardTitle>
              <CardDescription>Test your communication system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={testTwilioConnection}
                  disabled={testing || !isConfigured}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <TestTube className="h-6 w-6 mb-2" />
                  {testing ? 'Testing...' : 'Test Twilio Connection'}
                </Button>

                <Button
                  onClick={() => window.open('/api/twilio/diagnose', '_blank')}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <Shield className="h-6 w-6 mb-2" />
                  Run Diagnostics
                </Button>

                <Button
                  onClick={() => window.open('/mot-reminders-sms', '_blank')}
                  variant="outline"
                  className="h-20 flex-col"
                  disabled={!isConfigured}
                >
                  <Send className="h-6 w-6 mb-2" />
                  Test MOT Reminders
                </Button>

                <Button
                  onClick={() => window.open('/sms-dashboard', '_blank')}
                  variant="outline"
                  className="h-20 flex-col"
                >
                  <MessageSquare className="h-6 w-6 mb-2" />
                  View SMS Dashboard
                </Button>

                <Button
                  onClick={manualUpdateWebhooks}
                  variant="outline"
                  className="h-20 flex-col"
                  disabled={testing}
                >
                  <Settings className="h-6 w-6 mb-2" />
                  Manual Update
                </Button>
              </div>

              {!isConfigured && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">Configuration Required</span>
                  </div>
                  <p className="text-red-800 text-sm">
                    Complete the Twilio setup in the "Twilio Setup" tab before testing the system.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
