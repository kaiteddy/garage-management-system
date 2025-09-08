"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FileText,
  Calendar,
  User,
  Wrench,
  Receipt,
  CreditCard,
  Package,
  Clock,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  Eye,
  TrendingUp,
  Activity,
  Settings,
  Droplets,
  Shield
} from "lucide-react"
import { cleanDisplayText, formatJobDescription } from "@/lib/text-utils"

interface VehicleServiceHistoryProps {
  registration: string
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
  customerId: string
  customerName: string
  labourDescription: string
  notes: string
  partsDescription: string
  recommendations: string
  workCarriedOut: string
  nextServiceDue: string
  lineItems: {
    all: any[]
    labour: any[]
    parts: any[]
    other: any[]
    summary: {
      labourTotal: number
      partsTotal: number
      otherTotal: number
    }
  }
  receipts: any[]
  totalPaid: number
  paymentStatus: string
}

// Service type detection functions
const detectServiceType = (description: string): 'full_service' | 'basic_service' | 'mot' | 'repair' | 'other' => {
  const desc = description.toLowerCase()

  // MOT test detection
  if (desc.includes('mot') || desc.includes('m.o.t')) {
    return 'mot'
  }

  // Full service detection
  if (desc.includes('full service') || desc.includes('major service') ||
      desc.includes('annual service') || desc.includes('comprehensive service')) {
    return 'full_service'
  }

  // Basic service detection
  if (desc.includes('basic service') || desc.includes('minor service') ||
      desc.includes('oil change') || desc.includes('interim service') ||
      desc.includes('oil and filter')) {
    return 'basic_service'
  }

  // Repair detection
  if (desc.includes('repair') || desc.includes('replace') || desc.includes('fix') ||
      desc.includes('brake') || desc.includes('clutch') || desc.includes('exhaust') ||
      desc.includes('suspension') || desc.includes('engine') || desc.includes('gearbox')) {
    return 'repair'
  }

  return 'other'
}

const getServiceTypeInfo = (type: 'full_service' | 'basic_service' | 'mot' | 'repair' | 'other') => {
  const serviceTypes = {
    full_service: {
      icon: Settings,
      color: 'text-blue-600',
      label: 'Full Service'
    },
    basic_service: {
      icon: Droplets,
      color: 'text-green-600',
      label: 'Basic Service'
    },
    mot: {
      icon: Shield,
      color: 'text-purple-600',
      label: 'MOT Test'
    },
    repair: {
      icon: Wrench,
      color: 'text-orange-600',
      label: 'Repair'
    },
    other: {
      icon: Wrench,
      color: 'text-gray-600',
      label: 'Other'
    }
  }
  return serviceTypes[type]
}

const calculateDaysAgo = (dateString: string): number => {
  if (!dateString) return -1
  const serviceDate = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - serviceDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function VehicleServiceHistory({ registration }: VehicleServiceHistoryProps) {
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [vehicleDetails, setVehicleDetails] = useState<any>(null)
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<ServiceRecord | null>(null)
  const [activeTab, setActiveTab] = useState("timeline")

  useEffect(() => {
    fetchServiceHistory()
  }, [registration])

  const fetchServiceHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/vehicles/${encodeURIComponent(registration)}/service-history`)
      const data = await response.json()

      if (data.success) {
        setServiceHistory(data.serviceHistory)
        setVehicleDetails(data.vehicle)
        setCustomerDetails(data.customer)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Error fetching service history:", error)
    } finally {
      setLoading(false)
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

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const getActualMotStatus = (status: string, expiryDate: string) => {
    if (!status || !expiryDate) return status || 'Unknown'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Override status if expired
    if (diffDays < 0) return 'Expired'
    return status
  }

  const getMotStatusVariant = (status: string, expiryDate: string) => {
    const actualStatus = getActualMotStatus(status, expiryDate)
    return actualStatus === 'Expired' ? 'destructive' : 'default'
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

  const ServiceRecordsTable = ({ records, showCustomer = false }: { records: ServiceRecord[], showCustomer?: boolean }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs font-medium">Date</TableHead>
            <TableHead className="text-xs font-medium">Type</TableHead>
            <TableHead className="text-xs font-medium">Job #</TableHead>
            <TableHead className="text-xs font-medium">Description</TableHead>
            {showCustomer && <TableHead className="text-xs font-medium">Customer</TableHead>}
            <TableHead className="text-xs font-medium text-right">Amount</TableHead>
            <TableHead className="text-xs font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records && records.slice(0, 10).map((record) => {
            const serviceType = detectServiceType(record.labourDescription || record.workCarriedOut || '')
            const serviceInfo = getServiceTypeInfo(serviceType)
            const IconComponent = serviceInfo.icon
            const daysAgo = calculateDaysAgo(record.date)

            return (
              <TableRow
                key={record.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedDocument(record)}
              >
                <TableCell className="text-xs py-2">
                  <div className="flex flex-col">
                    <span>{formatDate(record.date)}</span>
                    {daysAgo >= 0 && (
                      <span className="text-gray-500 text-xs">
                        {daysAgo === 0 ? 'Today' :
                         daysAgo === 1 ? '1 day ago' :
                         `${daysAgo} days ago`}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs py-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${serviceInfo.color}`} />
                    <div className="flex flex-col">
                      <Badge variant="outline" className="text-xs">
                        {record.type}
                      </Badge>
                      <span className="text-xs text-gray-500 mt-1">
                        {serviceInfo.label}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs py-2 font-medium">#{record.documentNumber}</TableCell>
                <TableCell className="text-xs py-2 max-w-xs truncate">
                  {record.workCarriedOut ? cleanDisplayText(record.workCarriedOut) :
                   record.labourDescription ? cleanDisplayText(record.labourDescription) :
                   'Service work'}
                </TableCell>
                {showCustomer && (
                  <TableCell className="text-xs py-2">{record.customerName || 'N/A'}</TableCell>
                )}
                <TableCell className="text-xs py-2 text-right font-medium">
                  {formatCurrency(record.amount)}
                </TableCell>
                <TableCell className="text-xs py-2">
                  {getStatusBadge(record.status, record.paymentStatus)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {records && records.length > 10 && (
        <div className="bg-gray-50 px-4 py-2 text-center">
          <span className="text-xs text-gray-500">
            Showing 10 of {records?.length || 0} records
          </span>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Vehicle & Customer Info */}
      {(vehicleDetails || customerDetails) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Registration:</strong> {vehicleDetails.registration}</div>
                  <div><strong>Make/Model:</strong> {vehicleDetails.make} {vehicleDetails.model}</div>
                  <div><strong>Year:</strong> {vehicleDetails.year || 'N/A'}</div>
                  <div><strong>MOT Expiry:</strong> {vehicleDetails.mot_expiry_date ? formatDate(vehicleDetails.mot_expiry_date) : 'N/A'}</div>
                  <div><strong>MOT Status:</strong>
                    <Badge variant={getMotStatusVariant(vehicleDetails.mot_status, vehicleDetails.mot_expiry_date)} className="ml-2">
                      {getActualMotStatus(vehicleDetails.mot_status, vehicleDetails.mot_expiry_date)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {customerDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {customerDetails.first_name} {customerDetails.last_name}</div>
                  {customerDetails.company_name && (
                    <div><strong>Company:</strong> {customerDetails.company_name}</div>
                  )}
                  {customerDetails.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {customerDetails.phone}
                    </div>
                  )}
                  {customerDetails.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {customerDetails.email}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.totalDocuments}</div>
                  <div className="text-sm text-muted-foreground">Total Services</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.averageJobValue)}</div>
                  <div className="text-sm text-muted-foreground">Average Job</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {summary.averageServiceInterval ? `${summary.averageServiceInterval}d` : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Interval</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service History Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline ({serviceHistory?.length || 0})</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {serviceHistory && serviceHistory.length > 0 ? (
            <ServiceRecordsTable records={serviceHistory} showCustomer={true} />
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Service History</h3>
              <p className="text-sm text-muted-foreground">No service records found for this vehicle.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Invoices:</span>
                      <span className="font-medium">{summary.serviceTypes.invoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quotes:</span>
                      <span className="font-medium">{summary.serviceTypes.quotes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other:</span>
                      <span className="font-medium">{summary.serviceTypes.other}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span className="font-medium text-green-600">{summary.paymentStatus.paid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unpaid:</span>
                      <span className="font-medium text-red-600">{summary.paymentStatus.unpaid}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Outstanding:</span>
                      <span className="font-medium">{formatCurrency(summary.outstandingBalance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>Maintenance scheduling coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceHistory && serviceHistory.filter(record => record.recommendations).length > 0 ? (
                  <div className="space-y-3">
                    {serviceHistory
                      .filter(record => record.recommendations)
                      .slice(0, 3)
                      .map((record) => (
                        <div key={record.id} className="p-3 bg-yellow-50 rounded">
                          <div className="text-sm font-medium">{formatDate(record.date)}</div>
                          <div className="text-sm">{record.recommendations}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>No recommendations found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {selectedDocument.type} #{selectedDocument.documentNumber}
              </h2>
              <Button variant="ghost" onClick={() => setSelectedDocument(null)}>
                ×
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Service Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Date:</strong> {formatDate(selectedDocument.date)}</div>
                  <div><strong>Customer:</strong> {selectedDocument.customerName}</div>
                  <div><strong>Mileage:</strong> {selectedDocument.vehicleMileage?.toLocaleString() || 'N/A'} miles</div>
                </div>

                {selectedDocument.workCarriedOut && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Work Carried Out</h4>
                    <p className="text-sm bg-green-50 p-3 rounded whitespace-pre-line">{formatJobDescription(selectedDocument.workCarriedOut)}</p>
                  </div>
                )}

                {selectedDocument.recommendations && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <p className="text-sm bg-yellow-50 p-3 rounded">{selectedDocument.recommendations}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Financial Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Labour:</span>
                    <span>{formatCurrency(selectedDocument.lineItems.summary.labourTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parts:</span>
                    <span>{formatCurrency(selectedDocument.lineItems.summary.partsTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other:</span>
                    <span>{formatCurrency(selectedDocument.lineItems.summary.otherTotal)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Net:</span>
                    <span>{formatCurrency(selectedDocument.totalNet)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedDocument.totalTax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedDocument.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className="text-green-600">{formatCurrency(selectedDocument.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding:</span>
                    <span className={selectedDocument.amount - selectedDocument.totalPaid > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(selectedDocument.amount - selectedDocument.totalPaid)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedDocument?.lineItems?.all && selectedDocument.lineItems.all.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Line Items ({selectedDocument?.lineItems?.all?.length || 0})</h3>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Qty</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDocument?.lineItems?.all?.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.description}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">{formatCurrency(parseFloat(item.unit_price || '0'))}</td>
                          <td className="text-right p-2">{formatCurrency(parseFloat(item.total_price || '0'))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
