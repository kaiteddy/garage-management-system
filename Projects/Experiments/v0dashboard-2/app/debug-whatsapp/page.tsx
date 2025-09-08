'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, MessageSquare, Database, AlertTriangle } from "lucide-react"

interface WhatsAppDebugData {
  success: boolean
  tables_exist: {
    conversations_exists: boolean
    messages_exists: boolean
  }
  conversations: {
    count: {
      total_conversations: number
      active_conversations: number
      recent_conversations: number
    }
    data: any[]
  }
  messages: {
    count: {
      total_messages: number
      outbound_messages: number
      inbound_messages: number
      recent_messages: number
      total_cost: number
    }
    data: any[]
  }
  orphaned_messages: any[]
  dashboard_conversations: any[]
  timestamp: string
}

export default function WhatsAppDebugPage() {
  const [debugData, setDebugData] = useState<WhatsAppDebugData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDebugData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/debug/whatsapp-data')
      const data = await response.json()

      if (data.success) {
        setDebugData(data)
      } else {
        setError(data.error || 'Failed to load debug data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDebugData()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading WhatsApp debug data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Debug Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={loadDebugData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!debugData) {
    return <div>No data available</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Debug information for WhatsApp integration • Last updated: {new Date(debugData.timestamp).toLocaleString()}
          </p>
        </div>
        <Button onClick={loadDebugData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tables Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={debugData.tables_exist.conversations_exists ? "default" : "destructive"}>
                {debugData.tables_exist.conversations_exists ? "EXISTS" : "MISSING"}
              </Badge>
              <span>whatsapp_conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={debugData.tables_exist.messages_exists ? "default" : "destructive"}>
                {debugData.tables_exist.messages_exists ? "EXISTS" : "MISSING"}
              </Badge>
              <span>whatsapp_messages</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.conversations.count.total_conversations}</div>
              <div className="text-sm text-muted-foreground">Total Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.conversations.count.active_conversations}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.conversations.count.recent_conversations}</div>
              <div className="text-sm text-muted-foreground">Recent (24h)</div>
            </div>
          </div>

          {debugData.conversations.data.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recent Conversations:</h4>
              <div className="space-y-2">
                {debugData.conversations.data.map((conv) => (
                  <div key={conv.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Customer: {conv.customer_id}</div>
                        <div className="text-sm text-muted-foreground">Phone: {conv.phone_number}</div>
                        <div className="text-sm text-muted-foreground">Vehicle: {conv.vehicle_registration || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                          {conv.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {conv.message_count} messages
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.messages.count.total_messages}</div>
              <div className="text-sm text-muted-foreground">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.messages.count.outbound_messages}</div>
              <div className="text-sm text-muted-foreground">Outbound</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.messages.count.inbound_messages}</div>
              <div className="text-sm text-muted-foreground">Inbound</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">£{(typeof debugData.messages.count.total_cost === 'number' ? debugData.messages.count.total_cost : parseFloat(debugData.messages.count.total_cost || '0')).toFixed(4)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
          </div>

          {debugData.messages.data.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recent Messages:</h4>
              <div className="space-y-2">
                {debugData.messages.data.map((msg) => (
                  <div key={msg.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={msg.direction === 'outbound' ? 'default' : 'secondary'}>
                            {msg.direction}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{msg.status}</span>
                        </div>
                        <div className="text-sm font-medium mb-1">{msg.content}</div>
                        <div className="text-xs text-muted-foreground">
                          From: {msg.from_number} → To: {msg.to_number}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>£{(typeof msg.cost === 'number' ? msg.cost : parseFloat(msg.cost || '0')).toFixed(4)}</div>
                        <div className="text-muted-foreground">
                          {new Date(msg.sent_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Query Results</CardTitle>
          <CardDescription>
            This shows what the dashboard API query returns (what should appear in the main WhatsApp Management page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debugData.dashboard_conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Dashboard Conversations</h3>
              <p className="text-muted-foreground">
                The dashboard query returned no conversations. This explains why you see "No conversations yet".
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {debugData.dashboard_conversations.map((conv) => (
                <div key={conv.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {conv.first_name} {conv.last_name} ({conv.customer_id})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Phone: {conv.phone_number} • Email: {conv.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{conv.message_count} messages</div>
                      <div className="text-sm text-muted-foreground">
                        £{(typeof conv.total_cost === 'number' ? conv.total_cost : parseFloat(conv.total_cost || '0')).toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orphaned Messages */}
      {debugData.orphaned_messages.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Orphaned Messages
            </CardTitle>
            <CardDescription>
              Messages that exist without corresponding conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debugData.orphaned_messages.map((msg) => (
                <div key={msg.id} className="p-3 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium">{msg.content}</div>
                  <div className="text-xs text-muted-foreground">
                    Conversation ID: {msg.conversation_id} • Sent: {new Date(msg.sent_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
