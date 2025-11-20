"use client"

import React, { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, AlertTriangle, Clock, XCircle, ExternalLink, FileText, Car, MessageSquare, Send, Loader2 } from "lucide-react"
import { formatDisplayDate } from "@/lib/date-utils"
import { useRouter } from "next/navigation"

interface CriticalVehicle {
  id: string
  registration: string
  make?: string
  model?: string
  year?: number
  vehicleAge?: number
  sornStatus?: string
  motExpiryDate: string
  motStatus?: string
  urgency: 'expired' | 'expiring_soon'
  daysUntilExpiry: number
  customer: {
    name: string
    phone?: string
    email?: string
    address?: string
  }
  lastVisit: {
    date?: string
    amount?: number
    description?: string
  }
}

interface MOTCriticalTableProps {
  vehicles: CriticalVehicle[]
  isLoading: boolean
}

export function MOTCriticalTable({ vehicles, isLoading }: MOTCriticalTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [sendingSMS, setSendingSMS] = useState<string | null>(null)
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null)
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [communicationChannel, setCommunicationChannel] = useState<'sms' | 'whatsapp'>('whatsapp')
  const [sendingBulkSMS, setSendingBulkSMS] = useState(false)
  const [batchSize, setBatchSize] = useState<number>(5)
  const [showBatchOptions, setShowBatchOptions] = useState(false)
  const itemsPerPage = 50

  // Helper functions
  const getCustomerName = (vehicle: CriticalVehicle): string => {
    return vehicle.customer.name || "Unknown Customer"
  }

  // SMS handling functions
  const handleSendIndividualSMS = async (vehicle: CriticalVehicle) => {
    if (!vehicle.customer.phone) {
      alert('No phone number available for this customer')
      return
    }

    setSendingSMS(vehicle.id)
    try {
      const response = await fetch('/api/sms/send-individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: vehicle.customer.id || vehicle.id,
          vehicleRegistration: vehicle.registration,
          channel: 'sms'
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`SMS sent successfully to ${vehicle.customer.name} for ${vehicle.registration}`)
      } else {
        alert(`Failed to send SMS: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      alert('Failed to send SMS. Please try again.')
    } finally {
      setSendingSMS(null)
    }
  }

  const handleSendIndividualWhatsApp = async (vehicle: CriticalVehicle) => {
    if (!vehicle.customer.phone) {
      alert('No phone number available for this customer')
      return
    }

    setSendingWhatsApp(vehicle.id)
    try {
      // Generate MOT reminder message
      const urgency = vehicle.urgency === 'expired' ? 'expired' : 'critical'
      const daysText = vehicle.urgency === 'expired' ?
        `expired ${Math.abs(vehicle.daysUntilExpiry)} days ago` :
        `expires in ${vehicle.daysUntilExpiry} days`

      const message = `🚗 MOT Reminder from ELI MOTORS LTD

Dear ${vehicle.customer.name},

⚠️ Your ${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.registration}) MOT ${daysText}.

${vehicle.urgency === 'expired' ? '🚨 URGENT: Driving without valid MOT is illegal and can result in fines and penalty points!' : '🗓️ Please book your MOT test soon to avoid any issues.'}

📞 Call us to book: +447488896449
🏢 ELI MOTORS LTD - Your trusted MOT centre

Reply STOP to opt out.`

      // Queue message for verification
      const response = await fetch('/api/whatsapp/queue-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: vehicle.customer.id || vehicle.id,
          phoneNumber: vehicle.customer.phone,
          vehicleRegistration: vehicle.registration,
          messageType: 'mot_reminder',
          messageContent: message,
          fallbackToSMS: true
        })
      })

      const result = await response.json()

      if (result.success) {
        if (result.consentVerified) {
          alert(`WhatsApp message queued for verification and will be sent to ${vehicle.customer.name} for ${vehicle.registration}. Check WhatsApp Management for approval.`)
        } else {
          alert(`WhatsApp message queued but requires consent verification. Please check WhatsApp Management dashboard.`)
        }
      } else {
        alert(`Failed to queue WhatsApp message: ${result.error}`)
      }
    } catch (error) {
      console.error('Error queueing WhatsApp:', error)
      alert('Failed to queue WhatsApp message. Please try again.')
    } finally {
      setSendingWhatsApp(null)
    }
  }

  const handleBulkCommunication = async () => {
    if (selectedVehicles.length === 0) {
      alert(`Please select vehicles to send ${communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} reminders`)
      return
    }

    const selectedVehicleData = filteredVehicles.filter(v => selectedVehicles.includes(v.id))
    const customersWithPhone = selectedVehicleData.filter(v => v.customer.phone)

    if (customersWithPhone.length === 0) {
      alert('None of the selected customers have phone numbers')
      return
    }

    if (customersWithPhone.length !== selectedVehicles.length) {
      const proceed = confirm(`${selectedVehicles.length - customersWithPhone.length} customers don't have phone numbers. Continue with ${customersWithPhone.length} customers?`)
      if (!proceed) return
    }

    const channelName = communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'
    const estimatedCost = communicationChannel === 'whatsapp'
      ? (customersWithPhone.length * 0.005).toFixed(3)
      : (customersWithPhone.length * 0.04).toFixed(2)

    const proceedMessage = communicationChannel === 'whatsapp' ?
      `Queue ${customersWithPhone.length} WhatsApp messages for verification?\n\nEstimated cost: £${estimatedCost} (87.5% cheaper than SMS!)\n\nMessages will require approval in WhatsApp Management dashboard.` :
      `Send ${customersWithPhone.length} SMS messages immediately?\n\nEstimated cost: £${estimatedCost}`

    const proceed = confirm(proceedMessage)
    if (!proceed) return

    setSendingBulkSMS(true)
    try {
      // Extract unique customer IDs from selected vehicles
      const customerIds = [...new Set(customersWithPhone.map(v => v.customer.id || v.id))]

      const response = await fetch('/api/sms/send-mot-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dryRun: false,
          limit: customerIds.length,
          customerIds,
          urgencyFilter: statusFilter === 'all' ? 'all' : statusFilter === 'expired' ? 'expired' : 'critical',
          channel: communicationChannel
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`Bulk SMS campaign completed:\n- ${result.summary.messagesSent || 0} messages sent\n- ${result.summary.messagesFailed || 0} failed\n- Total cost: £${result.summary.totalCost || 0}`)
        setSelectedVehicles([]) // Clear selection
      } else {
        alert(`Failed to send bulk SMS: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending bulk SMS:', error)
      alert('Failed to send bulk SMS. Please try again.')
    } finally {
      setSendingBulkSMS(false)
    }
  }

  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev =>
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  const selectAllVisible = () => {
    const visibleIds = paginatedVehicles.map(v => v.id)
    setSelectedVehicles(prev => {
      const newSelection = [...new Set([...prev, ...visibleIds])]
      return newSelection
    })
  }

  const clearSelection = () => {
    setSelectedVehicles([])
  }

  // Batch selection functions
  const selectBatch = (size: number) => {
    const availableVehicles = paginatedVehicles.filter(v => !selectedVehicles.includes(v.id))
    const batchToSelect = availableVehicles.slice(0, size)
    const newSelection = [...selectedVehicles, ...batchToSelect.map(v => v.id)]
    setSelectedVehicles(newSelection)
  }

  const selectNextBatch = () => {
    selectBatch(batchSize)
  }

  const getContactInfo = (vehicle: CriticalVehicle) => {
    const phone = vehicle.customer.phone || ""
    const email = vehicle.customer.email || ""
    return { phone, email }
  }

  const getCustomerAddress = (vehicle: CriticalVehicle): string => {
    return vehicle.customer.address || "No address"
  }

  const getUrgencyBadge = (vehicle: CriticalVehicle) => {
    if (vehicle.urgency === 'expired') {
      const daysExpired = vehicle.daysUntilExpiry
      return {
        variant: "destructive" as const,
        icon: XCircle,
        text: `Expired ${daysExpired} days ago`,
        className: "bg-red-100 text-red-800"
      }
    } else {
      const daysUntilExpiry = vehicle.daysUntilExpiry
      return {
        variant: "secondary" as const,
        icon: AlertTriangle,
        text: `Expires in ${daysUntilExpiry} days`,
        className: "bg-yellow-100 text-yellow-800"
      }
    }
  }

  // DVLA MOT Check Link
  const openDVLAMOTCheck = (registration: string) => {
    const cleanReg = registration.replace(/\s/g, '')
    const dvlaUrl = `https://www.check-mot.service.gov.uk/results?registration=${cleanReg}&checkRecalls=true`
    window.open(dvlaUrl, '_blank')
  }

  // Vehicle Record Navigation
  const openVehicleRecord = (vehicle: CriticalVehicle) => {
    // Navigate to a vehicle detail page (you can customize this route)
    router.push(`/vehicles/${vehicle.registration}`)
  }

  // Filter and search logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(vehicle).toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "expired" && vehicle.urgency === "expired") ||
        (statusFilter === "expiring" && vehicle.urgency === "expiring_soon")

      return matchesSearch && matchesStatus
    })
  }, [vehicles, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage)
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Summary stats
  const stats = useMemo(() => {
    const expired = vehicles.filter(v => v.urgency === 'expired').length
    const expiringSoon = vehicles.filter(v => v.urgency === 'expiring_soon').length
    return { expired, expiringSoon, total: vehicles.length }
  }, [vehicles])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Vehicles requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired MOTs</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">
              Expired within 6 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Expiring within 14 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="font-['Inter','Inter_Fallback',system-ui,sans-serif]">
        <CardHeader>
          <CardTitle className="font-semibold text-lg">Critical MOT Status</CardTitle>
          <CardDescription className="font-medium text-sm">
            MOTs expired within the last 3 months or expiring in the next 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by registration, make, model, or customer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({vehicles.length})</SelectItem>
                <SelectItem value="expired">Expired ({stats.expired})</SelectItem>
                <SelectItem value="expiring">Expiring Soon ({stats.expiringSoon})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Communication Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Reminders
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                {selectedVehicles.length > 0
                  ? `${selectedVehicles.length} vehicle${selectedVehicles.length !== 1 ? 's' : ''} selected for ${communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} reminders`
                  : `Select vehicles to send MOT reminder ${communicationChannel === 'whatsapp' ? 'WhatsApp messages' : 'SMS messages'}`
                }
              </p>

              {/* Cost Calculator */}
              {selectedVehicles.length > 0 && (
                <div className="text-xs text-blue-600 mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span>Estimated cost:</span>
                    <span className="font-semibold">
                      £{(selectedVehicles.length * (communicationChannel === 'whatsapp' ? 0.005 : 0.04)).toFixed(2)}
                    </span>
                  </div>
                  {communicationChannel === 'sms' && (
                    <div className="text-xs text-gray-600 mt-1">
                      💡 WhatsApp would cost £{(selectedVehicles.length * 0.005).toFixed(2)}
                      (save £{(selectedVehicles.length * (0.04 - 0.005)).toFixed(2)})
                    </div>
                  )}
                </div>
              )}

              {/* Channel Selection */}
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  variant={communicationChannel === 'sms' ? 'default' : 'outline'}
                  onClick={() => setCommunicationChannel('sms')}
                  disabled={sendingBulkSMS}
                  className="text-xs"
                >
                  📱 SMS (£0.04/msg)
                </Button>
                <Button
                  size="sm"
                  variant={communicationChannel === 'whatsapp' ? 'default' : 'outline'}
                  onClick={() => setCommunicationChannel('whatsapp')}
                  disabled={sendingBulkSMS}
                  className="text-xs bg-green-600 hover:bg-green-700"
                >
                  💬 WhatsApp (£0.005/msg)
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAllVisible}
                  disabled={sendingBulkSMS}
                >
                  Select All Visible
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedVehicles.length === 0 || sendingBulkSMS}
                >
                  Clear Selection
                </Button>
              </div>

              {/* Batch Selection Controls */}
              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Quick Batch Selection:</span>
                  <Button
                    size="sm"
                    variant={showBatchOptions ? "default" : "outline"}
                    onClick={() => setShowBatchOptions(!showBatchOptions)}
                    disabled={sendingBulkSMS}
                    className="text-xs"
                  >
                    {showBatchOptions ? 'Hide' : 'Show'} Batch Options
                  </Button>
                </div>

                {showBatchOptions && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 15, 20, 25, 50].map(size => {
                        const availableCount = paginatedVehicles.filter(v => !selectedVehicles.includes(v.id)).length
                        const canSelect = availableCount >= size
                        return (
                          <Button
                            key={size}
                            size="sm"
                            variant="outline"
                            onClick={() => selectBatch(size)}
                            disabled={!canSelect || sendingBulkSMS}
                            className={`text-xs ${
                              canSelect
                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'
                                : 'opacity-50'
                            }`}
                            title={canSelect ? `Select next ${size} vehicles` : `Only ${availableCount} vehicles available`}
                          >
                            +{size}
                          </Button>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Custom batch size:</span>
                      <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50, 100].map(size => (
                            <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectNextBatch}
                        disabled={paginatedVehicles.filter(v => !selectedVehicles.includes(v.id)).length < batchSize || sendingBulkSMS}
                        className="text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                      >
                        Select Next {batchSize}
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500">
                      💡 Start small (5-10) to build confidence, then increase batch sizes
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <Button
                onClick={handleBulkCommunication}
                disabled={selectedVehicles.length === 0 || sendingBulkSMS}
                className={communicationChannel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {sendingBulkSMS ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending {communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {communicationChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} ({selectedVehicles.length})
                    {communicationChannel === 'whatsapp' && (
                      <span className="ml-1 text-xs opacity-90">💰87.5% cheaper!</span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedVehicles.length} of {filteredVehicles.length} vehicles
            </p>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
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

          {/* Table */}
          <div className="rounded-md border bg-white overflow-hidden font-['Inter','Inter_Fallback',system-ui,sans-serif]">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] sticky left-0 bg-white z-10">
                      <input
                        type="checkbox"
                        checked={selectedVehicles.length === paginatedVehicles.length && paginatedVehicles.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllVisible()
                          } else {
                            clearSelection()
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="min-w-[120px] sticky left-0 bg-white z-10 font-semibold text-sm">Urgency</TableHead>
                    <TableHead className="min-w-[100px] font-semibold text-sm">Registration</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell font-semibold text-sm">Make</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell font-semibold text-sm">Model</TableHead>
                    <TableHead className="min-w-[150px] font-semibold text-sm">Customer</TableHead>
                    <TableHead className="min-w-[200px] hidden lg:table-cell font-semibold text-sm">Address</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell font-semibold text-sm">Contact</TableHead>
                    <TableHead className="min-w-[100px] font-semibold text-sm">MOT Expiry</TableHead>
                    <TableHead className="min-w-[80px] hidden md:table-cell font-semibold text-sm">Days</TableHead>
                    <TableHead className="min-w-[150px] hidden lg:table-cell font-semibold text-sm">Last Visit</TableHead>
                    <TableHead className="min-w-[120px] font-semibold text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {paginatedVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== "all"
                        ? "No vehicles match your search criteria"
                        : "No critical MOT issues found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVehicles.map((vehicle) => {
                    const { phone, email } = getContactInfo(vehicle)
                    const customerName = getCustomerName(vehicle)
                    const customerAddress = getCustomerAddress(vehicle)
                    const urgencyInfo = getUrgencyBadge(vehicle)

                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell className="sticky left-0 bg-white z-10">
                          <input
                            type="checkbox"
                            checked={selectedVehicles.includes(vehicle.id)}
                            onChange={() => toggleVehicleSelection(vehicle.id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="sticky left-0 bg-white z-10">
                          <Badge
                            variant={urgencyInfo.variant}
                            className={`text-xs ${urgencyInfo.className}`}
                          >
                            <urgencyInfo.icon className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">{vehicle.urgency === 'expired' ? 'EXPIRED' : 'DUE SOON'}</span>
                            <span className="sm:hidden">{vehicle.urgency === 'expired' ? 'EXP' : 'DUE'}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <button
                              onClick={() => openVehicleRecord(vehicle)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-sm transition-colors cursor-pointer"
                              title="Click to view vehicle record and customer details"
                            >
                              {vehicle.registration}
                            </button>
                            <div className="sm:hidden text-xs text-muted-foreground font-medium">
                              {vehicle.make} {vehicle.model}
                              {vehicle.year && ` (${vehicle.year})`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-sm hidden sm:table-cell">{vehicle.make || 'Unknown'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="font-semibold text-sm">{vehicle.model || 'Unknown'}</div>
                          {vehicle.year && (
                            <span className="text-muted-foreground ml-1 text-sm font-medium">({vehicle.year})</span>
                          )}
                          {vehicle.vehicleAge && (
                            <div className="text-xs text-muted-foreground font-medium">
                              {vehicle.vehicleAge} years old
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-sm">{customerName}</div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-1 font-medium">
                              {phone && <div>📞 {phone}</div>}
                              {email && <div>✉️ {email}</div>}
                              {customerAddress && <div className="lg:hidden mt-1">{customerAddress}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell font-medium">
                          {customerAddress}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center space-x-1">
                            {phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(`tel:${phone}`, '_self')}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                            {email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => window.open(`mailto:${email}`, '_self')}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          <div>
                            <div className="font-semibold">{formatDisplayDate(vehicle.motExpiryDate)}</div>
                            <div className="md:hidden text-xs mt-1">
                              <span className={vehicle.urgency === 'expired' ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                                {vehicle.urgency === 'expired'
                                  ? `${vehicle.daysUntilExpiry} ago`
                                  : `${vehicle.daysUntilExpiry} left`
                                }
                              </span>
                            </div>
                            <div className="lg:hidden text-xs text-muted-foreground mt-1 lowercase font-medium">
                              {vehicle.lastVisit.date ? (
                                <div className="lowercase">
                                  <div>last visit: {formatDisplayDate(vehicle.lastVisit.date)}</div>
                                  {vehicle.lastVisit.amount && (
                                    <div>amount: £{vehicle.lastVisit.amount.toFixed(2)}</div>
                                  )}
                                  {vehicle.lastVisit.description && (
                                    <div className="truncate">service: {vehicle.lastVisit.description.toLowerCase()}</div>
                                  )}
                                </div>
                              ) : (
                                <div className="lowercase">no recent visits found</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={vehicle.urgency === 'expired' ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                            {vehicle.urgency === 'expired'
                              ? `${vehicle.daysUntilExpiry} ago`
                              : `${vehicle.daysUntilExpiry} left`
                            }
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {vehicle.lastVisit.date ? (
                            <div className="text-xs lowercase">
                              <div className="font-semibold text-gray-900 lowercase">
                                last visit: {formatDisplayDate(vehicle.lastVisit.date)}
                              </div>
                              {vehicle.lastVisit.amount && (
                                <div className="text-gray-600 lowercase font-medium">
                                  amount: £{vehicle.lastVisit.amount.toFixed(2)}
                                </div>
                              )}
                              {vehicle.lastVisit.description && (
                                <div className="text-gray-500 truncate max-w-[120px] lowercase font-medium" title={vehicle.lastVisit.description}>
                                  service: {vehicle.lastVisit.description.toLowerCase()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 lowercase">no recent visits found</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {phone && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                                  onClick={() => handleSendIndividualWhatsApp(vehicle)}
                                  disabled={sendingWhatsApp === vehicle.id}
                                  title={`Send MOT reminder WhatsApp to ${phone} (87.5% cheaper than SMS!)`}
                                >
                                  {sendingWhatsApp === vehicle.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                  )}
                                  WhatsApp
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700"
                                  onClick={() => handleSendIndividualSMS(vehicle)}
                                  disabled={sendingSMS === vehicle.id}
                                  title={`Send MOT reminder SMS to ${phone}`}
                                >
                                  {sendingSMS === vehicle.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                  )}
                                  SMS
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                              onClick={() => openDVLAMOTCheck(vehicle.registration)}
                              title="Check MOT history on DVLA (100% verification) - Opens official government website"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              DVLA ✓
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                              onClick={() => openVehicleRecord(vehicle)}
                              title="View complete vehicle record, service history, and customer details"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Record
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
