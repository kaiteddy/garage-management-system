"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Receipt, Search, Plus, Download, Send, DollarSign, Calendar, User, Car } from "lucide-react"
import { cn } from "@/lib/utils"

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  vehicleReg: string
  issueDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("in-progress")

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      const data = await response.json()

      if (data.success) {
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "paid":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "cancelled":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vehicleReg.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    if (activeTab === "in-progress") return matchesSearch && (invoice.status === "draft" || invoice.status === "sent")
    return matchesSearch && invoice.status === activeTab
  })

  const invoiceStats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    totalValue: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    paidValue: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
    outstandingValue: invoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and payments</p>
        </div>
        <Button className="transition-all duration-200 hover:scale-105">
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Invoice Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <Receipt className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-xl font-bold">{invoiceStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-600">{invoiceStats.draft}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{invoiceStats.sent}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{invoiceStats.paid}</p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xl font-bold text-red-600">{invoiceStats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">£{invoiceStats.paidValue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Paid Value</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">£{invoiceStats.outstandingValue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customer Invoices
          </CardTitle>
          <CardDescription>Manage all customer invoices and track payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="in-progress">Invoices In Progress ({invoiceStats.draft + invoiceStats.sent})</TabsTrigger>
                <TabsTrigger value="paid">Paid ({invoiceStats.paid})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({invoiceStats.overdue})</TabsTrigger>
                <TabsTrigger value="all">All ({invoiceStats.total})</TabsTrigger>
              </TabsList>

              <TabsContent value="in-progress" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No invoices in progress found matching your search." : "No invoices in progress found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, index) => (
                          <TableRow key={`in-progress-${invoice.id}-${index}`} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {invoice.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {invoice.vehicleReg}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.issueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />£
                                {invoice.totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "font-medium",
                                  invoice.paidAmount > 0 ? "text-green-600" : "text-gray-500",
                                )}
                              >
                                £{invoice.paidAmount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", getStatusColor(invoice.status))}>
                                {invoice.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {invoice.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="paid" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No paid invoices found matching your search." : "No paid invoices found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, index) => (
                          <TableRow key={`paid-${invoice.id}-${index}`} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {invoice.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {invoice.vehicleReg}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.issueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />£
                                {invoice.totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "font-medium",
                                  invoice.paidAmount > 0 ? "text-green-600" : "text-gray-500",
                                )}
                              >
                                £{invoice.paidAmount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", getStatusColor(invoice.status))}>
                                {invoice.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="overdue" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No overdue invoices found matching your search." : "No overdue invoices found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, index) => (
                          <TableRow key={`overdue-${invoice.id}-${index}`} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {invoice.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {invoice.vehicleReg}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.issueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />£
                                {invoice.totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "font-medium",
                                  invoice.paidAmount > 0 ? "text-green-600" : "text-gray-500",
                                )}
                              >
                                £{invoice.paidAmount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", getStatusColor(invoice.status))}>
                                {invoice.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No invoices found matching your search." : "No invoices found."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, index) => (
                          <TableRow key={`all-${invoice.id}-${index}`} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {invoice.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {invoice.vehicleReg}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.issueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />£
                                {invoice.totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "font-medium",
                                  invoice.paidAmount > 0 ? "text-green-600" : "text-gray-500",
                                )}
                              >
                                £{invoice.paidAmount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs", getStatusColor(invoice.status))}>
                                {invoice.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {invoice.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
