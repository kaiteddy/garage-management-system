"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Download,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Car,
  TrendingUp,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Phone,
  Mail,
  MapPin
} from "lucide-react"
import { toast } from "sonner"
// Helper functions
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-GB')
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount)
}

interface Vehicle {
  registration: string
  make: string
  model: string
  year: number
  color: string
  fuelType: string
  motExpiryDate: string | null
  motStatus: string
  motLastChecked: string | null
  urgencyLevel: 'NO_DATA' | 'EXPIRED' | 'CRITICAL' | 'DUE_SOON' | 'VALID'
  daysDifference: number
  urgencyScore: number
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    address: string
    city: string
    postcode: string
    totalSpent: number
    totalDocuments: number
    lastVisit: string | null
  } | null
  customerValue: number
}

interface MOTData {
  vehicles: Vehicle[]
  summary: {
    totalVehicles: number
    noData: number
    expired: number
    critical: number
    dueSoon: number
    valid: number
    withCustomers: number
    totalCustomerValue: number
  }
  periodBreakdown: Array<{
    period: string
    count: number
  }>
  pagination: {
    currentPage: number
    totalPages: number
    totalVehicles: number
    limit: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    expiryPeriod: string
    periodDays: number
    includeExpired: boolean
    sortBy: string
    sortOrder: string
  }
}

export default function MOTManagementPage() {
  const [data, setData] = useState<MOTData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [expiryPeriod, setExpiryPeriod] = useState('30') // Default 30 days
  const [includeExpired, setIncludeExpired] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('urgency_score')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('all')

  const loadMOTData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        expiryPeriod: expiryPeriod,
        includeExpired: includeExpired.toString(),
        page: currentPage.toString(),
        limit: '50',
        sortBy: sortBy,
        sortOrder: sortOrder
      })

      let response = await fetch(`/api/mot/unified-dashboard?${params}`)

      // Fallback to simple dashboard if unified fails
      if (!response.ok) {
        console.log('[MOT-MANAGEMENT] Unified dashboard failed, trying simple dashboard')
        response = await fetch(`/api/mot/simple-dashboard?${params}`)
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load MOT data")
      }

      setData(result.data)

    } catch (error) {
      console.error("[MOT-MANAGEMENT] Error:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      toast.error("Failed to load MOT data", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMOTData()
  }, [expiryPeriod, includeExpired, currentPage, sortBy, sortOrder])

  const handleRefresh = () => {
    setCurrentPage(1)
    loadMOTData()
  }

  const handleExport = async () => {
    try {
      toast.info("Preparing export...", {
        description: "This may take a few moments"
      })

      const params = new URLSearchParams({
        expiryPeriod: expiryPeriod,
        includeExpired: includeExpired.toString(),
        format: 'csv'
      })

      const response = await fetch(`/api/mot/export?${params}`)

      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `mot-data-${expiryPeriod}-days-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("Export completed!")

    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }

  const getUrgencyBadge = (urgencyLevel: Vehicle['urgencyLevel'], daysDifference: number) => {
    switch (urgencyLevel) {
      case 'EXPIRED':
        return (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            Expired ({daysDifference}d)
          </Badge>
        )
      case 'CRITICAL':
        return (
          <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 text-xs px-1 py-0">
            Critical ({daysDifference}d)
          </Badge>
        )
      case 'DUE_SOON':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-xs px-1 py-0">
            Due ({daysDifference}d)
          </Badge>
        )
      case 'VALID':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 text-xs px-1 py-0">
            Valid ({daysDifference}d)
          </Badge>
        )
      case 'NO_DATA':
        return (
          <Badge variant="outline" className="text-xs px-1 py-0">
            No Data
          </Badge>
        )
      default:
        return null
    }
  }

  const filteredVehicles = data?.vehicles.filter(vehicle => {
    const matchesSearch = searchTerm === '' ||
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.customer && (
        vehicle.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.customer.phone.includes(searchTerm)
      ))

    const matchesUrgency = selectedUrgency === 'all' || vehicle.urgencyLevel === selectedUrgency

    return matchesSearch && matchesUrgency
  }) || []

  return (
    <div className="flex-1 space-y-4 p-3 md:p-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">MOT Management</h2>
          <p className="text-xs text-muted-foreground">
            Unified MOT tracking with adjustable expiry periods
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            <span className="ml-1 hidden sm:inline">Refresh</span>
          </Button>
          <Button onClick={handleExport} disabled={isLoading} variant="outline" size="sm">
            <Download className="h-3 w-3" />
            <span className="ml-1 hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Compact Summary Cards */}
      {data && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Vehicles</p>
                <p className="text-lg font-bold">{data.summary.totalVehicles.toLocaleString()}</p>
              </div>
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Expired MOTs</p>
                <p className="text-lg font-bold text-red-600">{data.summary.expired.toLocaleString()}</p>
              </div>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Due Soon</p>
                <p className="text-lg font-bold text-yellow-600">{data.summary.dueSoon.toLocaleString()}</p>
              </div>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Customer Value</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(data.summary.totalCustomerValue)}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Compact Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Top Row - Main Controls */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={expiryPeriod} onValueChange={setExpiryPeriod}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">2 Weeks</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="90">3 Months</SelectItem>
                  <SelectItem value="180">6 Months</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Include Expired</Label>
              <div className="flex items-center h-8">
                <Switch
                  checked={includeExpired}
                  onCheckedChange={setIncludeExpired}
                  className="scale-75"
                />
                <span className="ml-2 text-xs">
                  {includeExpired ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgency_score">Urgency</SelectItem>
                  <SelectItem value="mot_expiry_date">MOT Date</SelectItem>
                  <SelectItem value="customer_value">Value</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Order</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="h-8 w-full justify-start px-2"
              >
                {sortOrder === 'ASC' ? (
                  <SortAsc className="h-3 w-3" />
                ) : (
                  <SortDesc className="h-3 w-3" />
                )}
              </Button>
            </div>

            <div>
              <Label className="text-xs">Urgency Filter</Label>
              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="DUE_SOON">Due Soon</SelectItem>
                  <SelectItem value="VALID">Valid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Compact Period Breakdown */}
      {data && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">MOT Expiry Breakdown</h3>
          </div>
          <div className="grid gap-2 grid-cols-4">
            {data.periodBreakdown.map((period) => (
              <div key={period.period} className="text-center p-2 bg-muted/50 rounded">
                <div className="text-lg font-bold">{period.count}</div>
                <div className="text-xs text-muted-foreground">{period.period}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Vehicles ({filteredVehicles.length})</span>
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                Page {data.pagination.currentPage} of {data.pagination.totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading MOT data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No vehicles found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header Row */}
              <div className="border-b bg-muted/20 p-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-shrink-0">Registration</div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">Vehicle</div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">Customer</div>
                  <div className="flex items-center gap-1 min-w-0 flex-1">Contact</div>
                  <div className="flex items-center gap-1 min-w-0 flex-shrink-0">MOT Expiry</div>
                  <div className="flex items-center gap-1 min-w-0 flex-shrink-0">Days</div>
                  <div className="flex items-center gap-1 min-w-0 flex-shrink-0">Value</div>
                  <div className="flex items-center gap-1 flex-shrink-0">Actions</div>
                </div>
              </div>

              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.registration}
                  className="border rounded p-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {/* Registration & Badge */}
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <span className="font-semibold text-sm">{vehicle.registration}</span>
                      {getUrgencyBadge(vehicle.urgencyLevel, vehicle.daysDifference)}
                    </div>

                    {/* Vehicle Details */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-muted-foreground truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {vehicle.customer ? (
                        <span className="truncate">
                          {vehicle.customer.firstName} {vehicle.customer.lastName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No customer</span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {vehicle.customer?.phone && (
                        <span className="truncate text-muted-foreground">
                          {vehicle.customer.phone}
                        </span>
                      )}
                    </div>

                    {/* MOT Expiry */}
                    <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                      {vehicle.motExpiryDate && (
                        <span className="text-muted-foreground">
                          {formatDate(vehicle.motExpiryDate)}
                        </span>
                      )}
                    </div>

                    {/* Days */}
                    <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                      <span className="text-muted-foreground">
                        {vehicle.daysDifference}d
                      </span>
                    </div>

                    {/* Customer Value */}
                    <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                      {vehicle.customer && vehicle.customer.totalSpent > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(vehicle.customer.totalSpent)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Compact Pagination */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!data.pagination.hasPreviousPage}
                  >
                    Previous
                  </Button>

                  <span className="text-xs text-muted-foreground px-2">
                    {data.pagination.currentPage} / {data.pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!data.pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
