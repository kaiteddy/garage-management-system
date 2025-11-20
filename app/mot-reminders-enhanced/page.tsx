"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Download, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  Calendar,
  Car,
  User,
  Phone,
  Mail,
  ExternalLink,
  Filter,
  Eye,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Vehicle {
  id: string
  registration: string
  make: string
  model: string
  year: number
  motStatus: string
  motExpiryDate: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
  }
  lastInvoiced: string
}

export default function EnhancedMOTRemindersPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [makeFilter, setMakeFilter] = useState("All Makes")
  const [reminderFilter, setReminderFilter] = useState("All Reminders")
  const [showArchived, setShowArchived] = useState(false)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Status counts
  const [statusCounts, setStatusCounts] = useState({
    valid: 0,
    dueSoon: 0,
    expired: 0,
    unknown: 0,
    checking: 0,
    error: 0
  })

  useEffect(() => {
    loadVehicles()
  }, [])

  useEffect(() => {
    filterVehicles()
  }, [vehicles, searchTerm, statusFilter, makeFilter, reminderFilter, showArchived])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mot/critical-with-customers')
      const data = await response.json()
      
      if (data.success) {
        setVehicles(data.data || [])
        calculateStatusCounts(data.data || [])
      } else {
        toast.error("Failed to load vehicles")
      }
    } catch (error) {
      console.error('Error loading vehicles:', error)
      toast.error("Error loading vehicles")
    } finally {
      setLoading(false)
    }
  }

  const calculateStatusCounts = (vehicleData: Vehicle[]) => {
    const counts = vehicleData.reduce((acc, vehicle) => {
      switch (vehicle.motStatus?.toLowerCase()) {
        case 'valid':
          acc.valid++
          break
        case 'due soon':
          acc.dueSoon++
          break
        case 'expired':
          acc.expired++
          break
        case 'checking':
          acc.checking++
          break
        case 'error':
          acc.error++
          break
        default:
          acc.unknown++
      }
      return acc
    }, { valid: 0, dueSoon: 0, expired: 0, unknown: 0, checking: 0, error: 0 })
    
    setStatusCounts(counts)
  }

  const filterVehicles = () => {
    let filtered = vehicles

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vehicle => 
        vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${vehicle.customer?.firstName} ${vehicle.customer?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "All Status") {
      filtered = filtered.filter(vehicle => vehicle.motStatus === statusFilter)
    }

    // Make filter
    if (makeFilter !== "All Makes") {
      filtered = filtered.filter(vehicle => vehicle.make === makeFilter)
    }

    setFilteredVehicles(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Valid</Badge>
      case 'due soon':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Due Soon</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Expired</Badge>
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Checking</Badge>
      case 'error':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDVLAUrl = (registration: string) => {
    return `https://www.check-mot.service.gov.uk/results?registration=${encodeURIComponent(registration)}&checkRecalls=true`
  }

  const getUniqueValues = (field: keyof Vehicle) => {
    return [...new Set(vehicles.map(v => v[field] as string))].filter(Boolean).sort()
  }

  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const totalPages = Math.ceil(filteredVehicles.length / rowsPerPage)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MOT Reminders</h1>
          <p className="text-muted-foreground">
            Manage and track MOT expiry dates for all vehicles
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/mot-critical">
            <Button variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Critical MOTs
            </Button>
          </Link>
          <Button variant="outline" onClick={loadVehicles}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.valid}</div>
            <div className="text-sm text-green-700">Valid</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.dueSoon}</div>
            <div className="text-sm text-yellow-700">Due Soon</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.expired}</div>
            <div className="text-sm text-red-700">Expired</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.unknown}</div>
            <div className="text-sm text-gray-700">Unknown</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.checking}</div>
            <div className="text-sm text-blue-700">Checking</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.error}</div>
            <div className="text-sm text-purple-700">Error</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, registration, make, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Valid">Valid</SelectItem>
                <SelectItem value="Due Soon">Due Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>

            <Select value={makeFilter} onValueChange={setMakeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Makes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Makes">All Makes</SelectItem>
                {getUniqueValues('make').map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={reminderFilter} onValueChange={setReminderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Reminders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Reminders">All Reminders</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="archived" 
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <label htmlFor="archived" className="text-sm">Show Archived</label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Showing {paginatedVehicles.length} of {filteredVehicles.length} vehicles
              </span>
              <Select value={rowsPerPage.toString()} onValueChange={(value) => setRowsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>
            {filteredVehicles.length} vehicles found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading vehicles...</p>
            </div>
          ) : paginatedVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vehicles found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Work Due</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Registration</th>
                    <th className="text-left p-3 font-medium">Make</th>
                    <th className="text-left p-3 font-medium">Model</th>
                    <th className="text-left p-3 font-medium">Customer</th>
                    <th className="text-left p-3 font-medium">Contact</th>
                    <th className="text-left p-3 font-medium">MOT Status</th>
                    <th className="text-left p-3 font-medium">MOT Due</th>
                    <th className="text-left p-3 font-medium">Last Invoiced</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          MOT Due
                        </Badge>
                      </td>
                      <td className="p-3">{getStatusBadge(vehicle.motStatus)}</td>
                      <td className="p-3">
                        <Link 
                          href={`/vehicles/${vehicle.registration}`}
                          className="font-mono font-bold hover:text-blue-600"
                        >
                          {vehicle.registration}
                        </Link>
                      </td>
                      <td className="p-3">{vehicle.make}</td>
                      <td className="p-3">{vehicle.model}</td>
                      <td className="p-3">
                        {vehicle.customer ? (
                          <div>
                            <p className="font-medium">
                              {vehicle.customer.firstName} {vehicle.customer.lastName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No customer</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vehicle.customer && (
                          <div className="flex items-center gap-2">
                            {vehicle.customer.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(`tel:${vehicle.customer.phone}`, '_self')}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                            {vehicle.customer.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(`mailto:${vehicle.customer.email}`, '_self')}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{getStatusBadge(vehicle.motStatus)}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{formatDate(vehicle.motExpiryDate)}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(vehicle.lastInvoiced)}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/vehicles/${vehicle.registration}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(getDVLAUrl(vehicle.registration), '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
