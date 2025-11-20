"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  TrendingUp, 
  Users, 
  Phone,
  AlertTriangle,
  Eye,
  Send,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface DashboardData {
  statistics: any
  recentConversations: any[]
  messageVolume: any[]
  consentStats: any
  pendingVerifications: any[]
  costComparison: any[]
  savings: any
}

interface PendingMessage {
  id: string
  customer_id: string
  phone_number: string
  vehicle_registration: string
  message_type: string
  message_content: string
  verification_status: string
  created_at: string
  expires_at: string
  first_name?: string
  last_name?: string
  make?: string
  model?: string
}

export default function WhatsAppManagementPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null)
  const [verificationNotes, setVerificationNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
    loadPendingVerifications()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/whatsapp/dashboard')
      const result = await response.json()
      
      if (result.success) {
        setDashboardData(result.dashboard)
      } else {
        toast.error("Failed to load dashboard data")
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error("Error loading dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadPendingVerifications = async () => {
    try {
      const response = await fetch('/api/whatsapp/queue-message')
      const result = await response.json()
      
      if (result.success) {
        setPendingMessages(result.pendingMessages)
      }
    } catch (error) {
      console.error('Error loading pending verifications:', error)
    }
  }

  const handleApproveMessage = async (messageId: string) => {
    setIsProcessing(messageId)
    try {
      const response = await fetch('/api/whatsapp/approve-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: messageId,
          verifiedBy: 'admin', // In real app, get from auth
          notes: verificationNotes,
          action: 'approve'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success("Message approved and sent successfully!")
        loadPendingVerifications()
        setSelectedMessage(null)
        setVerificationNotes("")
      } else {
        toast.error(`Failed to approve message: ${result.error}`)
      }
    } catch (error) {
      console.error('Error approving message:', error)
      toast.error("Error approving message")
    } finally {
      setIsProcessing(null)
    }
  }

  const handleRejectMessage = async (messageId: string) => {
    setIsProcessing(messageId)
    try {
      const response = await fetch('/api/whatsapp/approve-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: messageId,
          verifiedBy: 'admin',
          notes: verificationNotes || 'Rejected by admin',
          action: 'reject'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success("Message rejected")
        loadPendingVerifications()
        setSelectedMessage(null)
        setVerificationNotes("")
      } else {
        toast.error(`Failed to reject message: ${result.error}`)
      }
    } catch (error) {
      console.error('Error rejecting message:', error)
      toast.error("Error rejecting message")
    } finally {
      setIsProcessing(null)
    }
  }

  const initializeDatabase = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/whatsapp/initialize', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success("WhatsApp database initialized successfully!")
        loadDashboardData()
      } else {
        toast.error("Failed to initialize database")
      }
    } catch (error) {
      console.error('Error initializing database:', error)
      toast.error("Error initializing database")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getUrgencyBadge = (messageType: string, expiresAt: string) => {
    const hoursUntilExpiry = (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilExpiry < 2) {
      return <Badge variant="destructive">Urgent - Expires Soon</Badge>
    } else if (messageType === 'mot_reminder') {
      return <Badge variant="default">MOT Reminder</Badge>
    } else {
      return <Badge variant="secondary">{messageType.replace('_', ' ')}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading WhatsApp Management...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Management</h2>
          <p className="text-muted-foreground">
            Manage WhatsApp conversations, verify messages, and track data protection compliance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={initializeDatabase} variant="outline">
            <Shield className="mr-2 h-4 w-4" />
            Initialize Database
          </Button>
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.statistics.total_conversations || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.statistics.active_conversations || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.statistics.outbound_messages || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.statistics.inbound_messages || 0} received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardData.savings?.savings || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.savings?.savingsPercentage || 0}% vs SMS
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {pendingMessages.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="verifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="verifications">Message Verifications</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="consent">Data Protection</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Message Verification Queue
              </CardTitle>
              <CardDescription>
                Review and approve WhatsApp messages before sending. All messages require verification for data protection compliance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMessages.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No pending verifications</h3>
                  <p className="text-muted-foreground">All messages have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {message.first_name} {message.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {message.customer_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {message.vehicle_registration && (
                              <div>
                                <div className="font-medium">{message.vehicle_registration}</div>
                                <div className="text-sm text-muted-foreground">
                                  {message.make} {message.model}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getUrgencyBadge(message.message_type, message.expires_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {message.phone_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{message.verification_status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(message.expires_at).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedMessage(message)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Review Modal */}
          {selectedMessage && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Review Message</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Customer</label>
                    <p>{selectedMessage.first_name} {selectedMessage.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p>{selectedMessage.phone_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vehicle</label>
                    <p>{selectedMessage.vehicle_registration} ({selectedMessage.make} {selectedMessage.model})</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message Type</label>
                    <p>{selectedMessage.message_type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Message Content</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border">
                    <p className="whitespace-pre-wrap">{selectedMessage.message_content}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Verification Notes</label>
                  <Textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add notes about this verification decision..."
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    onClick={() => handleApproveMessage(selectedMessage.id)}
                    disabled={isProcessing === selectedMessage.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing === selectedMessage.id ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve & Send
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectMessage(selectedMessage.id)}
                    disabled={isProcessing === selectedMessage.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>
                View and manage WhatsApp conversations with customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentConversations?.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No conversations yet</h3>
                  <p className="text-muted-foreground">Conversations will appear here once WhatsApp messages are sent</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.recentConversations?.map((conversation) => (
                      <TableRow key={conversation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {conversation.first_name} {conversation.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {conversation.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{conversation.phone_number}</TableCell>
                        <TableCell>{conversation.message_count}</TableCell>
                        <TableCell>
                          {conversation.last_message_time && 
                            new Date(conversation.last_message_time).toLocaleString()
                          }
                        </TableCell>
                        <TableCell>{formatCurrency(conversation.total_cost || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                            {conversation.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Protection & Consent Management
              </CardTitle>
              <CardDescription>
                GDPR compliance dashboard for customer consent and data retention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.consentStats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">WhatsApp Consent</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardData.consentStats.whatsapp_consented || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      of {dashboardData.consentStats.total_customers || 0} customers
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Phone Verified</h4>
                    <div className="text-2xl font-bold text-blue-600">
                      {dashboardData.consentStats.phone_verified || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      verified phone numbers
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Opted Out</h4>
                    <div className="text-2xl font-bold text-red-600">
                      {dashboardData.consentStats.opted_out || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      customers opted out
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Compare WhatsApp vs SMS costs and track savings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.savings && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <h4 className="font-medium">Total Messages</h4>
                      <div className="text-2xl font-bold">
                        {dashboardData.savings.totalMessages}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Actual Cost</h4>
                      <div className="text-2xl font-bold">
                        {formatCurrency(dashboardData.savings.actualCost)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Savings vs SMS</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(dashboardData.savings.savings)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData.savings.savingsPercentage}% saved
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
