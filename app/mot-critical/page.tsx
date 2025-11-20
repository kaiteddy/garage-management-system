"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Download, AlertTriangle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { MOTCriticalTable } from "@/components/mot-critical/mot-critical-table"
import { ProcessingStatus } from "@/components/mot-critical/processing-status"
import Link from "next/link"

interface CriticalMOTData {
  vehicles: any[]
  summary: {
    total: number
    expired: number
    expiringSoon: number
    lastChecked: string
  }
  categories: {
    expired: any[]
    expiringSoon: any[]
  }
}

export default function MOTCriticalPage() {
  const [data, setData] = useState<CriticalMOTData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [isFixingAll, setIsFixingAll] = useState(false)
  const [isFixingFast, setIsFixingFast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCriticalMOTData = async () => {
    try {
      setError(null)
      const response = await fetch("/api/mot/critical-check")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load critical MOT data")
      }

      setData(result.data)

      toast.success("Critical MOT data loaded", {
        description: `Found ${result.data.summary.total} vehicles requiring attention`,
      })

    } catch (error) {
      console.error("Error loading critical MOT data:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)

      toast.error("Failed to load critical MOT data", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadCriticalMOTData()
  }

  const handleFixExpiryDates = async () => {
    try {
      setIsFixing(true)
      setError(null)

      toast.info("Starting MOT expiry date fix...", {
        description: "This may take a few minutes to complete",
      })

      const response = await fetch("/api/mot/fix-expiry-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fix MOT expiry dates")
      }

      toast.success("MOT expiry dates fixed!", {
        description: `Fixed ${result.fixed} vehicles. Found ${result.results.criticalMOTs.totalCritical} critical MOTs.`,
      })

      // Refresh the data to show updated results
      await loadCriticalMOTData()

    } catch (error) {
      console.error("Error fixing MOT expiry dates:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)

      toast.error("Failed to fix MOT expiry dates", {
        description: errorMessage,
      })
    } finally {
      setIsFixing(false)
    }
  }

  const handleFixAllExpiryDates = async () => {
    try {
      setIsFixingAll(true)
      setError(null)

      toast.info("Starting complete MOT expiry date fix...", {
        description: "This will process ALL vehicles and may take 15-30 minutes to complete",
      })

      const response = await fetch("/api/mot/fix-all-expiry-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to fix all MOT expiry dates")
      }

      toast.success("All MOT expiry dates fixed!", {
        description: `Processed ${result.processed} vehicles, fixed ${result.fixed}. Found ${result.results.criticalMOTs.totalCritical} critical MOTs.`,
      })

      // Refresh the data to show updated results
      await loadCriticalMOTData()

    } catch (error) {
      console.error("Error fixing all MOT expiry dates:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)

      toast.error("Failed to fix all MOT expiry dates", {
        description: errorMessage,
      })
    } finally {
      setIsFixingAll(false)
    }
  }

  const handleFixAllFast = async () => {
    try {
      setIsFixingFast(true)
      setError(null)

      toast.info("Starting HIGH-SPEED MOT fix...", {
        description: "Using parallel processing - should complete in 10-15 minutes",
      })

      const response = await fetch("/api/mot/fix-all-fast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to perform high-speed fix")
      }

      toast.success("High-speed processing complete!", {
        description: `Processed ${result.processed} vehicles at high speed. Found ${result.results.criticalMOTs.totalCritical} critical MOTs.`,
      })

      // Refresh the data to show updated results
      await loadCriticalMOTData()

    } catch (error) {
      console.error("Error in high-speed fix:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)

      toast.error("High-speed fix failed", {
        description: errorMessage,
      })
    } finally {
      setIsFixingFast(false)
    }
  }

  const handleExport = async () => {
    if (!data || data.vehicles.length === 0) {
      toast.error("No data to export")
      return
    }

    try {
      // Create CSV content
      const headers = [
        "Registration",
        "Make",
        "Model",
        "Year",
        "Customer Name",
        "Phone",
        "Email",
        "MOT Expiry Date",
        "Status",
        "Days Difference"
      ]

      const csvContent = [
        headers.join(","),
        ...data.vehicles.map(vehicle => [
          vehicle.registration || "",
          vehicle.make || "",
          vehicle.model || "",
          vehicle.year || "",
          `${vehicle.first_name || vehicle.forename || ""} ${vehicle.last_name || vehicle.surname || ""}`.trim(),
          vehicle.phone || vehicle.mobile || "",
          vehicle.email || "",
          vehicle.mot_expiry_date || "",
          vehicle.mot_urgency === 'expired' ? 'Expired' : 'Expiring Soon',
          vehicle.days_difference || ""
        ].map(field => `"${field}"`).join(","))
      ].join("\n")

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `critical-mot-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Export completed", {
        description: `Downloaded ${data.vehicles.length} critical MOT records`,
      })

    } catch (error) {
      console.error("Export error:", error)
      toast.error("Export failed", {
        description: "Unable to export critical MOT data",
      })
    }
  }

  useEffect(() => {
    loadCriticalMOTData()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-full overflow-hidden font-['Inter','Inter_Fallback',system-ui,sans-serif]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <Link href="/mot-reminders">
            <Button variant="ghost" size="sm" className="w-fit font-medium">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to MOT Reminders
            </Button>
          </Link>
          <div className="min-w-0">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-red-500 flex-shrink-0" />
              <span className="break-words font-bold">Critical MOT Status</span>
            </h2>
            <p className="text-muted-foreground text-sm lg:text-base break-words font-medium">
              MOTs expired within the last 6 months or expiring in the next 14 days
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:space-x-2">
          <Button
            onClick={handleFixAllFast}
            disabled={isFixingFast || isFixingAll || isFixing || isLoading}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm whitespace-nowrap"
          >
            {isFixingFast ? (
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">🚀 HIGH-SPEED Fix</span>
            <span className="sm:hidden">🚀 Fast</span>
          </Button>
          <Button
            onClick={handleFixAllExpiryDates}
            disabled={isFixingAll || isFixingFast || isFixing || isLoading}
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm whitespace-nowrap"
          >
            {isFixingAll ? (
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">Fix ALL (Slow)</span>
            <span className="sm:hidden">All</span>
          </Button>
          <Button
            onClick={handleFixExpiryDates}
            disabled={isFixing || isFixingAll || isLoading}
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm whitespace-nowrap"
          >
            {isFixing ? (
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">Fix 100 Vehicles</span>
            <span className="sm:hidden">100</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm whitespace-nowrap"
          >
            {isRefreshing ? (
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading || !data || data.vehicles.length === 0}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm whitespace-nowrap"
          >
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Processing Status */}
      <ProcessingStatus />

      {/* Summary Alert */}
      {data && !isLoading && data.summary.total > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Critical MOT Summary
            </CardTitle>
            <CardDescription className="text-orange-700">
              Last updated: {new Date(data.summary.lastChecked).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">{data.summary.total}</div>
                <div className="text-orange-800">Total Critical</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{data.summary.expired}</div>
                <div className="text-red-800">Expired (Last 6 Months)</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-yellow-600">{data.summary.expiringSoon}</div>
                <div className="text-yellow-800">Expiring (Next 14 Days)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Critical MOTs Alert */}
      {data && !isLoading && data.summary.total === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <AlertTriangle className="h-5 w-5" />
              No Critical MOTs Found
            </CardTitle>
            <CardDescription className="text-blue-700">
              Great news! No vehicles have critical MOT issues at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-blue-800">
              <p className="mb-2">
                If you expected to see vehicles here, it might be because MOT expiry dates are missing from the database.
              </p>
              <p className="font-medium">
                Click "Fix Missing Dates" above to update vehicles that have MOT status but missing expiry dates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Critical MOT Data</CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline" className="bg-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!error && (
        <MOTCriticalTable
          vehicles={data?.vehicles || []}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
