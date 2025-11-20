"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCircle, Car, FileText, Calendar, Clock, DollarSign, Download, Loader2 } from "lucide-react"

interface CustomerData {
  name: string
  email: string
  phone: string
  address: string
  vehicles: Array<{
    id: string
    registration: string
    make: string
    model: string
    year: string
    motExpiry: string
    lastService: string
    nextService: string
  }>
  appointments: Array<{
    id: string
    date: string
    time: string
    vehicle: string
    service: string
    status: string
  }>
  invoices: Array<{
    id: string
    number: string
    date: string
    vehicle: string
    description: string
    amount: number
    status: string
  }>
}

export default function PortalPage() {
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCustomerData()
  }, [])

  const loadCustomerData = async () => {
    try {
      setLoading(true)
      setError(null)

      // In a real application, this would fetch from an API
      // For now, we'll show empty state since no mock data

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Set empty data - no mock data
      setCustomerData({
        name: "",
        email: "",
        phone: "",
        address: "",
        vehicles: [],
        appointments: [],
        invoices: [],
      })
    } catch (err) {
      setError("Failed to load customer data")
      console.error("Error loading customer data:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMotStatus = (motExpiry: string) => {
    if (!motExpiry) return { status: "unknown", color: "bg-gray-100 text-gray-600" }

    const expiryDate = new Date(motExpiry)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { status: "expired", color: "bg-red-100 text-red-800" }
    if (diffDays <= 30) return { status: "expiring soon", color: "bg-orange-100 text-orange-800" }
    return { status: "valid", color: "bg-green-100 text-green-800" }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 text-gray-400 mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Customer Portal</h3>
            <p className="text-gray-600">Please wait while we load your information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadCustomerData}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Customer Data</h2>
          <p className="text-muted-foreground">No customer data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Portal</h1>
          <p className="text-muted-foreground">Customer self-service portal for account management</p>
        </div>
      </div>

      {/* Customer Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {customerData.name || "Welcome"}
          </CardTitle>
          <CardDescription>Manage your vehicles, appointments, and service history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Car className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{customerData.vehicles.length}</p>
              <p className="text-sm text-muted-foreground">Vehicles</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{customerData.appointments.length}</p>
              <p className="text-sm text-muted-foreground">Appointments</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{customerData.invoices.length}</p>
              <p className="text-sm text-muted-foreground">Invoices</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">
                £{customerData.invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vehicles">My Vehicles</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                My Vehicles
              </CardTitle>
              <CardDescription>View your registered vehicles and their service status</CardDescription>
            </CardHeader>
            <CardContent>
              {customerData.vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vehicles Registered</h3>
                  <p className="text-gray-600 mb-4">You don't have any vehicles registered yet.</p>
                  <Button>Register Vehicle</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerData.vehicles.map((vehicle) => {
                    const motStatus = getMotStatus(vehicle.motExpiry)
                    return (
                      <div
                        key={vehicle.id}
                        className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Car className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{vehicle.registration}</h3>
                              <p className="text-sm text-muted-foreground">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                            </div>
                          </div>
                          <Badge className={motStatus.color}>{motStatus.status.toUpperCase()}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium">MOT Expiry</p>
                            <p className="text-muted-foreground">{new Date(vehicle.motExpiry).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="font-medium">Last Service</p>
                            <p className="text-muted-foreground">
                              {new Date(vehicle.lastService).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Next Service Due</p>
                            <p className="text-muted-foreground">
                              {new Date(vehicle.nextService).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="transition-all duration-200 hover:scale-105 bg-transparent"
                          >
                            Book Service
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="transition-all duration-200 hover:scale-105 bg-transparent"
                          >
                            View History
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Appointments
              </CardTitle>
              <CardDescription>View and manage your service appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {customerData.appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Scheduled</h3>
                  <p className="text-gray-600 mb-4">You don't have any appointments scheduled.</p>
                  <Button>Book Appointment</Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerData.appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{new Date(appointment.date).toLocaleDateString()}</p>
                                <p className="text-sm text-muted-foreground">{appointment.time}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appointment.vehicle}</TableCell>
                          <TableCell>{appointment.service}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {appointment.status === "confirmed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  Reschedule
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Invoices
              </CardTitle>
              <CardDescription>View and download your service invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {customerData.invoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Available</h3>
                  <p className="text-gray-600">You don't have any invoices yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerData.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.number}</TableCell>
                          <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.vehicle}</TableCell>
                          <TableCell>{invoice.description}</TableCell>
                          <TableCell>£{invoice.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(invoice.status)}>{invoice.status.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="transition-all duration-200 hover:scale-105 bg-transparent"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                My Profile
              </CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={customerData.name} readOnly placeholder="No name available" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <Input value={customerData.email} readOnly placeholder="No email available" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input value={customerData.phone} readOnly placeholder="No phone available" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input value={customerData.address} readOnly placeholder="No address available" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="transition-all duration-200 hover:scale-105">Edit Profile</Button>
                  <Button variant="outline" className="transition-all duration-200 hover:scale-105 bg-transparent">
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
