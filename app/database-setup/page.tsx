"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Database, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface DebugInfo {
  success: boolean
  environment_variables: Record<string, string>
  selected_database_url: string
  url_preview: string
  connection_status: string
  error?: string
}

interface DatabaseStats {
  success: boolean
  stats?: {
    customers: number
    vehicles: number
    jobs: number
    reminders: number
    appointments: number
    documents: number
    stock_items: number
  }
  error?: string
}

export default function DatabaseSetupPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Load debug info on component mount
  useEffect(() => {
    loadDebugInfo()
    loadStats()
  }, [])

  const loadDebugInfo = async () => {
    try {
      const response = await fetch("/api/database/debug")
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Failed to load debug info:", error)
      setDebugInfo({
        success: false,
        error: "Failed to load debug information",
        environment_variables: {},
        selected_database_url: "ERROR",
        url_preview: "Failed to load",
        connection_status: "Error",
      })
    }
  }

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch("/api/database/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
      setStats({
        success: false,
        error: "Failed to get database stats: " + (error instanceof Error ? error.message : "Unknown error"),
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/database/debug")
      const data = await response.json()

      if (data.success && data.connection_status === "Connected") {
        setMessage("✅ Connection test successful!")
        setDebugInfo(data)
      } else {
        setMessage("❌ Connection test failed: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      setMessage("❌ Connection test failed: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const initializeDatabase = async () => {
    setInitLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/database/init", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setMessage("✅ Database initialized successfully!")
        // Reload stats after initialization
        await loadStats()
      } else {
        setMessage("❌ Database initialization failed: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      setMessage("❌ Database initialization failed: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setInitLoading(false)
    }
  }

  const refreshStats = async () => {
    await loadStats()
    setMessage("📊 Database statistics refreshed")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Database Setup</h1>
          <p className="text-muted-foreground">Configure and initialize your Neon PostgreSQL database connection</p>
        </div>
      </div>

      {message && (
        <Alert className={message.includes("✅") ? "border-green-500" : message.includes("❌") ? "border-red-500" : ""}>
          {message.includes("✅") ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : message.includes("❌") ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {stats && !stats.success && (
        <Alert className="border-red-500">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription>{stats.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>Current database connection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status</span>
              {debugInfo?.connection_status === "Connected" ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Database URL</span>
              <Badge variant="outline">{debugInfo?.selected_database_url || "Loading..."}</Badge>
            </div>

            {debugInfo?.url_preview && debugInfo.url_preview !== "Failed to load" && (
              <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {debugInfo.url_preview}
              </div>
            )}

            <Button onClick={testConnection} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Available database connection strings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debugInfo?.environment_variables ? (
                Object.entries(debugInfo.environment_variables).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{key}</span>
                    <Badge variant={value === "SET" ? "default" : value === "MISSING" ? "secondary" : "outline"}>
                      {value}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">Loading...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Database Actions</CardTitle>
          <CardDescription>Initialize your database schema and tables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={initializeDatabase}
              disabled={initLoading || debugInfo?.connection_status !== "Connected"}
              size="lg"
            >
              {initLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Initialize Database
                </>
              )}
            </Button>

            <Button onClick={refreshStats} disabled={statsLoading} variant="outline" size="lg">
              {statsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Stats
                </>
              )}
            </Button>
          </div>

          {stats?.success && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Database Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">{stats.stats?.customers || 0}</div>
                    <div className="text-sm text-muted-foreground">Customers</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">{stats.stats?.vehicles || 0}</div>
                    <div className="text-sm text-muted-foreground">Vehicles</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">{stats.stats?.jobs || 0}</div>
                    <div className="text-sm text-muted-foreground">Jobs</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg border">
                    <div className="text-2xl font-bold text-orange-600">{stats.stats?.reminders || 0}</div>
                    <div className="text-sm text-muted-foreground">Reminders</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border">
                    <div className="text-2xl font-bold text-red-600">{stats.stats?.appointments || 0}</div>
                    <div className="text-sm text-muted-foreground">Appointments</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border">
                    <div className="text-2xl font-bold text-yellow-600">{stats.stats?.documents || 0}</div>
                    <div className="text-sm text-muted-foreground">Documents</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-gray-600">{stats.stats?.stock_items || 0}</div>
                    <div className="text-sm text-muted-foreground">Stock Items</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database Schema Information */}
      <Card>
        <CardHeader>
          <CardTitle>Database Schema</CardTitle>
          <CardDescription>Tables that will be created in your PostgreSQL database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Core Business Tables</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <code>customers</code> - Customer contact information
                </li>
                <li>
                  • <code>vehicles</code> - Vehicle details and MOT status
                </li>
                <li>
                  • <code>appointments</code> - Service bookings
                </li>
                <li>
                  • <code>documents</code> - Invoices, quotes, estimates
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">MOT & Operations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <code>mot_history</code> - Complete MOT test records
                </li>
                <li>
                  • <code>reminders</code> - MOT/service reminder tracking
                </li>
                <li>
                  • <code>stock_items</code> - Parts inventory management
                </li>
                <li>
                  • <code>jobs</code> - Work orders and job tracking
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
