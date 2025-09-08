"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Calendar, 
  Receipt, 
  FileText, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Download,
  ExternalLink,
  Car,
  Settings,
  Activity,
  Package,
  Tool,
  Loader2
} from "lucide-react"
import { useDocumentDetails } from "@/hooks/use-document-details"

interface RealDocumentModalProps {
  documentId: string | null
  isOpen: boolean
  onClose: () => void
}

export function RealDocumentModal({ documentId, isOpen, onClose }: RealDocumentModalProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const { documentDetails, loading, error } = useDocumentDetails(documentId)
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | string) => {
    if (!amount) return '£0.00'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `£${num.toFixed(2)}`
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {loading ? (
                    <Skeleton className="h-6 w-48" />
                  ) : error ? (
                    "Error Loading Document"
                  ) : (
                    `${documentDetails?.type || 'Service Record'} #${documentDetails?.documentNumber || 'N/A'}`
                  )}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : error ? (
                    "Unable to load document details"
                  ) : (
                    `${formatDate(documentDetails?.date || '')} • ${documentDetails?.vehicle?.registration || 'Vehicle'}`
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={documentDetails?.status === '2' ? 'default' : 'secondary'}>
                {loading ? <Skeleton className="h-4 w-12" /> : (documentDetails?.status === '2' ? 'Paid' : 'Issued')}
              </Badge>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        {error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Document</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Document Details</h3>
              <p className="text-muted-foreground">Please wait while we fetch the document information...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="description" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Description
                </TabsTrigger>
                <TabsTrigger value="labour" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Labour
                </TabsTrigger>
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts
                </TabsTrigger>
                <TabsTrigger value="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="vehicle" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full overflow-y-auto">
                  <div className="space-y-6">
                    {/* Document Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(documentDetails?.totalGross || 0)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Service Date</p>
                              <p className="text-2xl font-bold">
                                {formatDate(documentDetails?.date || '')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Car className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Vehicle</p>
                              <p className="text-lg font-bold">
                                {documentDetails?.vehicle?.registration || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Customer Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Customer Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{documentDetails?.customer?.name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium">{documentDetails?.customer?.phone || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{documentDetails?.customer?.email || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">
                                  {documentDetails?.customer?.address?.line1 ? (
                                    <>
                                      {documentDetails.customer.address.line1}
                                      {documentDetails.customer.address.line2 && `, ${documentDetails.customer.address.line2}`}
                                      <br />
                                      {documentDetails.customer.address.city} {documentDetails.customer.address.postcode}
                                    </>
                                  ) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vehicle Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Car className="h-5 w-5" />
                          Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Make/Model</p>
                            <p className="font-medium">
                              {documentDetails?.vehicle?.make} {documentDetails?.vehicle?.model}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Year</p>
                            <p className="font-medium">{documentDetails?.vehicle?.year || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Engine</p>
                            <p className="font-medium">
                              {documentDetails?.vehicle?.engineSize}cc {documentDetails?.vehicle?.fuelType}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="description" className="h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Service Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {documentDetails?.serviceDetails?.labourDescription ? (
                        <div className="space-y-4">
                          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                            <h4 className="font-semibold text-green-800 mb-2">Work Completed</h4>
                            <p className="text-green-700 whitespace-pre-wrap">
                              {documentDetails.serviceDetails.labourDescription}
                            </p>
                          </div>
                          {documentDetails.serviceDetails.notes && (
                            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                              <h4 className="font-semibold text-blue-800 mb-2">Additional Notes</h4>
                              <p className="text-blue-700 whitespace-pre-wrap">
                                {documentDetails.serviceDetails.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No service description available for this document.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="labour" className="h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Labour Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentDetails?.lineItems?.filter(item => item.type === 'Labour').map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="parts" className="h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Parts & Materials
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentDetails?.lineItems?.filter(item => item.type === 'Parts').map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="customer" className="h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                              <p className="text-lg font-semibold">{documentDetails?.customer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                              <p className="text-lg">{documentDetails?.customer?.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                              <p className="text-lg">{documentDetails?.customer?.email || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Address</label>
                              <div className="text-lg">
                                {documentDetails?.customer?.address?.line1 ? (
                                  <>
                                    <p>{documentDetails.customer.address.line1}</p>
                                    {documentDetails.customer.address.line2 && <p>{documentDetails.customer.address.line2}</p>}
                                    <p>{documentDetails.customer.address.city} {documentDetails.customer.address.postcode}</p>
                                  </>
                                ) : (
                                  <p>N/A</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vehicle" className="h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Vehicle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Registration</label>
                            <p className="text-lg font-semibold">{documentDetails?.vehicle?.registration || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Make & Model</label>
                            <p className="text-lg">{documentDetails?.vehicle?.make} {documentDetails?.vehicle?.model}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Year</label>
                            <p className="text-lg">{documentDetails?.vehicle?.year || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Engine Size</label>
                            <p className="text-lg">{documentDetails?.vehicle?.engineSize}cc</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Fuel Type</label>
                            <p className="text-lg">{documentDetails?.vehicle?.fuelType || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">MOT Expiry</label>
                            <p className="text-lg">{formatDate(documentDetails?.vehicle?.motExpiry || '')}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        <div className="border-t pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Document created: {formatDate(documentDetails?.date || '')}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.open(`/vehicles/${documentDetails?.vehicle?.registration}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Vehicle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
