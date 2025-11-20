"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Zap,
  Activity,
} from "lucide-react"

interface ScanProgress {
  isRunning: boolean
  totalVehicles: number
  processedVehicles: number
  successfulScans: number
  failedScans: number
  currentVehicle: string
  averageProcessingTime: number
  estimatedTimeRemaining: number
  startTime: number
  errors: string[]
}

interface ScanStats {
  totalVehicles: number
  scannedVehicles: number
  validMOTs: number
  expiredMOTs: number
  dueSoonMOTs: number
  unknownMOTs: number
  lastScanDate: string | null
}

interface ReadinessCheck {
  success: boolean
  ready: boolean
  message: string
  error?: string
  details?: {
    hasCredentials: boolean
    databaseReady: boolean
    vehicleCount: number
    isCurrentlyScanning: boolean
    authError?: string
    dbError?: string
  }
}

export default function MOTScanPage() {
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [scanStats, setScanStats] = useState<ScanStats | null>(null)
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadReadinessCheck()
    loadScanStats()
    loadScanProgress()
  }, [])

  // Auto-refresh progress when scanning
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (scanProgress?.isRunning) {
      interval = setInterval(() => {
        loadScanProgress()
      }, 2000) // Update every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [scanProgress?.isRunning])

  const loadReadinessCheck = async () => {
    try {
      const response = await fetch("/api/mot/bulk-scan")
      const data = await response.json()
      setReadiness(data)
    } catch (error) {
      console.error("Failed to load readiness check:", error)
      setReadiness({
        success: false,
        ready: false,
        message: "Failed to check system readiness",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const loadScanStats = async () => {
    try {
      const response = await fetch("/api/mot/bulk-scan?action=stats")
      const data = await response.json()
      if (data.success) {
        setScanStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to load scan stats:", error)
    }
  }

  const loadScanProgress = async () => {
    try {
      const response = await fetch("/api/mot/bulk-scan?action=status")
      const data = await response.json()
      if (data.success) {
        setScanProgress(data.progress)
      }
    } catch (error) {
      console.error("Failed to load scan progress:", error)
    }
  }

  const startBulkScan = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/mot/bulk-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          options: {
            concurrency: 15,
            batchSize: 100,
            delayBetweenBatches: 500,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✅ Bulk scan started for ${data.totalVehicles} vehicles`)
        await loadScanProgress()
      } else {
        setMessage(`❌ Failed to start scan: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error starting scan: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const stopBulkScan = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/mot/bulk-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage("🛑 Bulk scan stopped")
        await loadScanProgress()
        await loadScanStats()
      } else {
        setMessage(`❌ Failed to stop scan: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error stopping scan: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    await Promise.all([loadReadinessCheck(), loadScanStats(), loadScanProgress()])
    setMessage("📊 Data refreshed")
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getProgressPercentage = (): number => {
    if (!scanProgress || scanProgress.totalVehicles === 0) return 0
    return (scanProgress.processedVehicles / scanProgress.totalVehicles) * 100
  }

  const getProcessingSpeed = (): number => {
    if (!scanProgress || scanProgress.averageProcessingTime === 0) return 0
    return Math.round((1000 / scanProgress.averageProcessingTime) * 100) / 100 // vehicles per second
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">MOT Bulk Scanner</h1>
          <p className="text-muted-foreground">High-performance bulk MOT status checking using DVSA API</p>
        </div>
      </div>

      {message && (
        <Alert className={message.includes("✅") ? "border-green-500" : message.includes("❌") ? "border-red-500" : ""}>
          {message.includes("✅") ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : message.includes("❌") ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* System Readiness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Readiness
          </CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">DVSA Credentials</span>
              <Badge variant={readiness?.details?.hasCredentials ? "default" : "destructive"}>
                {readiness?.details?.hasCredentials ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Missing
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Database</span>
              <Badge variant={readiness?.details?.databaseReady ? "default" : "destructive"}>
                {readiness?.details?.databaseReady ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Ready
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Vehicles</span>
              <Badge variant="outline">{readiness?.details?.vehicleCount || 0} found</Badge>
            </div>
          </div>

          {readiness?.error && (
            <Alert className="border-red-500">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription>{readiness.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Bulk Scan Control
          </CardTitle>
          <CardDescription>Start or stop the high-performance MOT bulk scan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanProgress?.isRunning ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Scan Status</span>
                <Badge className="bg-green-500">
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Running
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Progress: {scanProgress.processedVehicles} / {scanProgress.totalVehicles}
                  </span>
                  <span>{getProgressPercentage().toFixed(1)}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-600">{scanProgress.successfulScans}</div>
                  <div className="text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="font-medium text-red-600">{scanProgress.failedScans}</div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="font-medium text-blue-600">{getProcessingSpeed()}/sec</div>
                  <div className="text-muted-foreground">Speed</div>
                </div>
                <div>
                  <div className="font-medium text-orange-600">
                    {scanProgress.estimatedTimeRemaining > 0
                      ? formatTime(scanProgress.estimatedTimeRemaining)
                      : "Calculating..."}
                  </div>
                  <div className="text-muted-foreground">ETA</div>
                </div>
              </div>

              {scanProgress.currentVehicle && (
                <div className="text-sm text-muted-foreground">
                  Currently processing: <span className="font-mono">{scanProgress.currentVehicle}</span>
                </div>
              )}

              <Button onClick={stopBulkScan} disabled={loading} variant="destructive">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Scan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Scan Status</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Idle
                </Badge>
              </div>

              <Button onClick={startBulkScan} disabled={loading || !readiness?.ready} size="lg" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Scan...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Bulk MOT Scan
                  </>
                )}
              </Button>

              {!readiness?.ready && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    System not ready for scanning. Please check the readiness status above.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {scanStats && (
        <Card>
          <CardHeader>
            <CardTitle>MOT Status Overview</CardTitle>
            <CardDescription>Current MOT status distribution across all vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{scanStats.totalVehicles}</div>
                <div className="text-sm text-muted-foreground">Total Vehicles</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{scanStats.validMOTs}</div>
                <div className="text-sm text-muted-foreground">Valid MOTs</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{scanStats.expiredMOTs}</div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">{scanStats.dueSoonMOTs}</div>
                <div className="text-sm text-muted-foreground">Due Soon</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg border">
                <div className="text-2xl font-bold text-gray-600">{scanStats.unknownMOTs}</div>
                <div className="text-sm text-muted-foreground">Unknown</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{scanStats.scannedVehicles}</div>
                <div className="text-sm text-muted-foreground">Scanned</div>
              </div>
            </div>

            {scanStats.lastScanDate && (
              <>
                <Separator className="my-4" />
                <div className="text-sm text-muted-foreground">
                  Last scan completed: {new Date(scanStats.lastScanDate).toLocaleString()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Information */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Configuration</CardTitle>
          <CardDescription>Optimized settings for maximum scanning speed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Concurrency Settings</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 15 concurrent requests</li>
                <li>• 100 vehicles per batch</li>
                <li>• 500ms batch delay</li>
                <li>• 8 second timeout</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Expected Performance</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 10-15 vehicles/second</li>
                <li>• ~1000 vehicles in 2 minutes</li>
                <li>• ~10,000 vehicles in 20 minutes</li>
                <li>• Real-time progress tracking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Error Handling</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Automatic retry logic</li>
                <li>• Graceful failure handling</li>
                <li>• Rate limit compliance</li>
                <li>• Comprehensive logging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
