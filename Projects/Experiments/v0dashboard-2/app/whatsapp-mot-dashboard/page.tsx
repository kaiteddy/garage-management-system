'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Clock, Calendar, MessageSquare, Send, Eye, Users } from 'lucide-react'

interface MOTCampaignData {
  customer_id: string
  first_name: string
  last_name: string
  phone_number: string
  registration: string
  make: string
  model: string
  mot_expiry_date: string
  urgency_level: 'EXPIRED' | 'CRITICAL' | 'DUE_SOON'
  days_until_expiry: number
  template_variables: { "1": string; "2": string }
  expected_message: string
  urgency_emoji: string
}

interface CampaignStats {
  total_customers: number
  expired: number
  critical: number
  due_soon: number
  estimated_cost: number
  potential_sms_cost: number
  savings: number
}

export default function WhatsAppMOTDashboard() {
  const [campaignData, setCampaignData] = useState<{
    campaign_stats: CampaignStats
    campaign_preview: MOTCampaignData[]
    template_info: any
  } | null>(null)
  const [activeTab, setActiveTab] = useState('critical')
  const [loading, setLoading] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [lastCampaignResult, setLastCampaignResult] = useState<any>(null)

  const loadCampaignData = async (urgency: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/whatsapp/mot-campaign?urgency=${urgency}&limit=50`)
      const data = await response.json()
      if (data.success) {
        setCampaignData(data)
      }
    } catch (error) {
      console.error('Error loading campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendCampaign = async (urgency: string, testMode = false) => {
    setSendingCampaign(true)
    try {
      const response = await fetch('/api/whatsapp/mot-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urgencyFilter: urgency,
          limit: urgency === 'expired' ? 5 : urgency === 'critical' ? 10 : 20,
          testMode
        })
      })
      const result = await response.json()
      setLastCampaignResult(result)
      
      // Reload data after sending
      await loadCampaignData(urgency)
    } catch (error) {
      console.error('Error sending campaign:', error)
    } finally {
      setSendingCampaign(false)
    }
  }

  useEffect(() => {
    loadCampaignData(activeTab)
  }, [activeTab])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'EXPIRED': return 'destructive'
      case 'CRITICAL': return 'destructive'
      case 'DUE_SOON': return 'secondary'
      default: return 'outline'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'EXPIRED': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <Clock className="h-4 w-4" />
      case 'DUE_SOON': return <Calendar className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp MOT Reminders</h1>
          <p className="text-muted-foreground">ELI MOTORS LTD - Professional MOT reminder campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium">WhatsApp Business</span>
        </div>
      </div>

      {/* Campaign Statistics */}
      {campaignData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{campaignData.campaign_stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired MOTs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{campaignData.campaign_stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Critical (7 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{campaignData.campaign_stats.due_soon}</p>
                  <p className="text-sm text-muted-foreground">Due Soon (30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{campaignData.campaign_stats.total_customers}</p>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template Information */}
      {campaignData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Template Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Template: {campaignData.template_info.template_name}</p>
                <p className="text-sm text-muted-foreground">ID: {campaignData.template_info.template_sid}</p>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  ✅ {campaignData.template_info.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Cost: {campaignData.template_info.cost_per_message} per message</p>
                <p className="text-sm text-muted-foreground">
                  Savings: £{campaignData.campaign_stats.savings.toFixed(3)} vs SMS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Expired MOTs
          </TabsTrigger>
          <TabsTrigger value="critical" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Critical (7 days)
          </TabsTrigger>
          <TabsTrigger value="due_soon" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Due Soon (30 days)
          </TabsTrigger>
        </TabsList>

        {['expired', 'critical', 'due_soon'].map((urgency) => (
          <TabsContent key={urgency} value={urgency} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {urgency === 'expired' ? 'Expired MOT Reminders' :
                 urgency === 'critical' ? 'Critical MOT Reminders (Next 7 Days)' :
                 'MOT Due Soon (Next 30 Days)'}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => sendCampaign(urgency, true)}
                  disabled={sendingCampaign || loading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Test Mode
                </Button>
                <Button
                  onClick={() => sendCampaign(urgency, false)}
                  disabled={sendingCampaign || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Campaign
                </Button>
              </div>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p>Loading campaign data...</p>
                </CardContent>
              </Card>
            ) : campaignData && campaignData.campaign_preview.length > 0 ? (
              <div className="grid gap-4">
                {campaignData.campaign_preview.map((customer) => (
                  <Card key={customer.customer_id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getUrgencyColor(customer.urgency_level)}>
                              {getUrgencyIcon(customer.urgency_level)}
                              {customer.urgency_level}
                            </Badge>
                            <span className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </span>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <p><strong>Vehicle:</strong> {customer.make} {customer.model}</p>
                            <p><strong>Registration:</strong> {customer.registration}</p>
                            <p><strong>Phone:</strong> {customer.phone_number}</p>
                            <p><strong>MOT Expiry:</strong> {new Date(customer.mot_expiry_date).toLocaleDateString('en-GB')}</p>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">WhatsApp Message Preview:</p>
                            <p className="text-sm italic">
                              "Your appointment is coming up on {customer.template_variables["1"]} at {customer.template_variables["2"]}..."
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{customer.urgency_emoji}</p>
                          <p>£{customer.estimated_cost.toFixed(3)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No {urgency.replace('_', ' ')} MOT reminders found.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Campaign Results */}
      {lastCampaignResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Campaign Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {lastCampaignResult.message}</p>
              <p><strong>Sent:</strong> {lastCampaignResult.campaign_summary.sent}</p>
              <p><strong>Failed:</strong> {lastCampaignResult.campaign_summary.failed}</p>
              <p><strong>Total Cost:</strong> £{lastCampaignResult.campaign_summary.total_cost.toFixed(3)}</p>
              <p><strong>Test Mode:</strong> {lastCampaignResult.campaign_summary.test_mode ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
