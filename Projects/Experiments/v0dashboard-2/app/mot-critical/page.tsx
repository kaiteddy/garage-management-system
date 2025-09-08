"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RefreshCw,
  Download,
  AlertTriangle,
  ArrowLeft,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Car,
  Phone,
  ExternalLink,
  Filter,
  Users,
  XCircle,
  Clock,
  Mail,
  FileText
} from "lucide-react"
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

interface Vehicle {
  id: string
  registration: string
  make: string
  model: string
  derivative?: string
  year?: string
  color?: string
  motStatus: string
  motExpiryDate: string
  taxStatus: string
  taxDueDate: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  daysUntilMOTExpiry: number
  daysUntilTaxExpiry: number
  motUrgency: string
}

type SortField = 'registration' | 'make' | 'model' | 'motExpiryDate' | 'daysUntilMOTExpiry' | 'customerName'
type SortDirection = 'asc' | 'desc'
type FilterPeriod = 'all' | 'expired' | '7days' | '14days' | '30days' | '60days' | '90days'
type ViewMode = 'critical' | 'all'

export default function MOTCriticalPage() {
  const [data, setData] = useState<CriticalMOTData | null>(null)
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [isFixingAll, setIsFixingAll] = useState(false)
  const [isFixingFast, setIsFixingFast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New state for enhanced functionality
  const [viewMode, setViewMode] = useState<ViewMode>('critical')
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>('daysUntilMOTExpiry')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [allVehiclesLoaded, setAllVehiclesLoaded] = useState(false)
  const [isLoadingAllVehicles, setIsLoadingAllVehicles] = useState(false)

  // Load all vehicles with MOT data (with caching)
  const loadAllVehicles = async (force = false) => {
    // Skip loading if already loaded and not forcing refresh
    if (allVehiclesLoaded && !force) {
      console.log("📋 All vehicles already loaded, using cached data")
      return
    }

    try {
      setIsLoadingAllVehicles(true)
      setError(null)

      console.log("🚗 Loading all vehicles from API...")
      const response = await fetch("/api/vehicles/all-with-mot")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load vehicles data")
      }

      setAllVehicles(result.vehicles)
      setAllVehiclesLoaded(true)

      console.log(`✅ Loaded ${result.vehicles.length} vehicles successfully`)

      // Auto-fetch MOT data for vehicles without MOT expiry dates
      const vehiclesWithoutMOT = result.vehicles.filter((v: Vehicle) =>
        !v.motExpiryDate || v.motExpiryDate === 'Unknown' || v.motExpiryDate === ''
      )

      if (vehiclesWithoutMOT.length > 0 && !force) {
        console.log(`🔄 Found ${vehiclesWithoutMOT.length} vehicles without MOT data, will auto-fetch in background`)
        // Auto-fetch MOT data in background (don't await to avoid blocking UI)
        setTimeout(() => {
          autoFetchMissingMotData(vehiclesWithoutMOT.slice(0, 5)) // Limit to first 5 to avoid overwhelming the API
        }, 3000) // Increased delay to let UI settle
      }

      if (force) {
        toast.success("All vehicles refreshed", {
          description: `Loaded ${result.vehicles.length} vehicles with MOT tracking`,
        })
      }

    } catch (error) {
      console.error("Error loading all vehicles:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)

      toast.error("Failed to load vehicles data", {
        description: errorMessage,
      })
    } finally {
      setIsLoadingAllVehicles(false)
    }
  }

  // Auto-fetch MOT data for vehicles that don't have it
  const autoFetchMissingMotData = async (vehicles: Vehicle[]) => {
    console.log(`🤖 Auto-fetching MOT data for ${vehicles.length} vehicles...`)

    for (const vehicle of vehicles) {
      try {
        console.log(`🔍 Fetching MOT data for ${vehicle.registration}...`)
        const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.registration)}/fetch-exact-mot-history`, {
          method: 'POST'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            console.log(`✅ MOT data fetched for ${vehicle.registration}`)
          }
        }

        // Small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.log(`⚠️ Failed to fetch MOT data for ${vehicle.registration}:`, error)
      }
    }

    // Refresh the data after auto-fetching
    console.log('🔄 Auto-fetch complete, refreshing vehicle data...')
    setTimeout(() => {
      loadAllVehicles(true)
    }, 1000)
  }

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
    if (viewMode === 'all') {
      await loadAllVehicles(true) // Force refresh
    } else {
      await loadCriticalMOTData()
    }
    setIsRefreshing(false)
  }

  // Filter and sort vehicles for "All Vehicles" view
  const filteredAndSortedVehicles = useMemo(() => {
    if (viewMode !== 'all') return []

    let filtered = allVehicles.filter(vehicle => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        vehicle.registration.toLowerCase().includes(searchLower) ||
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        (vehicle.customerName && vehicle.customerName.toLowerCase().includes(searchLower))

      if (!matchesSearch) return false

      // Period filter
      switch (filterPeriod) {
        case 'expired':
          return vehicle.daysUntilMOTExpiry < 0
        case '7days':
          return vehicle.daysUntilMOTExpiry >= 0 && vehicle.daysUntilMOTExpiry <= 7
        case '14days':
          return vehicle.daysUntilMOTExpiry >= 0 && vehicle.daysUntilMOTExpiry <= 14
        case '30days':
          return vehicle.daysUntilMOTExpiry >= 0 && vehicle.daysUntilMOTExpiry <= 30
        case '60days':
          return vehicle.daysUntilMOTExpiry >= 0 && vehicle.daysUntilMOTExpiry <= 60
        case '90days':
          return vehicle.daysUntilMOTExpiry >= 0 && vehicle.daysUntilMOTExpiry <= 90
        default:
          return true
      }
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle special cases
      if (sortField === 'motExpiryDate') {
        aValue = new Date(aValue || '9999-12-31').getTime()
        bValue = new Date(bValue || '9999-12-31').getTime()
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue || '').toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [allVehicles, searchTerm, sortField, sortDirection, filterPeriod, viewMode])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get MOT status badge
  const getMOTStatusBadge = (vehicle: Vehicle) => {
    const days = vehicle.daysUntilMOTExpiry

    if (days < 0) {
      return <Badge variant="destructive">Expired ({Math.abs(days)} days ago)</Badge>
    } else if (days === 0) {
      return <Badge variant="destructive">Expires Today</Badge>
    } else if (days <= 7) {
      return <Badge variant="destructive">{days} days</Badge>
    } else if (days <= 14) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{days} days</Badge>
    } else if (days <= 30) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{days} days</Badge>
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">{days} days</Badge>
    }
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  // Get filter counts for all vehicles
  const filterCounts = useMemo(() => {
    if (viewMode !== 'all') return { all: 0, expired: 0, '7days': 0, '14days': 0, '30days': 0, '60days': 0, '90days': 0 }

    return {
      all: allVehicles.length,
      expired: allVehicles.filter(v => v.daysUntilMOTExpiry < 0).length,
      '7days': allVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 7).length,
      '14days': allVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 14).length,
      '30days': allVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 30).length,
      '60days': allVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 60).length,
      '90days': allVehicles.filter(v => v.daysUntilMOTExpiry >= 0 && v.daysUntilMOTExpiry <= 90).length,
    }
  }, [allVehicles, viewMode])

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
    // Only load critical MOT data on mount
    const loadInitialData = async () => {
      setIsLoading(true)
      await loadCriticalMOTData()
      setIsLoading(false)
    }

    loadInitialData()
  }, [])

  // Handle view mode changes - lazy load all vehicles only when needed
  useEffect(() => {
    if (viewMode === 'all' && !allVehiclesLoaded) {
      loadAllVehicles()
    }
  }, [viewMode, allVehiclesLoaded])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-full overflow-hidden font-['Inter','Inter_Fallback',system-ui,sans-serif]">
      {/* Clean Professional Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/mot-reminders">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to MOT Reminders
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              Critical MOT Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Vehicle MOT tracking and management dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="outline"
            size="sm"
            className="font-medium"
          >
            {isRefreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Data
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading || !data || data.vehicles.length === 0}
            variant="outline"
            size="sm"
            className="font-medium"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Processing Status - Only show when actively processing */}
      {(isRefreshing || isLoading || isFixing || isFixingAll || isFixingFast) && (
        <ProcessingStatus />
      )}

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

      {/* Main Content with Tabs */}
      {!error && (
        <Tabs value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="critical" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical MOTs
              {data && data.summary.total > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {data.summary.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              {isLoadingAllVehicles ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              All Vehicles
              {allVehicles.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {allVehicles.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Critical MOTs Tab */}
          <TabsContent value="critical" className="space-y-4">
            <MOTCriticalTable
              vehicles={data?.vehicles || []}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* All Vehicles Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Filters and Search for All Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Vehicles</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by registration, make, model, or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-64">
                    <Label htmlFor="filter">Filter by MOT Expiry</Label>
                    <Select value={filterPeriod} onValueChange={(value: FilterPeriod) => setFilterPeriod(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vehicles ({filterCounts.all})</SelectItem>
                        <SelectItem value="expired">Expired ({filterCounts.expired})</SelectItem>
                        <SelectItem value="7days">Next 7 Days ({filterCounts['7days']})</SelectItem>
                        <SelectItem value="14days">Next 14 Days ({filterCounts['14days']})</SelectItem>
                        <SelectItem value="30days">Next 30 Days ({filterCounts['30days']})</SelectItem>
                        <SelectItem value="60days">Next 60 Days ({filterCounts['60days']})</SelectItem>
                        <SelectItem value="90days">Next 90 Days ({filterCounts['90days']})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredAndSortedVehicles.length} of {allVehicles.length} vehicles
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{filterCounts.expired} Expired</Badge>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {filterCounts['7days']} Critical (7 days)
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {filterCounts['30days']} Due Soon (30 days)
                </Badge>
              </div>
            </div>

            {/* All Vehicles Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  All Vehicles MOT Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(isLoadingAllVehicles || (viewMode === 'all' && !allVehiclesLoaded)) ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    Loading all vehicles...
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px] font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('daysUntilMOTExpiry')}
                              className="h-auto p-0 font-semibold"
                            >
                              Urgency {getSortIcon('daysUntilMOTExpiry')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[100px] font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('registration')}
                              className="h-auto p-0 font-semibold"
                            >
                              Registration {getSortIcon('registration')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[100px] hidden sm:table-cell font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('make')}
                              className="h-auto p-0 font-semibold"
                            >
                              Make {getSortIcon('make')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[120px] hidden md:table-cell font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('model')}
                              className="h-auto p-0 font-semibold"
                            >
                              Model {getSortIcon('model')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[150px] font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('customerName')}
                              className="h-auto p-0 font-semibold"
                            >
                              Customer {getSortIcon('customerName')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[120px] hidden sm:table-cell font-semibold text-sm">Contact</TableHead>
                          <TableHead className="min-w-[100px] font-semibold text-sm">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('motExpiryDate')}
                              className="h-auto p-0 font-semibold"
                            >
                              MOT Expiry {getSortIcon('motExpiryDate')}
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[80px] hidden md:table-cell font-semibold text-sm">Days</TableHead>
                          <TableHead className="min-w-[100px] hidden lg:table-cell font-semibold text-sm">Tax Status</TableHead>
                          <TableHead className="min-w-[120px] font-semibold text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedVehicles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8">
                              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
                              <p className="text-muted-foreground">
                                {searchTerm || filterPeriod !== 'all'
                                  ? "Try adjusting your search or filter criteria"
                                  : "No vehicles available"
                                }
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedVehicles.map((vehicle) => {
                            // Get urgency info for styling
                            const getUrgencyInfo = (vehicle: Vehicle) => {
                              const days = vehicle.daysUntilMOTExpiry
                              if (days < 0) {
                                return {
                                  variant: 'destructive' as const,
                                  className: 'bg-red-100 text-red-800 border-red-200',
                                  icon: XCircle,
                                  text: 'EXPIRED'
                                }
                              } else if (days <= 7) {
                                return {
                                  variant: 'destructive' as const,
                                  className: 'bg-red-100 text-red-800 border-red-200',
                                  icon: AlertTriangle,
                                  text: 'CRITICAL'
                                }
                              } else if (days <= 14) {
                                return {
                                  variant: 'secondary' as const,
                                  className: 'bg-orange-100 text-orange-800 border-orange-200',
                                  icon: Clock,
                                  text: 'DUE SOON'
                                }
                              } else if (days <= 30) {
                                return {
                                  variant: 'secondary' as const,
                                  className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                  icon: Clock,
                                  text: 'ATTENTION'
                                }
                              } else {
                                return {
                                  variant: 'secondary' as const,
                                  className: 'bg-green-100 text-green-800 border-green-200',
                                  icon: Clock,
                                  text: 'VALID'
                                }
                              }
                            }

                            const urgencyInfo = getUrgencyInfo(vehicle)

                            return (
                              <TableRow key={vehicle.id}>
                                {/* Urgency */}
                                <TableCell>
                                  <Badge
                                    variant={urgencyInfo.variant}
                                    className={`text-xs ${urgencyInfo.className}`}
                                  >
                                    <urgencyInfo.icon className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">{urgencyInfo.text}</span>
                                    <span className="sm:hidden">{urgencyInfo.text.slice(0, 3)}</span>
                                  </Badge>
                                </TableCell>

                                {/* Registration */}
                                <TableCell className="font-medium">
                                  <div>
                                    <Link href={`/vehicles/${vehicle.registration}`}>
                                      <button className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-sm transition-colors cursor-pointer">
                                        {vehicle.registration}
                                      </button>
                                    </Link>
                                    <div className="sm:hidden text-xs text-muted-foreground font-medium">
                                      {vehicle.make} {vehicle.model}
                                      {vehicle.year && ` (${vehicle.year})`}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Make */}
                                <TableCell className="font-semibold text-sm hidden sm:table-cell">
                                  {vehicle.make || 'Unknown'}
                                </TableCell>

                                {/* Model */}
                                <TableCell className="hidden md:table-cell">
                                  <div className="font-semibold text-sm">{vehicle.model || 'Unknown'}</div>
                                  {vehicle.year && (
                                    <span className="text-muted-foreground ml-1 text-sm font-medium">({vehicle.year})</span>
                                  )}
                                  {vehicle.color && (
                                    <div className="text-xs text-muted-foreground">{vehicle.color}</div>
                                  )}
                                </TableCell>

                                {/* Customer */}
                                <TableCell>
                                  {vehicle.customerName ? (
                                    <div className="font-medium text-sm">{vehicle.customerName}</div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No customer data</span>
                                  )}
                                </TableCell>

                                {/* Contact */}
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex flex-col space-y-1">
                                    {vehicle.customerPhone && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">{vehicle.customerPhone}</span>
                                      </div>
                                    )}
                                    {vehicle.customerEmail && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                          {vehicle.customerEmail}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* MOT Expiry */}
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {vehicle.motExpiryDate ? (
                                        new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB')
                                      ) : (
                                        <span className="text-muted-foreground">No data</span>
                                      )}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Days */}
                                <TableCell className="hidden md:table-cell">
                                  <div className="text-sm font-semibold">
                                    {vehicle.daysUntilMOTExpiry < 0 ? (
                                      <span className="text-red-600">-{Math.abs(vehicle.daysUntilMOTExpiry)}</span>
                                    ) : (
                                      <span className={vehicle.daysUntilMOTExpiry <= 30 ? 'text-orange-600' : 'text-green-600'}>
                                        {vehicle.daysUntilMOTExpiry}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Tax Status */}
                                <TableCell className="hidden lg:table-cell">
                                  <div className="text-sm">
                                    <div className="font-medium">{vehicle.taxStatus || 'Unknown'}</div>
                                    {vehicle.taxDueDate && (
                                      <div className="text-xs text-muted-foreground">
                                        Due: {new Date(vehicle.taxDueDate).toLocaleDateString('en-GB')}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Actions */}
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                                      onClick={() => window.open(`https://www.gov.uk/check-mot-history?registration=${vehicle.registration}`, '_blank')}
                                      title="Check MOT history on DVLA"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      DVLA
                                    </Button>
                                    <Link href={`/vehicles/${vehicle.registration}`}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                                        title="View vehicle record"
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Record
                                      </Button>
                                    </Link>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
