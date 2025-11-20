"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  Eye
} from "lucide-react"

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

export function ServiceHistoryTab({ customerId }: ServiceHistoryTabProps) {
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([])
  const [vehicleHistory, setVehicleHistory] = useState<Record<string, ServiceRecord[]>>({})
  const [summary, setSummary] = useState<any>(null)
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

  const ServiceRecordCard = ({ record }: { record: ServiceRecord }) => (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
      onClick={() => setSelectedDocument(record)}
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
          <Button variant="ghost" size="sm">
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
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
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {serviceHistory.map((record) => (
                  <ServiceRecordCard key={record.id} record={record} />
                ))}
              </div>
            </ScrollArea>
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
                    <div className="space-y-3">
                      {records.map((record) => (
                        <ServiceRecordCard key={record.id} record={record} />
                      ))}
                    </div>
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
            <div className="space-y-4">
              {serviceHistory.slice(0, 10).map((record) => (
                <ServiceRecordCard key={record.id} record={record} />
              ))}
            </div>
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
                    <p className="text-sm bg-gray-50 p-3 rounded">{selectedDocument.labourDescription}</p>
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
