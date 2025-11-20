'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Phone, Clock, CheckCircle } from 'lucide-react'

interface VerificationCode {
  id: number
  phone_number: string
  from_number: string
  verification_code: string
  message_body: string
  received_at: string
  used: boolean
  time_ago: string
}

interface VerificationData {
  success: boolean
  verification_codes: VerificationCode[]
  summary: {
    total_verification_codes: number
    unused_codes: number
    latest_code: string | null
    latest_code_time: string | null
  }
}

export default function VerificationMonitor() {
  const [data, setData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchCodes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/verification-codes')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching codes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCodes()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchCodes, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📱 WhatsApp Verification Monitor</h1>
          <p className="text-muted-foreground">ELI MOTORS LTD - Real-time verification code tracking</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchCodes}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.total_verification_codes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused Codes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.summary.unused_codes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Code</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data?.summary.latest_code || "None"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhook Status</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-green-600">Active</div>
            <div className="text-xs text-muted-foreground">Monitoring +447488896449</div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              <span>Request verification code from Facebook for <strong>+447488896449</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              <span>Code will appear below automatically (refreshes every 5 seconds)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              <span>Enter the 6-digit code in Facebook WhatsApp verification</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Codes */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Verification Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.verification_codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No verification codes received yet</p>
              <p className="text-sm">Waiting for Facebook to send code to +447488896449...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.verification_codes.map((code) => (
                <div
                  key={code.id}
                  className={`p-4 border rounded-lg ${
                    !code.used ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {code.verification_code}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        From: {code.from_number} • {code.time_ago}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={code.used ? "secondary" : "default"}>
                        {code.used ? "Used" : "Available"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(code.received_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {code.message_body && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Message: {code.message_body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>🏢 ELI MOTORS LTD - WhatsApp Business Verification</p>
        <p>Webhook: https://garage-manager.eu.ngrok.io/api/sms/webhook</p>
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  )
}
