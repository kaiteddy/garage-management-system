"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Car, Phone, Mail, Calendar, RefreshCw, Loader2, Eye, User, Edit } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { MOTDetailsSheet } from "./mot-details-sheet"
import { VehicleProfileSheet } from "../vehicle-profile-sheet"
import { CustomerProfileSheet } from "../customer-profile-sheet"
import { RegistrationEditDialog } from "../registration-edit-dialog"
import { formatDisplayDate, getMOTStatus } from "@/lib/date-utils"

// Import shared types
import type { Vehicle } from "@/types/vehicle"

interface VehicleTableProps {
  vehicles?: Vehicle[]
  loading?: boolean
}

export function VehicleTable({ vehicles: propVehicles, loading: propLoading }: VehicleTableProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [motSheetOpen, setMotSheetOpen] = useState(false)
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false)
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false)
  const [editVehicleOpen, setEditVehicleOpen] = useState(false)

  const loadVehicles = async () => {
    try {
      setLoading(true)
      console.log("🔄 Loading vehicles data...")

      const response = await fetch("/api/v2/data", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Vehicles data loaded:", data.vehicles?.length || 0, "vehicles")

        if (data.success) {
          // Apply MOT status calculation to all vehicles
          const vehiclesWithStatus = (data.vehicles || []).map((vehicle: any) => ({
            ...vehicle,
            motStatus: getMOTStatus(vehicle.motExpiry),
          }))

          setVehicles(vehiclesWithStatus)
        } else {
          console.error("❌ API returned error:", data.error)
          setVehicles([])
        }
      } else {
        console.error("❌ Failed to fetch vehicles:", response.statusText)
        setVehicles([])
      }
    } catch (error) {
      console.error("❌ Error loading vehicles:", error)
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propVehicles) {
      // Apply correct MOT status calculation to prop vehicles
      const vehiclesWithCorrectStatus = propVehicles.map((vehicle) => ({
        ...vehicle,
        motStatus: getMOTStatus(vehicle.motExpiry),
      }))
      setVehicles(vehiclesWithCorrectStatus)
      setLoading(propLoading || false)
    } else {
      loadVehicles()
    }
  }, [propVehicles, propLoading])

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered")
    setRefreshing(true)
    await loadVehicles()
    setRefreshing(false)

    toast({
      title: "Data Refreshed",
      description: `Loaded ${vehicles.length} vehicles`,
    })
  }

  // ✅ TEST: View Vehicle Button (Eye Icon)
  const handleViewVehicle = (vehicle: Vehicle) => {
    console.log("✅ VIEW VEHICLE CLICKED:", vehicle.registration)
    setSelectedVehicle(vehicle)
    setVehicleSheetOpen(true)
  }

  // ✅ TEST: Edit Vehicle Button (Edit Icon)
  const handleEditVehicle = (vehicle: Vehicle) => {
    console.log("✅ EDIT VEHICLE CLICKED:", vehicle.registration)
    setSelectedVehicle(vehicle)
    setEditVehicleOpen(true)
  }

  // ✅ TEST: View Customer Button (User Icon)
  const handleViewCustomer = (vehicle: Vehicle) => {
    if (vehicle.customer) {
      console.log("✅ VIEW CUSTOMER CLICKED:", vehicle.customer.name)
      setSelectedCustomer({
        id: vehicle.customer.id,
        name: vehicle.customer.name,
        phone: vehicle.customer.phone,
        email: vehicle.customer.email,
        address: vehicle.customer.address,
        vehicles: [
          {
            registration: vehicle.registration,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            motStatus: vehicle.motStatus,
            motExpiry: vehicle.motExpiry || undefined,
          },
        ],
      })
      setCustomerSheetOpen(true)
    } else {
      console.log("❌ NO CUSTOMER DATA AVAILABLE")
      toast({
        title: "No Customer Data",
        description: "No customer information available for this vehicle",
        variant: "destructive",
      })
    }
  }

  // MOT Details Button - Fetches fresh MOT data when opening the sheet
  const handleMOTDetails = async (vehicle: Vehicle) => {
    console.log("🔍 Fetching fresh MOT data for:", vehicle.registration)
    setSelectedVehicle(vehicle)

    try {
      // Fetch fresh MOT data
      const response = await fetch(`/api/mot?registration=${vehicle.registration}&refresh=true`)
      if (response.ok) {
        const motData = await response.json()
        if (motData.success && motData.motTests?.[0]?.expiryDate) {
          const updatedVehicle = {
            ...vehicle,
            motExpiry: motData.motTests[0].expiryDate,
            motStatus: getMOTStatus(motData.motTests[0].expiryDate),
          }

          // Update the vehicle in the list
          setVehicles((prevVehicles) =>
            prevVehicles.map((v) => (v.registration === vehicle.registration ? updatedVehicle : v)),
          )
          setSelectedVehicle(updatedVehicle)

          toast({
            title: "MOT Data Updated",
            description: `Fresh MOT data loaded for ${vehicle.registration}`,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch MOT data:", error)
      toast({
        title: "Error",
        description: "Could not fetch MOT data. Please try again.",
        variant: "destructive",
      })
    }

    setMotSheetOpen(true)
  }

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getMotStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "destructive"
      case "due-soon":
        return "secondary"
      case "valid":
        return "default"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="mx-auto h-16 w-16 text-gray-400 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Vehicle Data</h3>
          <p className="text-gray-600">Please wait while we load your vehicle information...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Database ({vehicles.length} vehicles)
              </CardTitle>
              <CardDescription>
                Complete overview of all vehicles with live MOT data and customer details
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by registration, make, model, or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>MOT Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {vehicles.length === 0 ? (
                          <div>
                            <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vehicle Data</h3>
                            <p className="text-gray-600 mb-4">No vehicles found. Upload your data to get started.</p>
                            <Button onClick={() => (window.location.href = "/import")}>Import Vehicle Data</Button>
                          </div>
                        ) : searchTerm ? (
                          "No vehicles found matching your search."
                        ) : (
                          "No vehicles to display."
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-mono font-medium">{vehicle.registration}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.year} • {vehicle.colour} • {vehicle.fuelType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => handleViewCustomer(vehicle)}
                          >
                            {vehicle.customer?.name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {vehicle.customer?.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{vehicle.customer.phone}</span>
                              </div>
                            )}
                            {vehicle.customer?.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{vehicle.customer.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={getMotStatusColor(vehicle.motStatus)}>{vehicle.motStatus}</Badge>
                            {vehicle.motExpiry && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDisplayDate(vehicle.motExpiry)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* Action Buttons */}
                            <div className="flex gap-1">
                              {/* MOT Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleMOTDetails(vehicle)
                                }}
                                title="View MOT Details"
                                className="hover:bg-blue-50"
                              >
                                MOT
                              </Button>

                              {/* View Vehicle Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleViewVehicle(vehicle)
                                }}
                                title="View Vehicle Profile"
                                className="hover:bg-green-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Edit Vehicle Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEditVehicle(vehicle)
                                }}
                                title="Edit Vehicle"
                                className="hover:bg-yellow-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {/* View Customer Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleViewCustomer(vehicle)
                                }}
                                title="View Customer Profile"
                                className="hover:bg-purple-50"
                                disabled={!vehicle.customer}
                              >
                                <User className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ MOT Details Sheet */}
      <MOTDetailsSheet vehicle={selectedVehicle} open={motSheetOpen} onOpenChange={setMotSheetOpen} />

      {/* Vehicle Profile Sheet */}
      <VehicleProfileSheet vehicle={selectedVehicle} open={vehicleSheetOpen} onOpenChange={setVehicleSheetOpen} />

      {/* Customer Profile Sheet */}
      {selectedCustomer && (
        <CustomerProfileSheet
          customer={{
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email,
            vehicles: selectedCustomer.vehicles || [],
          }}
          open={customerSheetOpen}
          onOpenChange={setCustomerSheetOpen}
        />
      )}

      {/* ✅ Vehicle Edit Dialog */}
      <RegistrationEditDialog
        vehicle={selectedVehicle}
        open={editVehicleOpen}
        onOpenChange={setEditVehicleOpen}
        onSave={(updatedVehicle) => {
          console.log("✅ VEHICLE SAVED:", updatedVehicle)
          setEditVehicleOpen(false)
          handleRefresh()
        }}
      />
    </>
  )
}
