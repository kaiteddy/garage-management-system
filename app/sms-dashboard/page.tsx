"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MessageSquare, Send, Users, DollarSign, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"

interface SMSResponse {
  id: string
  from_number: string
  message_content: string
  received_at: string
  processed: boolean
  action_taken?: string
  customer_id?: string
  first_name?: string
  last_name?: string
  email?: string
}

export default function SMSDashboard() {
  const [responses, setResponses] = useState<SMSResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchResponses = async () => {
    try {
      const response = await fetch('/api/sms/customer-responses')
      const data = await response.json()
      
      if (data.success) {
        setResponses(data.responses)
      }
    } catch (error) {
      console.error('Error fetching SMS responses:', error)
    } finally {
      setLoading(false)
    }
  }

  const processResponse = async (responseId: string, action: string) => {
    setProcessing(responseId)
    try {
      const response = await fetch('/api/sms/customer-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          responseId,
          action
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Refresh the responses
        await fetchResponses()
        alert(`Action completed: ${result.actionTaken}`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing response:', error)
      alert('Failed to process response')
    } finally {
      setProcessing(null)
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [])

  const stats = {
    total: responses.length,
    processed: responses.filter(r => r.processed).length,
    unprocessed: responses.filter(r => !r.processed).length
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Dashboard</h1>
          <p className="text-gray-600">Monitor and manage customer SMS responses</p>
        </div>
        <Button onClick={fetchResponses} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Customer SMS responses received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
            <p className="text-xs text-muted-foreground">
              Responses handled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unprocessed}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Responses</CardTitle>
          <CardDescription>
            Recent SMS responses from customers with action buttons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No SMS responses found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {response.first_name && response.last_name 
                              ? `${response.first_name} ${response.last_name}`
                              : 'Unknown Customer'
                            }
                          </div>
                          {response.email && (
                            <div className="text-sm text-muted-foreground">
                              {response.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {response.from_number}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={response.message_content}>
                          {response.message_content}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(response.received_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {response.processed ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Processed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Pending
                          </Badge>
                        )}
                        {response.action_taken && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {response.action_taken}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!response.processed && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processResponse(response.id, 'mark_sold')}
                              disabled={processing === response.id}
                              title="Mark vehicle as sold"
                            >
                              Sold
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processResponse(response.id, 'update_email')}
                              disabled={processing === response.id}
                              title="Update customer email"
                            >
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processResponse(response.id, 'opt_out')}
                              disabled={processing === response.id}
                              title="Opt out customer"
                            >
                              Opt Out
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processResponse(response.id, 'mark_processed')}
                              disabled={processing === response.id}
                              title="Mark as processed"
                            >
                              Done
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
