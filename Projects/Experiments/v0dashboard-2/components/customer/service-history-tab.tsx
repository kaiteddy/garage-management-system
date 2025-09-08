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
  Car,
  Wrench,
  Receipt,
  CreditCard,
  Package,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  Eye,
  Settings,
  Droplets,
  Shield,
  Gauge,
  Zap,
  Tool,
  Timer
} from "lucide-react"
import { cleanDisplayText, formatJobDescription } from "@/lib/text-utils"

interface ServiceHistoryTabProps {
  customerId: string
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

interface ServiceTypeInfo {
  type: 'full_service' | 'basic_service' | 'mot' | 'repair' | 'other'
  icon: React.ComponentType<any>
  color: string
  label: string
}

interface ServiceSummary {
  lastFullService?: { date: string; daysAgo: number }
  lastBasicService?: { date: string; daysAgo: number }
  lastMOT?: { date: string; daysAgo: number }
  lastRepair?: { date: string; daysAgo: number }
}

// Service type detection functions
const detectServiceType = (description: string): ServiceTypeInfo['type'] => {
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

const getServiceTypeInfo = (type: ServiceTypeInfo['type']): ServiceTypeInfo => {
  const serviceTypes: Record<ServiceTypeInfo['type'], ServiceTypeInfo> = {
    full_service: {
      type: 'full_service',
      icon: Settings,
      color: 'text-blue-600',
      label: 'Full Service'
    },
    basic_service: {
      type: 'basic_service',
      icon: Droplets,
      color: 'text-green-600',
      label: 'Basic Service'
    },
    mot: {
      type: 'mot',
      icon: Shield,
      color: 'text-purple-600',
      label: 'MOT Test'
    },
    repair: {
      type: 'repair',
      icon: Wrench,
      color: 'text-orange-600',
      label: 'Repair'
    },
    other: {
      type: 'other',
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

const generateServiceSummary = (records: ServiceRecord[]): ServiceSummary => {
  const summary: ServiceSummary = {}

  for (const record of records) {
    if (!record.date) continue

    const serviceType = detectServiceType(record.labourDescription || '')
    const daysAgo = calculateDaysAgo(record.date)

    if (daysAgo < 0) continue

    switch (serviceType) {
      case 'full_service':
        if (!summary.lastFullService || daysAgo < summary.lastFullService.daysAgo) {
          summary.lastFullService = { date: record.date, daysAgo }
        }
        break
      case 'basic_service':
        if (!summary.lastBasicService || daysAgo < summary.lastBasicService.daysAgo) {
          summary.lastBasicService = { date: record.date, daysAgo }
        }
        break
      case 'mot':
        if (!summary.lastMOT || daysAgo < summary.lastMOT.daysAgo) {
          summary.lastMOT = { date: record.date, daysAgo }
        }
        break
      case 'repair':
        if (!summary.lastRepair || daysAgo < summary.lastRepair.daysAgo) {
          summary.lastRepair = { date: record.date, daysAgo }
        }
        break
    }
  }

  return summary
}

export function ServiceHistoryTab({ customerId }: ServiceHistoryTabProps) {
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [vehicleHistory, setVehicleHistory] = useState<Record<string, ServiceRecord[]>>({})
  const [summary, setSummary] = useState<any>(null)
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary>({})
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<ServiceRecord | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchServiceHistory()
  }, [customerId])

  const fetchServiceHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/service-history`)
      const data = await response.json()

      if (data.success) {
        setServiceHistory(data.serviceHistory)
        setVehicleHistory(data.vehicleHistory)
        setSummary(data.summary)

        // Generate service type summary
        const serviceSummaryData = generateServiceSummary(data.serviceHistory)
        setServiceSummary(serviceSummaryData)
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

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return <Badge variant="default" className="bg-green-500">Paid</Badge>
    }
    if (status === '2') {
      return <Badge variant="default">Completed</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const ServiceRecordsTable = ({ records }: { records: ServiceRecord[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-xs font-medium">Date</TableHead>
            <TableHead className="text-xs font-medium">Service Type</TableHead>
            <TableHead className="text-xs font-medium">Job #</TableHead>
            <TableHead className="text-xs font-medium">Vehicle</TableHead>
            <TableHead className="text-xs font-medium">Description</TableHead>
            <TableHead className="text-xs font-medium text-right">Amount</TableHead>
            <TableHead className="text-xs font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.slice(0, 10).map((record) => {
            const serviceType = detectServiceType(record.labourDescription || '')
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
                <TableCell className="text-xs py-2">{record.vehicleRegistration}</TableCell>
                <TableCell className="text-xs py-2 max-w-xs truncate">
                  {record.labourDescription ? cleanDisplayText(record.labourDescription) : 'Service work'}
                </TableCell>
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

      {records.length > 10 && (
        <div className="bg-gray-50 px-4 py-2 text-center">
          <span className="text-xs text-gray-500">
            Showing 10 of {records.length} records
          </span>
        </div>
      )}
    </div>
  )

  const ServiceSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Full Service */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">Full Service</span>
        </div>
        {serviceSummary.lastFullService ? (
          <div>
            <p className="text-sm text-blue-700">
              {serviceSummary.lastFullService.daysAgo === 0 ? 'Today' :
               serviceSummary.lastFullService.daysAgo === 1 ? '1 day ago' :
               `${serviceSummary.lastFullService.daysAgo} days ago`}
            </p>
            <p className="text-xs text-blue-600">
              {formatDate(serviceSummary.lastFullService.date)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-blue-600">No full service recorded</p>
        )}
      </div>

      {/* Basic Service */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-900">Basic Service</span>
        </div>
        {serviceSummary.lastBasicService ? (
          <div>
            <p className="text-sm text-green-700">
              {serviceSummary.lastBasicService.daysAgo === 0 ? 'Today' :
               serviceSummary.lastBasicService.daysAgo === 1 ? '1 day ago' :
               `${serviceSummary.lastBasicService.daysAgo} days ago`}
            </p>
            <p className="text-xs text-green-600">
              {formatDate(serviceSummary.lastBasicService.date)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-green-600">No basic service recorded</p>
        )}
      </div>

      {/* MOT Test */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-900">MOT Test</span>
        </div>
        {serviceSummary.lastMOT ? (
          <div>
            <p className="text-sm text-purple-700">
              {serviceSummary.lastMOT.daysAgo === 0 ? 'Today' :
               serviceSummary.lastMOT.daysAgo === 1 ? '1 day ago' :
               `${serviceSummary.lastMOT.daysAgo} days ago`}
            </p>
            <p className="text-xs text-purple-600">
              {formatDate(serviceSummary.lastMOT.date)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-purple-600">No MOT test recorded</p>
        )}
      </div>

      {/* Repairs */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          <span className="font-medium text-orange-900">Last Repair</span>
        </div>
        {serviceSummary.lastRepair ? (
          <div>
            <p className="text-sm text-orange-700">
              {serviceSummary.lastRepair.daysAgo === 0 ? 'Today' :
               serviceSummary.lastRepair.daysAgo === 1 ? '1 day ago' :
               `${serviceSummary.lastRepair.daysAgo} days ago`}
            </p>
            <p className="text-xs text-orange-600">
              {formatDate(serviceSummary.lastRepair.date)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-orange-600">No repairs recorded</p>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Type Summary */}
      <ServiceSummaryCards />

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
                <CreditCard className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</div>
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{summary.vehicleCount}</div>
                  <div className="text-sm text-muted-foreground">Vehicles Serviced</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service History Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Services ({serviceHistory.length})</TabsTrigger>
          <TabsTrigger value="by-vehicle">By Vehicle ({Object.keys(vehicleHistory).length})</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {serviceHistory.length > 0 ? (
            <ServiceRecordsTable records={serviceHistory} />
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Service History</h3>
              <p className="text-sm text-muted-foreground">No service records found for this customer.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-vehicle" className="space-y-4">
          {Object.keys(vehicleHistory).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(vehicleHistory).map(([registration, records]) => (
                <Card key={registration}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {registration}
                      <Badge variant="outline">{records.length} service{records.length !== 1 ? 's' : ''}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ServiceRecordsTable records={records} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Vehicle History</h3>
              <p className="text-sm text-muted-foreground">No vehicle-specific service records found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {serviceHistory.slice(0, 10).length > 0 ? (
            <ServiceRecordsTable records={serviceHistory.slice(0, 10)} />
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
              <p className="text-sm text-muted-foreground">No recent service records found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Detail Modal would go here */}
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
                  <div><strong>Vehicle:</strong> {selectedDocument.vehicleRegistration}</div>
                  <div><strong>Make/Model:</strong> {selectedDocument.vehicleMake} {selectedDocument.vehicleModel}</div>
                  <div><strong>Mileage:</strong> {selectedDocument.vehicleMileage?.toLocaleString() || 'N/A'} miles</div>
                </div>
                
                {selectedDocument.labourDescription && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Work Description</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded whitespace-pre-line">{formatJobDescription(selectedDocument.labourDescription)}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Financial Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Net Amount:</span>
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
            
            {selectedDocument.lineItems.all.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Line Items ({selectedDocument.lineItems.all.length})</h3>
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
                      {selectedDocument.lineItems.all.map((item, index) => (
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
