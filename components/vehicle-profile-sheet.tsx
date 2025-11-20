"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Car, Calendar, AlertTriangle, FileText, User, Wrench, Plus, ExternalLink } from "lucide-react"
import { formatDisplayDate, getMotStatus, daysBetween } from "@/lib/date-utils"
import type { Vehicle, Customer, Document, Reminder } from "@/lib/database/types"

interface VehicleProfileSheetProps {
  vehicle: Vehicle | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface VehicleData {
  vehicle: Vehicle
  customer: Customer | null
  documents: Document[]
  reminders: Reminder[]
  motStatus: "valid" | "expired" | "due_soon" | "unknown"
  motDaysRemaining: number
}

export function VehicleProfileSheet({ vehicle, open, onOpenChange }: VehicleProfileSheetProps) {
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicle || !open) {
      setVehicleData(null)
      return
    }

    loadVehicleData(vehicle)
  }, [vehicle, open])

  const loadVehicleData = async (vehicle: Vehicle) => {
    setLoading(true)
    setError(null)

    try {
      console.log("Loading vehicle data for:", vehicle.Registration)

      // Fetch connected data from the API
      const response = await fetch(`/api/vehicle-details?registration=${vehicle.Registration}`, {
        headers: { "Cache-Control": "no-cache" },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Vehicle data loaded:", data)

      // Calculate MOT status
      const motExpiryDate = vehicle.status_LastInvoiceDate // This should be MOT expiry from your data
      const motStatus = getMotStatus(motExpiryDate)
      const motDaysRemaining = motExpiryDate ? daysBetween(new Date(), motExpiryDate) : 0

      setVehicleData({
        vehicle,
        customer: data.customer || null,
        documents: data.documents || [],
        reminders: data.reminders || [],
        motStatus,
        motDaysRemaining,
      })
    } catch (err) {
      console.error("Error loading vehicle data:", err)
      setError(err instanceof Error ? err.message : "Failed to load vehicle data")

      // Fallback to basic vehicle data
      const motStatus = getMotStatus(vehicle.status_LastInvoiceDate)
      const motDaysRemaining = vehicle.status_LastInvoiceDate
        ? daysBetween(new Date(), vehicle.status_LastInvoiceDate)
        : 0

      setVehicleData({
        vehicle,
        customer: null,
        documents: [],
        reminders: [],
        motStatus,
        motDaysRemaining,
      })
    } finally {
      setLoading(false)
    }
  }

  const getMotStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-100 text-green-800">Valid</Badge>
      case "due_soon":
        return <Badge className="bg-yellow-100 text-yellow-800">Due Soon</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (!vehicle) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {vehicle.Registration}
          </SheetTitle>
          <SheetDescription>
            {vehicle.Make} {vehicle.Model} • {vehicle.FuelType}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading vehicle data...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-destructive">Error: {error}</div>
            </div>
          ) : vehicleData ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="jobs">Jobs ({vehicleData.documents.length})</TabsTrigger>
                <TabsTrigger value="history">Service History</TabsTrigger>
                <TabsTrigger value="reminders">Reminders ({vehicleData.reminders.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* MOT Status */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      MOT Status
                    </CardTitle>
                    <Button variant="outline" size="sm">
                      View MOT History
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {getMotStatusBadge(vehicleData.motStatus)}
                      {vehicleData.motDaysRemaining > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {vehicleData.motDaysRemaining} days remaining
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vehicle Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Make:</span>
                        <div className="font-medium">{vehicle.Make}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <div className="font-medium">{vehicle.Model}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Year:</span>
                        <div className="font-medium">{formatDisplayDate(vehicle.DateofReg)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fuel Type:</span>
                        <div className="font-medium">{vehicle.FuelType}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Engine Size:</span>
                        <div className="font-medium">{vehicle.EngineCC}cc</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Colour:</span>
                        <div className="font-medium">{vehicle.Colour}</div>
                      </div>
                    </div>

                    {vehicle.VIN && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-sm">VIN:</span>
                        <div className="font-mono text-sm">{vehicle.VIN}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                {vehicleData.customer && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {vehicleData.customer.nameTitle} {vehicleData.customer.nameForename}{" "}
                            {vehicleData.customer.nameSurname}
                          </div>
                          <div className="text-sm text-muted-foreground">{vehicleData.customer.contactTelephone}</div>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Customer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="jobs" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Work History</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                  </Button>
                </div>

                {vehicleData.documents.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {vehicleData.documents.map((doc) => (
                        <Card key={doc._ID}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Wrench className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{doc.Type || "Service"}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDisplayDate(doc.Date)} • £{doc.TotalGROSS || "0.00"}
                                  </div>
                                  {doc.Description && (
                                    <div className="text-sm text-muted-foreground mt-1">{doc.Description}</div>
                                  )}
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
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Work History</h3>
                    <p className="text-sm text-muted-foreground mb-4">No service records found for this vehicle.</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job Sheet
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Service History</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Detailed service history will appear here once connected to your job sheet data.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="reminders" className="space-y-4">
                {vehicleData.reminders.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {vehicleData.reminders.map((reminder) => (
                        <Card key={reminder._ID}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">Service Reminder</div>
                                  <div className="text-sm text-muted-foreground">
                                    Due: {formatDisplayDate(reminder.DueDate)}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={reminder.actioned_Email === "1" ? "default" : "secondary"}>
                                {reminder.actioned_Email === "1" ? "Sent" : "Pending"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Reminders</h3>
                    <p className="text-sm text-muted-foreground mb-4">No active reminders for this vehicle.</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Set Reminder
                    </Button>
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
