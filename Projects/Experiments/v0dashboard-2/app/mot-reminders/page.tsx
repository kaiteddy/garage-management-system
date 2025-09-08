"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Car,
  Phone,
  Calendar,
  RefreshCw,
  TestTube,
  Settings,
  Eye,
  Download,
  ExternalLink,
  Search
} from "lucide-react"
import { toast } from "sonner"
import { useVehicleData } from "@/hooks/use-vehicle-data"
import Link from "next/link"
import { MOTStatusOverview } from "@/components/mot-reminders/mot-status-overview"
import { MOTRemindersTable } from "@/components/mot-reminders/mot-reminders-table"

export default function MOTRemindersPage() {
  const { vehicles, statusCounts, isLoading, error, refreshData } = useVehicleData()
  const [isCheckingMOT, setIsCheckingMOT] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleMOTCheck = async () => {
    console.log("[MOT-CHECK] Button clicked - starting MOT check")
    try {
      setIsCheckingMOT(true)

      // Get all registrations from visible vehicles
      console.log("[MOT-CHECK] Vehicles data:", vehicles?.length || 0, "vehicles")
      const registrations = (vehicles || []).map((v) => v.registration).filter((reg) => reg && reg.trim().length > 0)
      console.log("[MOT-CHECK] Found registrations:", registrations.length)

      if (registrations.length === 0) {
        toast.error("No vehicles to check", {
          description: "No valid registration numbers found",
        })
        return
      }

      // Limit to first 100 vehicles for API rate limiting
      const limitedRegistrations = registrations.slice(0, 100)

      if (registrations.length > 100) {
        console.log("[MOT-CHECK] Too many vehicles, showing info toast")
        toast.info(`Processing first 100 of ${registrations.length} vehicles`, {
          description: "Due to API limits, checking 100 vehicles at a time. This may take 2-3 minutes...",
        })
      }

      console.log(`[MOT-CHECK] Starting batch check for ${limitedRegistrations.length} vehicles`)
      console.log("[MOT-CHECK] About to make fetch request")

      // Show processing toast for all cases
      if (registrations.length <= 100) {
        toast.info(`Processing ${limitedRegistrations.length} vehicles`, {
          description: "This may take 2-3 minutes. Please wait...",
        })
      }

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minute timeout

      try {
        const response = await fetch("/api/mot/batch-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ registrations: limitedRegistrations }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        console.log("[MOT-CHECK] Fetch request completed, response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success) {
          toast.success("MOT check completed", {
            description: `Checked ${result.checked} vehicles, updated ${result.databaseUpdated} in database, ${result.errors} errors`,
          })

          // Refresh the data to show updated MOT statuses
          await refreshData()
        } else {
          throw new Error(result.error || "MOT check failed")
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error("[MOT-CHECK] Error:", error)

        if (error.name === 'AbortError') {
          toast.error("MOT check timed out", {
            description: "The process took longer than 3 minutes. It may still be running in the background.",
          })
        } else {
          toast.error("MOT check failed", {
            description: error instanceof Error ? error.message : "Unknown error occurred",
          })
        }
      } finally {
        setIsCheckingMOT(false)
      }
    } catch (error) {
      console.error("[MOT-CHECK] Outer error:", error)
      setIsCheckingMOT(false)
      toast.error("MOT check failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      setIsCheckingMOT(false)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)

      const response = await fetch("/api/mot/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicles: vehicles || [] }),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mot-reminders-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Export completed", {
        description: "MOT reminders data has been downloaded",
      })
    } catch (error) {
      console.error("[EXPORT] Error:", error)
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MOT Reminders</h2>
          <p className="text-muted-foreground">Manage and track MOT expiry dates for all vehicles</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/mot-critical">
            <Button variant="default" className="bg-red-600 hover:bg-red-700">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Critical MOTs
            </Button>
          </Link>
          <Button onClick={handleMOTCheck} disabled={isCheckingMOT || isLoading} variant="outline">
            {isCheckingMOT ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Check MOT Status
          </Button>
          <Button onClick={handleExport} disabled={isExporting || isLoading} variant="outline">
            {isExporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Data
          </Button>
        </div>
      </div>

      <MOTStatusOverview statusCounts={statusCounts} isLoading={isLoading} onRefresh={refreshData} />

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MOTRemindersTable vehicles={vehicles} isLoading={isLoading} />
      )}
    </div>
  )
}
