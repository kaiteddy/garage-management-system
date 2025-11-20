"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Phone, Mail } from "lucide-react"
import { formatDisplayDate } from "@/lib/date-utils"

export interface EnrichedVehicle {
  id: string
  registration: string
  make: string
  model: string
  year?: number
  customer: string | { name: string; phone?: string; email?: string }
  phone?: string
  email?: string
  workDue?: string
  motStatus: "valid" | "due-soon" | "expired" | "unknown" | "checking" | "error"
  motExpiryDate?: string
  lastInvoiced?: string
  reminderSent: boolean
  archived: boolean
}

interface MOTRemindersTableProps {
  vehicles: EnrichedVehicle[]
  isLoading: boolean
}

export function MOTRemindersTable({ vehicles, isLoading }: MOTRemindersTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [makeFilter, setMakeFilter] = useState("all")
  const [reminderFilter, setReminderFilter] = useState("all")
  const [showArchived, setShowArchived] = useState(false)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Get unique makes for filter
  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(vehicles.map((v) => v.make).filter(Boolean))]
    return makes.sort()
  }, [vehicles])

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const customerName = typeof vehicle.customer === "string" ? vehicle.customer : vehicle.customer?.name || ""

        const searchableText = [vehicle.registration, vehicle.make, vehicle.model, customerName].join(" ").toLowerCase()

        if (!searchableText.includes(search)) return false
      }

      // Status filter
      if (statusFilter !== "all" && vehicle.motStatus !== statusFilter) return false

      // Make filter
      if (makeFilter !== "all" && vehicle.make !== makeFilter) return false

      // Reminder filter
      if (reminderFilter === "sent" && !vehicle.reminderSent) return false
      if (reminderFilter === "not-sent" && vehicle.reminderSent) return false

      // Archived filter
      if (!showArchived && vehicle.archived) return false

      return true
    })
  }, [vehicles, searchTerm, statusFilter, makeFilter, reminderFilter, showArchived])

  // Paginate vehicles
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredVehicles.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredVehicles, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredVehicles.length / rowsPerPage)

  const getStatusBadge = (status: EnrichedVehicle["motStatus"]) => {
    const variants = {
      valid: { variant: "default" as const, className: "bg-green-100 text-green-800" },
      "due-soon": { variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
      expired: { variant: "destructive" as const, className: "bg-red-100 text-red-800" },
      unknown: { variant: "outline" as const, className: "bg-gray-100 text-gray-800" },
      checking: { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" },
      error: { variant: "destructive" as const, className: "bg-red-100 text-red-800" },
    }

    const config = variants[status] || variants.unknown
    const label = status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")

    return (
      <Badge variant={config.variant} className={config.className}>
        {label}
      </Badge>
    )
  }

  const formatPhoneForTwilio = (phone: string): string => {
    if (!phone) return ""
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "")
    // Add UK country code if not present
    if (digits.startsWith("44")) return `+${digits}`
    if (digits.startsWith("0")) return `+44${digits.slice(1)}`
    return `+44${digits}`
  }

  const getCustomerName = (customer: EnrichedVehicle["customer"]): string => {
    if (typeof customer === "string") return customer
    return customer?.name || "Unknown Customer"
  }

  const getContactInfo = (vehicle: EnrichedVehicle) => {
    const phone = vehicle.phone || (typeof vehicle.customer === "object" ? vehicle.customer?.phone : "")
    const email = vehicle.email || (typeof vehicle.customer === "object" ? vehicle.customer?.email : "")
    return { phone, email }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-medium mb-4">Filters & Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Search by customer, registration, make, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="due-soon">Due Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={makeFilter} onValueChange={setMakeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {uniqueMakes.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reminderFilter} onValueChange={setReminderFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Reminders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reminders</SelectItem>
              <SelectItem value="sent">Reminder Sent</SelectItem>
              <SelectItem value="not-sent">No Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <label htmlFor="show-archived" className="text-sm font-medium">
            Show Archived
          </label>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedVehicles.length} of {filteredVehicles.length} vehicles
        </p>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Rows per page:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => {
              setRowsPerPage(Number.parseInt(value))
              setCurrentPage(1)
            }}
          >
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

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Work Due</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[100px]">Registration</TableHead>
              <TableHead className="w-[100px]">Make</TableHead>
              <TableHead className="w-[150px]">Model</TableHead>
              <TableHead className="w-[150px]">Customer</TableHead>
              <TableHead className="w-[120px]">Contact</TableHead>
              <TableHead className="w-[100px]">MOT Status</TableHead>
              <TableHead className="w-[100px]">MOT Due</TableHead>
              <TableHead className="w-[100px]">Last Invoiced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVehicles.map((vehicle) => {
              const { phone, email } = getContactInfo(vehicle)
              const customerName = getCustomerName(vehicle.customer)

              return (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono text-sm">{formatDisplayDate(vehicle.workDue)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {vehicle.archived ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-medium">{vehicle.registration}</TableCell>
                  <TableCell className="font-medium">{vehicle.make}</TableCell>
                  <TableCell>
                    {vehicle.model}
                    {vehicle.year && <span className="text-muted-foreground ml-1">({vehicle.year})</span>}
                  </TableCell>
                  <TableCell className="font-medium">{customerName}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(`tel:${formatPhoneForTwilio(phone)}`)}
                          title={`Call ${phone}`}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      {email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(`mailto:${email}`)}
                          title={`Email ${email}`}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {!phone && !email && <span className="text-muted-foreground text-xs">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(vehicle.motStatus)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDisplayDate(vehicle.motExpiryDate)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatDisplayDate(vehicle.lastInvoiced)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
