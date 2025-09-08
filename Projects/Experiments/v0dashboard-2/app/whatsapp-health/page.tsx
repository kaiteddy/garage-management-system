'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  Database, 
  Settings, 
  Activity,
  Webhook,
  Phone
} from "lucide-react"

interface HealthCheck {
  timestamp: string
  overall_status: 'HEALTHY' | 'UNHEALTHY' | 'WARNING'
  checks: {
    [key: string]: {
      status: 'PASS' | 'FAIL' | 'WARN'
      details: any
    }
  }
  recommendations: string[]
}

export default function WhatsAppHealthPage() {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHealthCheck = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/whatsapp/health-check')
      const data = await response.json()
      
      if (data.success) {
        setHealthData(data.health_check)
      } else {
        setError(data.error || 'Failed to load health check')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHealthCheck()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'HEALTHY':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'FAIL':
      case 'UNHEALTHY':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'WARN':
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'HEALTHY':
        return <Badge variant="default" className="bg-green-100 text-green-800">PASS</Badge>
      case 'FAIL':
      case 'UNHEALTHY':
        return <Badge variant="destructive">FAIL</Badge>
      case 'WARN':
      case 'WARNING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">WARN</Badge>
      default:
        return <Badge variant="outline">UNKNOWN</Badge>
    }
  }

  const getCheckIcon = (checkName: string) => {
    switch (checkName) {
      case 'environment_variables':
        return <Settings className="h-5 w-5" />
      case 'twilio_connection':
        return <Phone className="h-5 w-5" />
      case 'whatsapp_sandbox':
        return <MessageSquare className="h-5 w-5" />
      case 'database_tables':
        return <Database className="h-5 w-5" />
      case 'webhook_config':
        return <Webhook className="h-5 w-5" />
      case 'recent_activity':
        return <Activity className="h-5 w-5" />
      default:
        return <CheckCircle className="h-5 w-5" />
    }
  }

  const getCheckTitle = (checkName: string) => {
    switch (checkName) {
      case 'environment_variables':
        return 'Environment Variables'
      case 'twilio_connection':
        return 'Twilio Connection'
      case 'whatsapp_sandbox':
        return 'WhatsApp Sandbox'
      case 'database_tables':
        return 'Database Tables'
      case 'webhook_config':
        return 'Webhook Configuration'
      case 'recent_activity':
        return 'Recent Activity'
      default:
        return checkName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Running WhatsApp health check...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Health Check Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadHealthCheck} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Health Check
        </Button>
      </div>
    )
  }

  if (!healthData) {
    return <div>No health data available</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {getStatusIcon(healthData.overall_status)}
            WhatsApp Health Check
          </h1>
          <p className="text-muted-foreground">
            Comprehensive diagnostic for WhatsApp integration • Last checked: {new Date(healthData.timestamp).toLocaleString()}
          </p>
        </div>
        <Button onClick={loadHealthCheck} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${
        healthData.overall_status === 'HEALTHY' ? 'border-green-200' :
        healthData.overall_status === 'UNHEALTHY' ? 'border-red-200' : 'border-yellow-200'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(healthData.overall_status)}
            Overall Status: {healthData.overall_status}
          </CardTitle>
          <CardDescription>
            {healthData.overall_status === 'HEALTHY' && "All systems operational"}
            {healthData.overall_status === 'UNHEALTHY' && "Critical issues detected"}
            {healthData.overall_status === 'WARNING' && "Some issues require attention"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(healthData.checks).map(([checkName, check]) => (
          <Card key={checkName}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCheckIcon(checkName)}
                  {getCheckTitle(checkName)}
                </div>
                {getStatusBadge(check.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(check.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </span>
                    <span className="font-medium">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                       typeof value === 'object' ? JSON.stringify(value) : 
                       String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {healthData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Actions to improve your WhatsApp integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test</CardTitle>
          <CardDescription>
            Send a test message to verify everything is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To test WhatsApp functionality:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to the WhatsApp Management page</li>
              <li>Click "Send Test Message" tab</li>
              <li>Enter your phone number (must be joined to sandbox)</li>
              <li>Send a test message</li>
              <li>Check if it appears in conversations</li>
            </ol>
            <Button asChild>
              <a href="/whatsapp-management">
                <MessageSquare className="h-4 w-4 mr-2" />
                Go to WhatsApp Management
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
