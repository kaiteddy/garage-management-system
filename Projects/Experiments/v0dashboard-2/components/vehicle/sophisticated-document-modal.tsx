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
  Tool
} from "lucide-react"

interface SophisticatedDocumentModalProps {
  document: any
  isOpen: boolean
  onClose: () => void
}

export function SophisticatedDocumentModal({ document, isOpen, onClose }: SophisticatedDocumentModalProps) {
  const [activeTab, setActiveTab] = useState("overview")
  
  if (!document) return null

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

  // Mock data structure similar to your invoice system
  const mockParts = [
    { id: 1, code: "BF001", description: "Brake Fluid DOT 4", quantity: 1, unitPrice: 12.50, total: 12.50 },
    { id: 2, code: "OF002", description: "Oil Filter", quantity: 1, unitPrice: 8.99, total: 8.99 },
    { id: 3, code: "EO003", description: "Engine Oil 5W-30", quantity: 4, unitPrice: 15.00, total: 60.00 }
  ]

  const mockLabour = [
    { id: 1, description: "Brake System Service", hours: 1.5, rate: 65.00, total: 97.50 },
    { id: 2, description: "Oil Change Service", hours: 0.5, rate: 65.00, total: 32.50 }
  ]

  const mockAdvisories = [
    { id: 1, severity: "advisory", description: "Tyre tread depth approaching minimum", location: "Front nearside" },
    { id: 2, severity: "minor", description: "Slight oil leak from engine", location: "Engine bay" }
  ]

  const mockActivity = [
    { id: 1, time: "09:30", user: "Tech A", action: "Started brake system inspection" },
    { id: 2, time: "10:15", user: "Tech A", action: "Replaced brake fluid" },
    { id: 3, time: "11:00", user: "Tech B", action: "Completed oil change" },
    { id: 4, time: "11:30", user: "Manager", action: "Quality check completed" }
  ]

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
                  {document.type || 'Service Record'} #{document.documentNumber || document.id || 'N/A'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(document.date || document.docDateIssued)} • {document.registration || 'Vehicle'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={document.status === 'Paid' ? 'default' : 'secondary'}>
                {document.status || 'Completed'}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

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
              <TabsTrigger value="advisories" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Advisories
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Activity
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
                              {formatCurrency(document.totalGross || document.amount || 292.97)}
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
                            <p className="text-lg font-semibold">
                              {formatDate(document.date || document.docDateIssued)}
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
                            <p className="text-lg font-semibold">
                              {document.registration || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer & Vehicle Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Customer Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm text-muted-foreground">
                            {document.customerName || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">07941109687</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Portroy</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Car className="h-5 w-5" />
                          Vehicle Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Make/Model</p>
                            <p className="text-sm text-muted-foreground">Skoda Kodiaq Se L Tsi Dsg</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Year</p>
                            <p className="text-sm text-muted-foreground">2021</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Engine</p>
                            <p className="text-sm text-muted-foreground">1498cc Petrol</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Mileage</p>
                            <p className="text-sm text-muted-foreground">13,761</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="description" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Primary Service</h4>
                        <p className="text-blue-800">
                          {document.description || "Comprehensive vehicle service including brake system inspection, oil change, and general safety checks. All work completed to manufacturer specifications."}
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">Work Completed</h4>
                        <ul className="text-green-800 space-y-1">
                          <li>• Brake fluid replacement and system flush</li>
                          <li>• Engine oil and filter change</li>
                          <li>• Visual inspection of suspension components</li>
                          <li>• Tyre pressure and tread depth check</li>
                          <li>• Battery and charging system test</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold text-yellow-900 mb-2">Recommendations</h4>
                        <p className="text-yellow-800">
                          Monitor tyre wear and consider replacement within next 6 months. 
                          Next service due in 12 months or 10,000 miles.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="labour" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Labour Charges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockLabour.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-right">{item.hours}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={3} className="font-semibold">Labour Total</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(130.00)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parts" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Parts Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockParts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell className="font-mono text-sm">{part.code}</TableCell>
                            <TableCell>{part.description}</TableCell>
                            <TableCell className="text-right">{part.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(part.unitPrice)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(part.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={4} className="font-semibold">Parts Total</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(81.49)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advisories" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Advisories & Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockAdvisories.map((advisory) => (
                        <div key={advisory.id} className={`p-4 rounded-lg border-l-4 ${
                          advisory.severity === 'advisory' ? 'bg-yellow-50 border-yellow-400' : 'bg-orange-50 border-orange-400'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                              advisory.severity === 'advisory' ? 'text-yellow-600' : 'text-orange-600'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={advisory.severity === 'advisory' ? 'secondary' : 'destructive'}>
                                  {advisory.severity.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{advisory.location}</span>
                              </div>
                              <p className="text-sm">{advisory.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockActivity.map((activity, index) => (
                        <div key={activity.id} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            {index < mockActivity.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{activity.time}</span>
                              <Badge variant="outline" className="text-xs">{activity.user}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{activity.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Document created: {formatDate(document.date || document.docDateIssued)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.open(`/vehicles/${document.registration}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Vehicle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
