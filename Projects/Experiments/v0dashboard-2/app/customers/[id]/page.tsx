"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Phone, Mail, MapPin, Car, Calendar, FileText, DollarSign, User, AlertTriangle, Eye, Wrench, Receipt, CreditCard } from "lucide-react"
import { ServiceHistoryTab } from "@/components/customer/service-history-tab"

interface CustomerData {
  _ID: string
  accountNumber?: string
  nameTitle?: string
  nameForename?: string
  nameSurname?: string
  nameCompany?: string
  contactTelephone?: string
  contactMobile?: string
  contactEmail?: string
  address?: {
    houseNo?: string
    road?: string
    locality?: string
    town?: string
    county?: string
    postCode?: string
  }
  lastInvoiceDate?: string
  notes?: string
  vehicles?: any[]
  appointments?: any[]
  documents?: any[]
  vehicleCount?: number
  totalJobs?: number
  totalSpent?: number
}

interface ServiceRecord {
  id: number
  documentNumber: string
  date: string
  type: string
  amount: number
  totalNet: number
  totalTax: number
  status: string
  vehicleRegistration: string
  vehicleMake: string
  vehicleModel: string
  vehicleMileage: number
  customerName: string
  labourDescription: string
  notes: string
  partsDescription: string
  recommendations: string
  lineItems: {
    all: any[]
    labour: any[]
    parts: any[]
    other: any[]
  }
  receipts: any[]
  totalPaid: number
  paymentStatus: string
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [vehicleHistory, setVehicleHistory] = useState<Record<string, ServiceRecord[]>>({})
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    loadCustomer()
  }, [])

  useEffect(() => {
    if (customer) {
      loadServiceHistory()
    }
  }, [customer])

  const loadCustomer = async () => {
    try {
      setLoading(true)
      setError(null)
      const resolvedParams = await params
      const response = await fetch(`/api/customers/${resolvedParams.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError("Customer not found")
        } else {
          setError("Failed to load customer")
        }
        return
      }

      const customerData = await response.json()
      setCustomer(customerData)
    } catch (err) {
      console.error("Error loading customer:", err)
      setError("Failed to load customer data")
    } finally {
      setLoading(false)
    }
  }

  const loadServiceHistory = async () => {
    try {
      setHistoryLoading(true)
      const resolvedParams = await params
      const response = await fetch(`/api/customers/${resolvedParams.id}/service-history`)
      const data = await response.json()

      if (data.success) {
        setServiceHistory(data.serviceHistory || [])
        setVehicleHistory(data.vehicleHistory || {})
      }
    } catch (error) {
      console.error("Error loading service history:", error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const getCustomerName = () => {
    if (!customer) return "Unknown Customer"

    if (customer.companyName || customer.nameCompany) {
      return customer.companyName || customer.nameCompany
    }

    const parts = [
      customer.title || customer.nameTitle,
      customer.forename || customer.nameForename,
      customer.surname || customer.nameSurname
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(" ") : "Unnamed Customer"
  }

  const formatMOTDate = (motExpiry: string | null) => {
    if (!motExpiry) return "No MOT Data"

    const motDate = new Date(motExpiry)
    const today = new Date()
    const isExpired = motDate < today

    return {
      date: motDate.toLocaleDateString('en-GB'),
      isExpired,
      daysUntilExpiry: Math.ceil((motDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  const getFullAddress = () => {
    if (!customer) return null

    const parts = [
      customer.addressHouseNo || customer.address?.houseNo,
      customer.addressRoad || customer.address?.road,
      customer.addressLocality || customer.address?.locality,
      customer.addressTown || customer.address?.town,
      customer.addressCounty || customer.address?.county,
      customer.addressPostCode || customer.address?.postCode,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(", ") : null
  }

  const isValidEmail = (email: string) => {
    if (!email) return false
    // Check for fake/test emails
    const fakePatterns = [
      /noemail/i,
      /test@/i,
      /fake@/i,
      /example@/i,
      /dummy@/i,
      /@test\./i,
      /@fake\./i,
      /@example\./i
    ]
    return !fakePatterns.some(pattern => pattern.test(email)) && email.includes('@') && email.includes('.')
  }

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return <Badge variant="default" className="bg-green-500">Paid</Badge>
    }
    if (status === '2') {
      return <Badge variant="default">Completed</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const getFilteredServiceHistory = () => {
    if (!selectedVehicle) return serviceHistory
    return vehicleHistory[selectedVehicle] || []
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="text-lg">Loading customer details...</div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="text-lg text-red-600">{error || "Customer not found"}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{getCustomerName()}</h1>
            {customer.accountNumber && <p className="text-muted-foreground">Account #{customer.accountNumber}</p>}
          </div>
        </div>
        <Button onClick={() => router.push(`/customers/${params.id}/edit`)}>Edit Customer</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{(customer.totalSpent || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.totalJobs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.vehicleCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MOT Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(() => {
              const motStatuses = customer.vehicles?.map(vehicle => {
                const motInfo = formatMOTDate(vehicle.motExpiry || vehicle.motexpiry)
                return typeof motInfo === 'string' ? 'unknown' : motInfo.isExpired ? 'expired' : motInfo.daysUntilExpiry <= 30 ? 'due' : 'valid'
              }) || []

              const expired = motStatuses.filter(s => s === 'expired').length
              const due = motStatuses.filter(s => s === 'due').length
              const valid = motStatuses.filter(s => s === 'valid').length

              if (expired > 0) {
                return (
                  <div className="text-2xl font-bold text-red-600">
                    {expired} Expired
                  </div>
                )
              } else if (due > 0) {
                return (
                  <div className="text-2xl font-bold text-orange-600">
                    {due} Due Soon
                  </div>
                )
              } else {
                return (
                  <div className="text-2xl font-bold text-green-600">
                    All Valid
                  </div>
                )
              }
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.contactTelephone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="break-all">{customer.contactTelephone}</span>
              </div>
            )}
            {customer.contactMobile && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="break-all">{customer.contactMobile}</span>
              </div>
            )}
            {customer.contactEmail && isValidEmail(customer.contactEmail) && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="break-all text-sm">{customer.contactEmail}</span>
              </div>
            )}
            {getFullAddress() && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm break-words">{getFullAddress()}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Customer Vehicles ({customer.vehicles?.length || 0})
              </CardTitle>
              <CardDescription>Click on a vehicle to view its service history</CardDescription>
            </CardHeader>
            <CardContent>
              {customer.vehicles && customer.vehicles.length > 0 ? (
                <div className="grid gap-3">
                  {/* All Vehicles Option */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedVehicle === null
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVehicle(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">All Vehicles</div>
                        <div className="text-sm text-muted-foreground">
                          View complete service history for all vehicles
                        </div>
                      </div>
                      <Badge variant="outline">{serviceHistory.length} services</Badge>
                    </div>
                  </div>

                  {/* Individual Vehicles */}
                  {customer.vehicles.map((vehicle, index) => {
                    const motInfo = formatMOTDate(vehicle.motExpiry || vehicle.motexpiry)
                    const isString = typeof motInfo === 'string'
                    const vehicleServices = vehicleHistory[vehicle.registration] || []

                    return (
                      <div
                        key={vehicle._ID || index}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedVehicle === vehicle.registration
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedVehicle(vehicle.registration)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{vehicle.registration || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">
                              {`${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              MOT: {isString ? motInfo : motInfo.date}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{vehicleServices.length} services</Badge>
                            {isString ? (
                              <Badge variant="secondary">No MOT Data</Badge>
                            ) : motInfo.isExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : motInfo.daysUntilExpiry <= 30 ? (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">Due Soon</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500">Valid</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No vehicles registered to this customer
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service History Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
                {selectedVehicle && (
                  <Badge variant="outline">for {selectedVehicle}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedVehicle
                  ? `Complete service history for ${selectedVehicle}`
                  : "Complete service history for all vehicles"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading service history...</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {getFilteredServiceHistory().length > 0 ? (
                      getFilteredServiceHistory().map((record) => (
                        <Card
                          key={record.id}
                          className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {record.type} #{record.documentNumber}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(record.date)} • {record.vehicleRegistration}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatCurrency(record.amount)}</div>
                                {getStatusBadge(record.status, record.paymentStatus)}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Vehicle:</span>
                                <div className="font-medium">
                                  {record.vehicleMake} {record.vehicleModel}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Mileage:</span>
                                <div className="font-medium">
                                  {record.vehicleMileage ? `${record.vehicleMileage.toLocaleString()} miles` : 'N/A'}
                                </div>
                              </div>
                            </div>

                            {record.labourDescription && (
                              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                <strong>Work:</strong> {record.labourDescription}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span>{record.lineItems.all.length} items</span>
                                {record.receipts.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {record.receipts.length} payment{record.receipts.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Net: {formatCurrency(record.totalNet)}</span>
                                <span>Tax: {formatCurrency(record.totalTax)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Service History</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedVehicle
                            ? `No service records found for ${selectedVehicle}.`
                            : "No service records found for this customer."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
