"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, RefreshCw, Search, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { MOTStatusOverview } from "@/components/mot-reminders/mot-status-overview"
import { MOTRemindersTable } from "@/components/mot-reminders/mot-reminders-table"
import { useVehicleData } from "@/hooks/use-vehicle-data"
import Link from "next/link"

export default function MOTRemindersPage() {
  const { vehicles, statusCounts, isLoading, error, refreshData } = useVehicleData()
  const [isCheckingMOT, setIsCheckingMOT] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleMOTCheck = async () => {
    try {
      setIsCheckingMOT(true)

      // Get all registrations from visible vehicles
      const registrations = vehicles.map((v) => v.registration).filter((reg) => reg && reg.trim().length > 0)

      if (registrations.length === 0) {
        toast.error("No vehicles to check", {
          description: "No valid registration numbers found",
        })
        return
      }

      if (registrations.length > 100) {
        toast.error("Too many vehicles", {
          description: "Please limit to 100 vehicles at a time",
        })
        return
      }

      console.log(`[MOT-CHECK] Starting batch check for ${registrations.length} vehicles`)

      const response = await fetch("/api/mot/batch-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrations }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast.success("MOT check completed", {
          description: `Updated ${result.updated} vehicles, ${result.errors} errors`,
        })

        // Refresh the data to show updated MOT statuses
        await refreshData()
      } else {
        throw new Error(result.error || "MOT check failed")
      }
    } catch (error) {
      console.error("[MOT-CHECK] Error:", error)
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
        body: JSON.stringify({ vehicles }),
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
