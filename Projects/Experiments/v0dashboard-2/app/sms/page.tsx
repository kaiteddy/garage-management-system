"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageSquare,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Send,
  Settings,
  Users,
  Car,
  Loader2,
  RefreshCw,
  Edit,
  Eye,
  FileText,
  MessageCircle,
  Calendar
} from "lucide-react"

interface SMSDashboardData {
  potentialReach: {
    totalCustomers: number
    customersWithPhone: number
    smsEligible: number
    customersWithEmail: number
    phoneOnlyCustomers: number
  }
  motReminders: {
    totalVehicles: number
    expiredMOTs: number
    criticalMOTs: number
    dueSoonMOTs: number
    upcomingMOTs: number
  }
  estimatedCosts: {
    expiredReminders: number
    criticalReminders: number
    dueSoonReminders: number
    totalMonthlyCost: number
  }
  twilioConfiguration: {
    accountSid: string
    authToken: string
    phoneNumber: string
    fullyConfigured: boolean
  }
  availableCampaigns: Array<{
    name: string
    description: string
    targetCount: number
    estimatedCost: number
    endpoint: string
    priority: string
  }>
  systemStatus: {
    smsSystemReady: boolean
    databaseReady: boolean
    webhookReady: boolean
    customerDataReady: boolean
    motDataReady: boolean
  }
}

export default function SMSPage() {
  const [dashboardData, setDashboardData] = useState<SMSDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [campaignData, setCampaignData] = useState<any>(null)
  const [templatesData, setTemplatesData] = useState<any>(null)
  const [responsesData, setResponsesData] = useState<any>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sms/dashboard')
      const data = await response.json()

      if (data.success) {
        setDashboardData(data.smsDashboard)
      } else {
        setError(data.error || 'Failed to load SMS dashboard')
      }
    } catch (err) {
      setError('Failed to fetch SMS dashboard data')
      console.error('SMS Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignData = async (urgency: string) => {
    try {
      // First try the real campaign API
      const response = await fetch(`/api/sms/campaigns/${urgency}?limit=50`)
      const data = await response.json()

      if (data.success && data.targets && data.targets.length > 0) {
        setCampaignData(data)
      } else {
        // If no data, get real customer check to show what's available
        const checkResponse = await fetch('/api/sms/real-customers-check')
        const checkData = await checkResponse.json()

        if (checkData.success) {
          const realCustomers = checkData.realCustomerCheck.sampleRealCustomers
          const urgencyMap = {
            'expired': { label: 'Expired MOTs', icon: '🚨', cost: 0.015 },
            'critical': { label: 'Critical MOTs (7 days)', icon: '⚠️', cost: 0.0075 },
            'due-soon': { label: 'Due Soon MOTs (30 days)', icon: '📅', cost: 0.0075 }
          }

          const urgencyInfo = urgencyMap[urgency] || urgencyMap['expired']

          // Show real customers even if they don't match exact urgency criteria
          setCampaignData({
            success: true,
            campaign: {
              urgency: urgency,
              urgencyLabel: urgencyInfo.label,
              urgencyIcon: urgencyInfo.icon,
              totalTargets: realCustomers.length,
              estimatedCost: realCustomers.length * urgencyInfo.cost,
              averageMessageCost: urgencyInfo.cost,
              sampleMessage: realCustomers.length > 0 ?
                `Hi ${realCustomers[0].customerName}, your ${realCustomers[0].vehicle} (${realCustomers[0].registration}) MOT requires attention. Contact us to book your MOT test.` :
                'No real customers found with MOT data and phone numbers.'
            },
            targets: realCustomers.slice(0, 10)
          })
        } else {
          // Fallback message
          setCampaignData({
            success: true,
            campaign: {
              urgency: urgency,
              urgencyLabel: urgency === 'expired' ? 'Expired MOTs' :
                           urgency === 'critical' ? 'Critical MOTs (7 days)' :
                           'Due Soon MOTs (30 days)',
              urgencyIcon: urgency === 'expired' ? '🚨' :
                          urgency === 'critical' ? '⚠️' : '📅',
              totalTargets: 0,
              estimatedCost: 0,
              averageMessageCost: urgency === 'expired' ? 0.015 : 0.0075,
              sampleMessage: 'No customers found for this urgency level with current MOT data.'
            },
            targets: []
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaign data:', err)
    }
  }

  const fetchTemplatesData = async () => {
    try {
      const response = await fetch('/api/sms/templates')
      const data = await response.json()
      if (data.success) {
        setTemplatesData(data)
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const fetchResponsesData = async () => {
    try {
      const response = await fetch('/api/sms/responses?limit=20')
      const data = await response.json()
      if (data.success) {
        setResponsesData(data)
      }
    } catch (err) {
      console.error('Failed to fetch responses:', err)
    }
  }

  const sendTestReminders = async () => {
    try {
      setSendingTest(true)
      const response = await fetch('/api/sms/send-mot-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, limit: 5 })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Test completed! ${data.summary.totalMessages} messages prepared. Estimated cost: £${data.summary.estimatedCost}`)
      } else {
        alert(`Test failed: ${data.error}`)
      }
    } catch (err) {
      alert('Failed to send test reminders')
      console.error('Test SMS error:', err)
    } finally {
      setSendingTest(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'templates' && !templatesData) {
      fetchTemplatesData()
    } else if (tab === 'responses' && !responsesData) {
      fetchResponsesData()
    } else if (tab.startsWith('campaign-') && !campaignData) {
      const urgency = tab.replace('campaign-', '')
      fetchCampaignData(urgency)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading SMS Dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error || 'Failed to load SMS dashboard'}</p>
              <Button onClick={fetchDashboardData} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { potentialReach, motReminders, estimatedCosts, twilioConfiguration, availableCampaigns, systemStatus } = dashboardData

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS System Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage MOT reminders, templates, and customer communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={sendTestReminders} disabled={sendingTest}>
            {sendingTest ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Test SMS
          </Button>
        </div>
      </div>

      {/* Main Tabs Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaign-expired" className="text-red-600">
            🚨 Expired ({dashboardData?.motReminders.expiredMOTs || 0})
          </TabsTrigger>
          <TabsTrigger value="campaign-critical" className="text-orange-600">
            ⚠️ Critical ({dashboardData?.motReminders.criticalMOTs || 0})
          </TabsTrigger>
          <TabsTrigger value="campaign-due-soon" className="text-yellow-600">
            📅 Due Soon ({dashboardData?.motReminders.dueSoonMOTs || 0})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="responses">
            <MessageCircle className="h-4 w-4 mr-1" />
            Responses
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Status */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              {systemStatus.smsSystemReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">SMS Ready</span>
            </div>
            <div className="flex items-center gap-2">
              {systemStatus.databaseReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center gap-2">
              {systemStatus.webhookReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="text-sm">Webhook</span>
            </div>
            <div className="flex items-center gap-2">
              {systemStatus.customerDataReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">Customers</span>
            </div>
            <div className="flex items-center gap-2">
              {systemStatus.motDataReady ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm">MOT Data</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Twilio Account:</span>
              <p className="text-muted-foreground">{twilioConfiguration.accountSid}</p>
            </div>
            <div>
              <span className="font-medium">Phone Number:</span>
              <p className="text-muted-foreground">{twilioConfiguration.phoneNumber}</p>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <Badge variant={twilioConfiguration.fullyConfigured ? "default" : "destructive"}>
                {twilioConfiguration.fullyConfigured ? "Configured" : "Setup Required"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{potentialReach.smsEligible.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">SMS Eligible Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{motReminders.totalVehicles.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Vehicles with MOT Data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{(motReminders.expiredMOTs + motReminders.criticalMOTs).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Critical MOT Reminders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">£{estimatedCosts.totalMonthlyCost}</p>
                <p className="text-sm text-muted-foreground">Est. Monthly SMS Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MOT Reminders Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            MOT Reminders Breakdown
          </CardTitle>
          <CardDescription>
            Vehicles requiring MOT reminders by urgency level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{motReminders.expiredMOTs}</div>
              <div className="text-sm text-muted-foreground">Expired MOTs</div>
              <Badge variant="destructive" className="mt-1">URGENT</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{motReminders.criticalMOTs}</div>
              <div className="text-sm text-muted-foreground">Critical (7 days)</div>
              <Badge variant="secondary" className="mt-1">HIGH</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{motReminders.dueSoonMOTs}</div>
              <div className="text-sm text-muted-foreground">Due Soon (30 days)</div>
              <Badge variant="outline" className="mt-1">MEDIUM</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{motReminders.upcomingMOTs}</div>
              <div className="text-sm text-muted-foreground">Upcoming (60 days)</div>
              <Badge variant="outline" className="mt-1">LOW</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Available SMS Campaigns
          </CardTitle>
          <CardDescription>
            Ready-to-send SMS campaigns for different customer segments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge variant={
                      campaign.priority === 'HIGH' ? 'destructive' :
                      campaign.priority === 'MEDIUM' ? 'secondary' : 'outline'
                    }>
                      {campaign.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span>Target: {campaign.targetCount.toLocaleString()} customers</span>
                    <span>Cost: £{campaign.estimatedCost}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Prepare
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Reach Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Customer Reach Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{potentialReach.totalCustomers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Customers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{potentialReach.customersWithPhone.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Have Phone</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{potentialReach.smsEligible.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">SMS Eligible</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{potentialReach.customersWithEmail.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Have Email</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{potentialReach.phoneOnlyCustomers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Phone Only</div>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Campaign Tabs */}
        <TabsContent value="campaign-expired" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Expired MOT Campaign - {dashboardData?.motReminders.expiredMOTs || 0} Vehicles
              </CardTitle>
              <CardDescription>
                Urgent reminders for vehicles with expired MOTs (illegal to drive)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignData && campaignData.campaign?.urgency === 'expired' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{campaignData.campaign.urgencyIcon} {campaignData.campaign.urgencyLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaignData.campaign.totalTargets} customers • £{campaignData.campaign.estimatedCost} estimated cost
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setCampaignData(null)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {campaignData.campaign.sampleMessage && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">📱 Sample Message:</h4>
                      <div className="text-sm font-mono bg-white p-3 rounded border">
                        {campaignData.campaign.sampleMessage.substring(0, 300)}...
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium">🎯 Target Customers ({campaignData.targets?.length || 0} shown):</h4>
                    {campaignData.targets?.slice(0, 10).map((target: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{target.customerName}</span>
                            <span className="text-sm text-muted-foreground">({target.phone})</span>
                            <Badge variant={target.eligible ? 'default' : 'secondary'}>
                              {target.eligible ? '✅ Ready' : '❌ Not Ready'}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">£{target.estimatedCost}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{target.registration}</span> {target.vehicle} •
                          MOT expired {target.daysDifference} days ago
                        </div>
                        {target.notes && (
                          <div className="text-xs text-orange-600 mt-1">{target.notes}</div>
                        )}
                      </div>
                    ))}

                    {campaignData.targets?.length > 10 && (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">
                          Showing 10 of {campaignData.targets.length} targets
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send Campaign (Dry Run)
                    </Button>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Targets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Click "View Campaign Details" to see target list and manage this campaign</p>
                  <Button onClick={() => fetchCampaignData('expired')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Campaign Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign-critical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Critical MOT Campaign - {dashboardData?.motReminders.criticalMOTs || 0} Vehicles
              </CardTitle>
              <CardDescription>
                Reminders for vehicles with MOTs expiring within 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignData && campaignData.campaign?.urgency === 'critical' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{campaignData.campaign.urgencyIcon} {campaignData.campaign.urgencyLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaignData.campaign.totalTargets} customers • £{campaignData.campaign.estimatedCost} estimated cost
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setCampaignData(null)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {campaignData.campaign.sampleMessage && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">📱 Sample Message:</h4>
                      <div className="text-sm font-mono bg-white p-3 rounded border">
                        {campaignData.campaign.sampleMessage.substring(0, 300)}...
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium">🎯 Target Customers ({campaignData.targets?.length || 0} shown):</h4>
                    {campaignData.targets?.slice(0, 10).map((target: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{target.customerName}</span>
                            <span className="text-sm text-muted-foreground">({target.phone})</span>
                            <Badge variant={target.eligible ? 'default' : 'secondary'}>
                              {target.eligible ? '✅ Ready' : '❌ Not Ready'}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">£{target.estimatedCost}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{target.registration}</span> {target.vehicle} •
                          MOT expires in {target.daysDifference} days
                        </div>
                        {target.notes && (
                          <div className="text-xs text-orange-600 mt-1">{target.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send Campaign (Dry Run)
                    </Button>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Targets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Click "View Campaign Details" to see target list and manage this campaign</p>
                  <Button onClick={() => fetchCampaignData('critical')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Campaign Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign-due-soon" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                Due Soon MOT Campaign - {dashboardData?.motReminders.dueSoonMOTs || 0} Vehicles
              </CardTitle>
              <CardDescription>
                Proactive reminders for vehicles with MOTs expiring within 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaignData && campaignData.campaign?.urgency === 'due-soon' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{campaignData.campaign.urgencyIcon} {campaignData.campaign.urgencyLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaignData.campaign.totalTargets} customers • £{campaignData.campaign.estimatedCost} estimated cost
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setCampaignData(null)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {campaignData.campaign.sampleMessage && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium mb-2">📱 Sample Message:</h4>
                      <div className="text-sm font-mono bg-white p-3 rounded border">
                        {campaignData.campaign.sampleMessage.substring(0, 300)}...
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium">🎯 Target Customers ({campaignData.targets?.length || 0} shown):</h4>
                    {campaignData.targets?.slice(0, 10).map((target: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{target.customerName}</span>
                            <span className="text-sm text-muted-foreground">({target.phone})</span>
                            <Badge variant={target.eligible ? 'default' : 'secondary'}>
                              {target.eligible ? '✅ Ready' : '❌ Not Ready'}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">£{target.estimatedCost}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{target.registration}</span> {target.vehicle} •
                          MOT expires in {target.daysDifference} days
                        </div>
                        {target.notes && (
                          <div className="text-xs text-orange-600 mt-1">{target.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send Campaign (Dry Run)
                    </Button>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Targets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Click "View Campaign Details" to see target list and manage this campaign</p>
                  <Button onClick={() => fetchCampaignData('due-soon')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Campaign Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SMS Message Templates
              </CardTitle>
              <CardDescription>
                Manage and edit SMS message templates for different urgency levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesData ? (
                <div className="space-y-4">
                  {templatesData.templates?.map((template: any) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.urgencyLevel === 'expired' ? 'destructive' : 'secondary'}>
                            {template.urgencyLevel}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.characterCount} chars, {template.estimatedSegments} segments, £{template.estimatedCost}
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                        {template.templateText.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Loading SMS templates...</p>
                  <Button onClick={fetchTemplatesData}>
                    <FileText className="h-4 w-4 mr-2" />
                    Load Templates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Customer SMS Responses
              </CardTitle>
              <CardDescription>
                View and manage customer responses to SMS campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responsesData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {responsesData.responseBreakdown?.map((breakdown: any) => (
                      <div key={breakdown.responseType} className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold">{breakdown.count}</div>
                        <div className="text-sm text-muted-foreground">{breakdown.responseType}</div>
                        <div className="text-xs text-green-600">{breakdown.processedCount} processed</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {responsesData.responses?.slice(0, 10).map((response: any) => (
                      <div key={response.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{response.customerName}</span>
                            <span className="text-sm text-muted-foreground">({response.phone})</span>
                            <Badge variant={response.processed ? 'default' : 'secondary'}>
                              {response.responseType}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm bg-gray-50 p-2 rounded">{response.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Loading customer responses...</p>
                  <Button onClick={fetchResponsesData}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Load Responses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
