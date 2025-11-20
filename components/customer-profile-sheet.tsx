"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Phone, Mail, MapPin, Calendar, Car, FileText, AlertTriangle, Plus } from "lucide-react"
import { formatDisplayDate } from "@/lib/date-utils"
import type { Customer, Vehicle, Document, ReceiptType } from "@/lib/database/types"

interface CustomerProfileSheetProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CustomerData {
  customer: Customer
  vehicles: Vehicle[]
  documents: Document[]
  receipts: ReceiptType[]
  totalSpent: number
  totalJobs: number
  lastVisit: string | null
}

export function CustomerProfileSheet({ customer, open, onOpenChange }: CustomerProfileSheetProps) {
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer || !open) {
      setCustomerData(null)
      return
    }

    loadCustomerData(customer)
  }, [customer, open])

  const loadCustomerData = async (customer: Customer) => {
    setLoading(true)
    setError(null)

    try {
      console.log("Loading customer data for:", customer.nameForename, customer.nameSurname)

      // Fetch connected data from the API
      const response = await fetch(`/api/customers/${customer._ID}`, {
        headers: { "Cache-Control": "no-cache" },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch customer data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Customer data loaded:", data)

      // Calculate totals from real data
      const totalSpent =
        data.receipts?.reduce((sum: number, receipt: ReceiptType) => {
          return sum + (Number.parseFloat(receipt.TotalReceipt) || 0)
        }, 0) || 0

      const totalJobs = data.documents?.length || 0

      const lastVisit = data.documents?.length > 0 ? data.documents[0].Date || null : null

      setCustomerData({
        customer,
        vehicles: data.vehicles || [],
        documents: data.documents || [],
        receipts: data.receipts || [],
        totalSpent,
        totalJobs,
        lastVisit,
      })
    } catch (err) {
      console.error("Error loading customer data:", err)
      setError(err instanceof Error ? err.message : "Failed to load customer data")

      // Fallback to basic customer data
      setCustomerData({
        customer,
        vehicles: [],
        documents: [],
        receipts: [],
        totalSpent: 0,
        totalJobs: 0,
        lastVisit: null,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {customer.nameTitle} {customer.nameForename} {customer.nameSurname}
          </SheetTitle>
          <SheetDescription>Customer Account: {customer.AccountNumber}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading customer data...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-destructive">Error: {error}</div>
            </div>
          ) : customerData ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles ({customerData.vehicles.length})</TabsTrigger>
                <TabsTrigger value="history">History ({customerData.documents.length})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({customerData.receipts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Customer Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">£{customerData.totalSpent.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{customerData.totalJobs}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.contactTelephone || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.contactEmail || "Not provided"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <div>
                          {customer.addressHouseNo} {customer.addressRoad}
                        </div>
                        <div>
                          {customer.addressTown}, {customer.addressCounty}
                        </div>
                        <div>{customer.addressPostCode}</div>
                      </div>
                    </div>
                    {customerData.lastVisit && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Last visit: {formatDisplayDate(customerData.lastVisit)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Classification:</span>
                      <Badge variant="secondary">{customer.classification}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Credit Terms:</span>
                      <span className="text-sm">{customer.AccountCreditTerms} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Regular Customer:</span>
                      <Badge variant={customer.regularCustomer === "1" ? "default" : "secondary"}>
                        {customer.regularCustomer === "1" ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vehicles" className="space-y-4">
                {customerData.vehicles.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {customerData.vehicles.map((vehicle) => (
                        <Card key={vehicle._ID}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Car className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{vehicle.Registration}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {vehicle.Make} {vehicle.Model}
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Vehicles</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This customer doesn't have any vehicles registered yet.
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {customerData.documents.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {customerData.documents.map((doc) => (
                        <Card key={doc._ID}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{doc.Type || "Service"}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDisplayDate(doc.Date)} • £{doc.TotalGROSS || "0.00"}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline">{doc.Status || "Completed"}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Service History</h3>
                    <p className="text-sm text-muted-foreground mb-4">No service records found for this customer.</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job Sheet
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invoices" className="space-y-4">
                {customerData.receipts.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {customerData.receipts.map((receipt) => (
                        <Card key={receipt._ID}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">£{receipt.TotalReceipt}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDisplayDate(receipt.Date)} • {receipt.Method}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={receipt.Reconciled === "1" ? "default" : "secondary"}>
                                {receipt.Reconciled === "1" ? "Reconciled" : "Pending"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Invoices</h3>
                    <p className="text-sm text-muted-foreground mb-4">No payment records found for this customer.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
