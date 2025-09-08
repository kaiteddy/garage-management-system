"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, User, Car, FileText } from "lucide-react"
import { toast } from "sonner"

interface VehicleData {
  registration: string
  make: string
  model: string
  year: string
  color: string
  mot_expiry_date: string
  owner_id: string
  customer_id: string
  current_owner: {
    name: string
    phone: string
    email: string
  } | null
}

interface Document {
  doc_number: string
  doc_type: string
  date: string
  customer_name: string
  linked_customer: {
    name: string
    phone: string
  } | null
}

interface PotentialCustomer {
  id: string
  name: string
  phone: string
  email: string
  document_count: number
}

interface VehicleStatus {
  vehicle: VehicleData
  documents: Document[]
  potential_customers: PotentialCustomer[]
  diagnosis: {
    has_owner: boolean
    has_documents: boolean
    has_potential_customers: boolean
    recommended_action: string
  }
}

export default function FixVehicleOwnerPage() {
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    postcode: ""
  })

  useEffect(() => {
    loadVehicleStatus()
  }, [])

  const loadVehicleStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/check-vehicle-ln64xfg')
      const data = await response.json()
      
      if (data.success) {
        setVehicleStatus(data)
      } else {
        toast.error(`Error: ${data.error}`)
      }
    } catch (error) {
      toast.error("Failed to load vehicle status")
    } finally {
      setLoading(false)
    }
  }

  const linkToExistingCustomer = async (customerId: string) => {
    try {
      setFixing(true)
      const response = await fetch('/api/vehicles/fix-owner-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration: "LN64XFG",
          customerId: customerId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success("Vehicle linked to customer successfully!")
        loadVehicleStatus()
      } else {
        toast.error(`Failed to link vehicle: ${result.error}`)
      }
    } catch (error) {
      toast.error("Error linking vehicle to customer")
    } finally {
      setFixing(false)
    }
  }

  const createNewCustomer = async () => {
    try {
      setFixing(true)
      const response = await fetch('/api/vehicles/fix-owner-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration: "LN64XFG",
          customerInfo: customerInfo
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success("New customer created and linked to vehicle!")
        loadVehicleStatus()
        setCustomerInfo({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          address: "",
          postcode: ""
        })
      } else {
        toast.error(`Failed to create customer: ${result.error}`)
      }
    } catch (error) {
      toast.error("Error creating new customer")
    } finally {
      setFixing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading vehicle status...</span>
        </div>
      </div>
    )
  }

  if (!vehicleStatus) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Vehicle Not Found</CardTitle>
            <CardDescription>
              Vehicle LN64XFG was not found in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>The vehicle needs to be imported or added to the database first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fix Vehicle Owner Connection</h2>
          <p className="text-muted-foreground">
            Vehicle: LN64XFG - Connecting ownership information
          </p>
        </div>
        <Button onClick={loadVehicleStatus} variant="outline">
          Refresh Status
        </Button>
      </div>

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Registration</Label>
              <p className="text-lg font-bold">{vehicleStatus.vehicle.registration}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Make & Model</Label>
              <p className="text-lg">{vehicleStatus.vehicle.make} {vehicleStatus.vehicle.model}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Year</Label>
              <p>{vehicleStatus.vehicle.year || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Color</Label>
              <p>{vehicleStatus.vehicle.color || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">MOT Expiry</Label>
              <p>{vehicleStatus.vehicle.mot_expiry_date || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Owner Status</Label>
              <Badge variant={vehicleStatus.diagnosis.has_owner ? "default" : "destructive"}>
                {vehicleStatus.diagnosis.has_owner ? "Has Owner" : "No Owner"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Owner */}
      {vehicleStatus.vehicle.current_owner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Current Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p>{vehicleStatus.vehicle.current_owner.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p>{vehicleStatus.vehicle.current_owner.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p>{vehicleStatus.vehicle.current_owner.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {vehicleStatus.diagnosis.has_owner ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span>Has Owner: {vehicleStatus.diagnosis.has_owner ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              {vehicleStatus.diagnosis.has_documents ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span>Has Documents: {vehicleStatus.diagnosis.has_documents ? "Yes" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              {vehicleStatus.diagnosis.has_potential_customers ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span>Has Potential Customers: {vehicleStatus.diagnosis.has_potential_customers ? "Yes" : "No"}</span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="font-medium">Recommended Action:</p>
              <p>{vehicleStatus.diagnosis.recommended_action}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Potential Customers */}
      {vehicleStatus.potential_customers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Potential Customers
            </CardTitle>
            <CardDescription>
              Customers found in documents for this vehicle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicleStatus.potential_customers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <Badge variant="outline">{customer.document_count} documents</Badge>
                  </div>
                  <Button 
                    onClick={() => linkToExistingCustomer(customer.id)}
                    disabled={fixing}
                  >
                    Link to Vehicle
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Customer */}
      {!vehicleStatus.diagnosis.has_owner && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Customer</CardTitle>
            <CardDescription>
              If no existing customer matches, create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={customerInfo.postcode}
                  onChange={(e) => setCustomerInfo({...customerInfo, postcode: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={createNewCustomer}
                disabled={fixing || !customerInfo.firstName || !customerInfo.lastName}
                className="w-full"
              >
                {fixing ? "Creating..." : "Create Customer & Link to Vehicle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {vehicleStatus.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehicleStatus.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{doc.doc_number} - {doc.doc_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.date} - {doc.customer_name}
                    </p>
                    {doc.linked_customer && (
                      <p className="text-sm text-green-600">
                        Linked: {doc.linked_customer.name} ({doc.linked_customer.phone})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
