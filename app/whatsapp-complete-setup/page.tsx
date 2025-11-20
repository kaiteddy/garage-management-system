"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Upload,
  Eye,
  Save,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Users,
  ExternalLink,
  RefreshCw,
  Send,
  Shield,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import MessageTemplates from "@/components/whatsapp/message-templates"

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

interface BusinessProfile {
  businessName: string
  displayName: string
  about: string
  description: string
  phone: string
  email: string
  website: string
  address: string
  category: string
}

interface DashboardData {
  statistics: any
  recentConversations: any[]
  messageVolume: any[]
  consentStats: any
  pendingVerifications: any[]
  costComparison: any[]
  savings: any
}

export default function WhatsAppCompleteSetupPage() {
  const [activeTab, setActiveTab] = useState("setup")
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  
  // Business Profile State
  const [profileData, setProfileData] = useState<BusinessProfile>({
    businessName: 'ELI MOTORS LTD',
    displayName: 'ELI MOTORS LTD',
    about: 'Professional MOT testing and vehicle servicing. Serving Hendon since 1979. Call 0208 203 6449 to book.',
    description: 'ELI MOTORS LTD - Your trusted MOT and service centre in Hendon. Established 1979. Professional vehicle testing, servicing, and maintenance.',
    phone: '0208 203 6449',
    email: '',
    website: 'https://www.elimotors.co.uk',
    address: '',
    category: 'Automotive Services'
  })

  const [businessHours, setBusinessHours] = useState({
    monday: '8:00 AM - 6:00 PM',
    tuesday: '8:00 AM - 6:00 PM',
    wednesday: '8:00 AM - 6:00 PM',
    thursday: '8:00 AM - 6:00 PM',
    friday: '8:00 AM - 6:00 PM',
    saturday: '8:00 AM - 4:00 PM',
    sunday: 'Closed'
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  // Setup Steps
  const setupSteps: SetupStep[] = [
    {
      id: 'twilio-account',
      title: 'Twilio Account Setup',
      description: 'Create a Twilio account and get your Account SID and Auth Token',
      status: config?.accountSid ? 'completed' : 'pending',
      action: 'Get Twilio Credentials',
      link: 'https://console.twilio.com/'
    },
    {
      id: 'twilio-whatsapp-business',
      title: 'Twilio WhatsApp Business API',
      description: 'Apply for WhatsApp Business API through Twilio (faster approval)',
      status: 'pending',
      action: 'Contact Twilio Sales',
      link: 'https://www.twilio.com/whatsapp'
    },
    {
      id: 'phone-number',
      title: 'WhatsApp Business Number',
      description: 'Get a dedicated WhatsApp Business number',
      status: config?.whatsappNumber ? 'completed' : 'pending',
      action: 'Get Number',
      link: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming'
    },
    {
      id: 'webhook-setup',
      title: 'Webhook Configuration',
      description: 'Configure webhooks for message handling',
      status: 'pending',
      action: 'Configure Webhooks'
    },
    {
      id: 'business-verification',
      title: 'Business Verification',
      description: 'Complete business verification with required documents',
      status: 'pending',
      action: 'Upload Documents'
    },
    {
      id: 'message-templates',
      title: 'Message Templates',
      description: 'Create and submit message templates for approval',
      status: 'pending',
      action: 'Create Templates'
    },
    {
      id: 'production-domain',
      title: 'Production Domain',
      description: 'Set up HTTPS domain for production webhooks',
      status: 'pending',
      action: 'Configure Domain'
    },
    {
      id: 'business-profile',
      title: 'Business Profile',
      description: 'Set up your WhatsApp Business profile',
      status: 'pending',
      action: 'Complete Profile'
    }
  ]

  useEffect(() => {
    fetchConfig()
    fetchDashboardData()
  }, [])

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

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/whatsapp/dashboard')
      const data = await response.json()
      
      if (data.success) {
        setDashboardData(data.dashboard)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const testWhatsAppConnection = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setTestResult(data)
      
      if (data.success) {
        toast.success('WhatsApp connection test successful!')
      } else {
        toast.error('WhatsApp connection test failed')
      }
    } catch (error) {
      console.error('Error testing WhatsApp:', error)
      toast.error('Error testing WhatsApp connection')
    } finally {
      setTestLoading(false)
    }
  }

  const initializeWhatsApp = async () => {
    try {
      const response = await fetch('/api/whatsapp/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('WhatsApp initialized successfully!')
        fetchConfig()
      } else {
        toast.error('Failed to initialize WhatsApp')
      }
    } catch (error) {
      console.error('Error initializing WhatsApp:', error)
      toast.error('Error initializing WhatsApp')
    }
  }

  const saveBusinessProfile = async () => {
    try {
      const response = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: profileData,
          businessHours,
          logo: logoPreview
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Business profile saved successfully!')
      } else {
        toast.error('Failed to save business profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error saving business profile')
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business Setup</h1>
          <p className="text-muted-foreground">
            Complete WhatsApp Business integration for ELI MOTORS LTD
          </p>
        </div>
        <Badge variant={config?.fullyConfigured ? "default" : "secondary"}>
          {config?.fullyConfigured ? "Configured" : "Setup Required"}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="test">Testing</TabsTrigger>
        </TabsList>

        {/* Setup Guide Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Business Setup Steps
              </CardTitle>
              <CardDescription>
                Follow these steps to complete your WhatsApp Business integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupSteps.map((step, index) => (
                <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : step.status === 'in-progress' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      step.status === 'completed' ? 'default' : 
                      step.status === 'in-progress' ? 'secondary' : 'outline'
                    }>
                      {step.status}
                    </Badge>
                    {step.link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={step.link} target="_blank" rel="noopener noreferrer">
                          {step.action}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
              <CardDescription>Your current WhatsApp and Twilio settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account SID</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={config.accountSid ? `${config.accountSid.substring(0, 8)}...` : 'Not configured'} 
                        readOnly 
                      />
                      <Badge variant={config.accountSid ? "default" : "destructive"}>
                        {config.accountSid ? "Set" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Token</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={config.authToken ? "••••••••••••••••" : 'Not configured'} 
                        readOnly 
                      />
                      <Badge variant={config.authToken ? "default" : "destructive"}>
                        {config.authToken ? "Set" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>SMS Number</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={config.phoneNumber || 'Not configured'} 
                        readOnly 
                      />
                      <Badge variant={config.phoneNumber ? "default" : "destructive"}>
                        {config.phoneNumber ? "Set" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={config.whatsappNumber || 'Not configured'} 
                        readOnly 
                      />
                      <Badge variant={config.whatsappNumber ? "default" : "destructive"}>
                        {config.whatsappNumber ? "Set" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No configuration found. Please set up your Twilio credentials first.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={initializeWhatsApp}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Initialize WhatsApp
                </Button>
                <Button variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Webhook URL
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Templates Tab */}
        <TabsContent value="templates">
          <MessageTemplates />
        </TabsContent>

        {/* Business Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Profile
              </CardTitle>
              <CardDescription>
                Configure your WhatsApp Business profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={profileData.businessName}
                    onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={profileData.category} onValueChange={(value) => setProfileData({ ...profileData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Automotive Services">Automotive Services</SelectItem>
                      <SelectItem value="Auto Repair">Auto Repair</SelectItem>
                      <SelectItem value="MOT Testing">MOT Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <Textarea
                  id="about"
                  value={profileData.about}
                  onChange={(e) => setProfileData({ ...profileData, about: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={profileData.description}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <Label>Business Hours</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-2">
                      <Label className="w-20 capitalize">{day}</Label>
                      <Input
                        value={hours}
                        onChange={(e) => setBusinessHours({ ...businessHours, [day]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Business Logo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="max-w-xs"
                  />
                  {logoPreview && (
                    <div className="w-16 h-16 border rounded-lg overflow-hidden">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={saveBusinessProfile} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Business Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.statistics?.totalMessages || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{dashboardData?.statistics?.messageGrowth || 0}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.statistics?.activeConversations || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.statistics?.conversationGrowth || 0}% increase
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.statistics?.responseRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  +{dashboardData?.statistics?.responseImprovement || 0}% this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{dashboardData?.savings?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  vs SMS costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>Latest WhatsApp conversations with customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData?.recentConversations?.map((conversation) => (
                    <TableRow key={conversation.id}>
                      <TableCell>{conversation.customerName || 'Unknown'}</TableCell>
                      <TableCell>{conversation.phoneNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{conversation.lastMessage}</TableCell>
                      <TableCell>
                        <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                          {conversation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No conversations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                WhatsApp Connection Test
              </CardTitle>
              <CardDescription>
                Test your WhatsApp integration to ensure everything is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testWhatsAppConnection} 
                disabled={testLoading}
                className="w-full"
              >
                {testLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test WhatsApp Connection
              </Button>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResult.message || (testResult.success ? 'Test successful!' : 'Test failed!')}
                  </AlertDescription>
                </Alert>
              )}

              {testResult?.details && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Information</CardTitle>
              <CardDescription>Configure these URLs in your Twilio console</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>WhatsApp Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook`}
                    readOnly
                  />
                  <Button variant="outline" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>SMS Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/sms/webhook`}
                    readOnly
                  />
                  <Button variant="outline" onClick={() => {
                    const url = `${window.location.origin}/api/sms/webhook`
                    navigator.clipboard.writeText(url)
                    toast.success('SMS Webhook URL copied!')
                  }}>
                    <Copy className="h-4 w-4" />
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
