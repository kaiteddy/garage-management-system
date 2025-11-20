"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface ProcessingStatus {
  isProcessing: boolean
  lastUpdate: string | null
  vehiclesNeedingCheck: number
  criticalVehicles: number
  recentUpdates: number
}

export function ProcessingStatus() {
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setError(null)
      const response = await fetch('/api/mot/processing-status')
      const result = await response.json()

      if (result.success) {
        setStatus(result.data)
      } else {
        setError(result.error || 'Failed to fetch status')
      }
    } catch (err) {
      setError('Network error')
      console.error('Error fetching processing status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Checking processing status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-sm text-red-600">Error: {error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>MOT Processing Status</span>
          <Button variant="ghost" size="sm" onClick={fetchStatus}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground mb-1 sm:mb-0">Status:</span>
            {status.isProcessing ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                <span className="hidden sm:inline">Processing</span>
                <span className="sm:hidden">Active</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 w-fit">
                <CheckCircle className="h-3 w-3 mr-1" />
                Idle
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground mb-1 sm:mb-0">Critical:</span>
            <Badge variant={status.criticalVehicles > 0 ? "destructive" : "secondary"} className="w-fit">
              {status.criticalVehicles}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground mb-1 sm:mb-0">Need Check:</span>
            <Badge variant={status.vehiclesNeedingCheck > 0 ? "secondary" : "outline"} className="w-fit">
              {status.vehiclesNeedingCheck.toLocaleString()}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground mb-1 sm:mb-0">Updated:</span>
            <div className="flex items-center text-xs text-muted-foreground w-fit">
              <Clock className="h-3 w-3 mr-1" />
              <span className="truncate">{formatLastUpdate(status.lastUpdate)}</span>
            </div>
          </div>
        </div>

        {status.recentUpdates > 0 && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            {status.recentUpdates} vehicles updated in the last 5 minutes
          </div>
        )}
      </CardContent>
    </Card>
  )
}
