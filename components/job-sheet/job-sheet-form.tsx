"use client"

import { useState } from "react"
import { Search, Save, Printer, Mail, MoreHorizontal, Trash2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { VehicleLookupDialog } from "./vehicle-lookup-dialog"
import { AIDescriptionDialog } from "./ai-description-dialog"
import type { JobSheetData, VehicleData, CustomerData } from "@/lib/types/job-sheet"

const initialJobSheet: JobSheetData = {
  jobNumber: "90941",
  vehicle: {
    registration: "",
    make: "",
    model: "",
    derivative: "",
    chassis: "",
    engineCC: 0,
    engineCode: "",
    colour: "",
    keyCode: "",
    mileage: 0,
    fuelType: "",
    engineNumber: "",
    paintCode: "",
    radioCode: "",
    dateRegistered: "",
  },
  customer: {
    accountNumber: "",
    company: "",
    name: "",
    houseNumber: "",
    road: "",
    locality: "",
    town: "",
    county: "",
    postCode: "",
    telephone: "",
    mobile: "",
    email: "",
  },
  additionalInfo: {
    received: new Date().toISOString().split("T")[0],
    due: new Date().toISOString().split("T")[0],
    status: "",
    orderRef: "",
    department: "",
    terms: "",
    salesAdvisor: "",
    technician: "",
    roadTester: "",
  },
  extras: {
    mot: "",
    motClass: "",
    motStatus: "",
    motTester: "",
    sundries: "",
    lubricants: "",
    paintMaterials: "",
  },
  totals: {
    subTotal: 0,
    vat: 0,
    mot: 0,
    total: 0,
    excess: 0,
    receipts: 0,
    balance: 0,
  },
  history: [
    {
      date: "06/02/2025",
      docNumber: "90941",
      mileage: 0,
      description: "Check Engine",
      total: 0.0,
      type: "JS",
    },
  ],
  reminders: {
    vehicleLastInvoiced: "12/11/2024",
    customerLastInvoiced: "12/11/2024",
    referral: "EC",
    accountBalance: 1452.29,
  },
}

export function JobSheetForm() {
  const [jobSheet, setJobSheet] = useState<JobSheetData>(initialJobSheet)
  const [loading, setLoading] = useState(false)
  const [currentDescription, setCurrentDescription] = useState("")
  const { toast } = useToast()

  const handleVehicleUpdate = (field: keyof VehicleData, value: string | number) => {
    setJobSheet((prev) => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        [field]: value,
      },
    }))
  }

  const handleCustomerUpdate = (field: keyof CustomerData, value: string) => {
    setJobSheet((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value,
      },
    }))
  }

  const handleVehicleSelect = (vehicleData: any) => {
    console.log("🚗 Updating job sheet with vehicle data:", vehicleData)

    setJobSheet((prev) => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        registration: vehicleData.registration || "",
        make: vehicleData.make || "",
        model: vehicleData.model || "",
        colour: vehicleData.colour || "",
        fuelType: vehicleData.fuelType || "",
        engineCC: vehicleData.engineCC || 0,
        motStatus: vehicleData.motStatus || "",
        motExpiryDate: vehicleData.motExpiryDate || "",
      },
    }))
  }

  const handleDescriptionGenerated = (description: string) => {
    setCurrentDescription(description)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simulate save operation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Job Sheet Saved",
        description: `Job sheet ${jobSheet.jobNumber} has been saved successfully.`,
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save job sheet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    toast({
      title: "Print Job Sheet",
      description: "Preparing job sheet for printing...",
    })
  }

  const handleEmail = () => {
    toast({
      title: "Email Job Sheet",
      description: "Opening email dialog...",
    })
  }

  const handleDelete = () => {
    toast({
      title: "Delete Job Sheet",
      description: "Job sheet deletion requested.",
      variant: "destructive",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Standard Job Sheet: {jobSheet.jobNumber}</h1>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Notice
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-purple-700">
              ⚙️
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-purple-700">
              ✕
            </Button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-gray-200 p-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleEmail}>
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4 mr-1" />
              Extras
            </Button>
            <Button variant="outline" size="sm">
              Convert
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:bg-red-50 bg-transparent"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="registration">Registration</Label>
                    <Input
                      id="registration"
                      value={jobSheet.vehicle.registration}
                      onChange={(e) => handleVehicleUpdate("registration", e.target.value)}
                      placeholder="e.g. LS18 ZZA"
                    />
                  </div>
                  <VehicleLookupDialog onVehicleSelect={handleVehicleSelect}>
                    <Button variant="outline" size="sm" className="mt-6 bg-transparent">
                      <Search className="w-4 h-4" />
                    </Button>
                  </VehicleLookupDialog>
                  <div className="flex-1">
                    <Label htmlFor="accountNumber">Acc Number</Label>
                    <Input
                      id="accountNumber"
                      value={jobSheet.customer.accountNumber}
                      onChange={(e) => handleCustomerUpdate("accountNumber", e.target.value)}
                      placeholder="e.g. REN002"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="mt-6 bg-transparent">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make / Model</Label>
                    <Input
                      id="make"
                      value={`${jobSheet.vehicle.make} ${jobSheet.vehicle.model}`.trim()}
                      onChange={(e) => {
                        const [make, ...modelParts] = e.target.value.split(" ")
                        handleVehicleUpdate("make", make || "")
                        handleVehicleUpdate("model", modelParts.join(" ") || "")
                      }}
                      placeholder="e.g. Ford Focus Titanium"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={jobSheet.customer.company || ""}
                      onChange={(e) => handleCustomerUpdate("company", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="derivative">Derivative</Label>
                    <Input
                      id="derivative"
                      value={jobSheet.vehicle.derivative || ""}
                      onChange={(e) => handleVehicleUpdate("derivative", e.target.value)}
                      placeholder="Titanium"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerName">Name</Label>
                    <Input
                      id="customerName"
                      value={jobSheet.customer.name}
                      onChange={(e) => handleCustomerUpdate("name", e.target.value)}
                      placeholder="e.g. Mrs Lisa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="chassis">Chassis</Label>
                    <Input
                      id="chassis"
                      value={jobSheet.vehicle.chassis || ""}
                      onChange={(e) => handleVehicleUpdate("chassis", e.target.value)}
                      placeholder="WF05xxgcc5J118854"
                    />
                  </div>
                  <div>
                    <Label htmlFor="houseNumber">House No</Label>
                    <Input
                      id="houseNumber"
                      value={jobSheet.customer.houseNumber}
                      onChange={(e) => handleCustomerUpdate("houseNumber", e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="engineCC">Engine CC</Label>
                    <Input
                      id="engineCC"
                      type="number"
                      value={jobSheet.vehicle.engineCC || ""}
                      onChange={(e) => handleVehicleUpdate("engineCC", Number.parseInt(e.target.value) || 0)}
                      placeholder="999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="road">Road</Label>
                    <Input
                      id="road"
                      value={jobSheet.customer.road}
                      onChange={(e) => handleCustomerUpdate("road", e.target.value)}
                      placeholder="Park Crescent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select
                      value={jobSheet.vehicle.fuelType}
                      onValueChange={(value) => handleVehicleUpdate("fuelType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="locality">Locality</Label>
                    <Input
                      id="locality"
                      value={jobSheet.customer.locality || ""}
                      onChange={(e) => handleCustomerUpdate("locality", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="colour">Colour</Label>
                    <Input
                      id="colour"
                      value={jobSheet.vehicle.colour}
                      onChange={(e) => handleVehicleUpdate("colour", e.target.value)}
                      placeholder="Grey"
                    />
                  </div>
                  <div>
                    <Label htmlFor="town">Town</Label>
                    <Input
                      id="town"
                      value={jobSheet.customer.town}
                      onChange={(e) => handleCustomerUpdate("town", e.target.value)}
                      placeholder="Borehamwood"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postCode">Post Code</Label>
                    <Input
                      id="postCode"
                      value={jobSheet.customer.postCode}
                      onChange={(e) => handleCustomerUpdate("postCode", e.target.value)}
                      placeholder="WD6 3PT"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="mt-6 bg-transparent">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      value={jobSheet.customer.county}
                      onChange={(e) => handleCustomerUpdate("county", e.target.value)}
                      placeholder="Hertfordshire"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={jobSheet.customer.mobile || ""}
                      onChange={(e) => handleCustomerUpdate("mobile", e.target.value)}
                      placeholder="07956319942"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telephone">Telephone</Label>
                    <Input
                      id="telephone"
                      value={jobSheet.customer.telephone || ""}
                      onChange={(e) => handleCustomerUpdate("telephone", e.target.value)}
                      placeholder="89532873"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={jobSheet.customer.email || ""}
                      onChange={(e) => handleCustomerUpdate("email", e.target.value)}
                      placeholder="lisa@vbpconsultants.co.uk"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" size="sm">
                    ✉️
                  </Button>
                  <Button variant="outline" size="sm">
                    📧
                  </Button>
                  <Button variant="outline" size="sm">
                    💬
                  </Button>
                  <Button variant="outline" size="sm">
                    📍
                  </Button>
                  <Button variant="outline" size="sm">
                    🚚 Deliver To
                  </Button>
                  <Button variant="outline" size="sm">
                    📎
                  </Button>
                  <Button variant="outline" size="sm">
                    More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <div className="mt-6">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="labour">Labour</TabsTrigger>
                <TabsTrigger value="parts">Parts</TabsTrigger>
                <TabsTrigger value="advisories">Advisories</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Document History</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Prev Docs
                        </Button>
                        <Button variant="outline" size="sm">
                          Prev Advisors
                        </Button>
                        <Button variant="outline" size="sm">
                          Prev Labour
                        </Button>
                        <Button variant="outline" size="sm">
                          Prev Parts
                        </Button>
                        <Button variant="outline" size="sm">
                          Prev MOT
                        </Button>
                        <Button variant="outline" size="sm">
                          Prev Appt
                        </Button>
                        <Button variant="outline" size="sm">
                          🖨️
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Doc No</TableHead>
                          <TableHead>Mileage</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobSheet.history.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600">👁️</span>
                                {entry.date}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                {entry.type}
                              </Badge>
                              <span className="ml-2">{entry.docNumber}</span>
                            </TableCell>
                            <TableCell>{entry.mileage}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">{entry.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="description">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Job Description</CardTitle>
                      <AIDescriptionDialog
                        onDescriptionGenerated={handleDescriptionGenerated}
                        vehicleInfo={{
                          make: jobSheet.vehicle.make,
                          model: jobSheet.vehicle.model,
                          year: new Date().getFullYear() - 5, // Estimate based on current year
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Enter job description or use AI to generate professional descriptions..."
                      className="min-h-[200px]"
                      value={currentDescription}
                      onChange={(e) => setCurrentDescription(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="labour">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Labour Entries</CardTitle>
                      <AIDescriptionDialog
                        onDescriptionGenerated={handleDescriptionGenerated}
                        vehicleInfo={{
                          make: jobSheet.vehicle.make,
                          model: jobSheet.vehicle.model,
                          year: new Date().getFullYear() - 5,
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">
                      No labour entries yet. Click "Add Labour" or use AI Description to get started.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parts">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Parts Used</CardTitle>
                      <AIDescriptionDialog
                        onDescriptionGenerated={handleDescriptionGenerated}
                        vehicleInfo={{
                          make: jobSheet.vehicle.make,
                          model: jobSheet.vehicle.model,
                          year: new Date().getFullYear() - 5,
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">
                      No parts entries yet. Click "Add Parts" or use AI Description to get started.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advisories">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Advisories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">No advisories recorded.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">No activity recorded yet.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l p-4 space-y-6">
          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="received" className="text-xs">
                    Rec
                  </Label>
                  <div className="flex gap-1">
                    <Input id="received" type="date" value={jobSheet.additionalInfo.received} className="text-xs" />
                    <Button variant="outline" size="sm" className="px-2 bg-transparent">
                      <Calendar className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="due" className="text-xs">
                    Due
                  </Label>
                  <div className="flex gap-1">
                    <Input id="due" type="date" value={jobSheet.additionalInfo.due} className="text-xs" />
                    <Button variant="outline" size="sm" className="px-2 bg-transparent">
                      <Calendar className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select value={jobSheet.additionalInfo.status}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="orderRef" className="text-xs">
                  Order Ref
                </Label>
                <Input id="orderRef" value={jobSheet.additionalInfo.orderRef || ""} className="text-xs" />
              </div>

              <div>
                <Label htmlFor="department" className="text-xs">
                  Department
                </Label>
                <Select value={jobSheet.additionalInfo.department || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="mot">MOT</SelectItem>
                    <SelectItem value="bodyshop">Bodyshop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="terms" className="text-xs">
                  Terms
                </Label>
                <Select value={jobSheet.additionalInfo.terms || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="salesAdvisor" className="text-xs">
                  Sales Advisor
                </Label>
                <Select value={jobSheet.additionalInfo.salesAdvisor || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select advisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advisor1">John Smith</SelectItem>
                    <SelectItem value="advisor2">Jane Doe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="technician" className="text-xs">
                  Technician
                </Label>
                <Select value={jobSheet.additionalInfo.technician || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech1">Mike Johnson</SelectItem>
                    <SelectItem value="tech2">Sarah Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="roadTester" className="text-xs">
                  Road Tester
                </Label>
                <Select value={jobSheet.additionalInfo.roadTester || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select tester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tester1">Dave Brown</SelectItem>
                    <SelectItem value="tester2">Lisa Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Extras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Extras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="mot" className="text-xs">
                  MOT
                </Label>
                <Select value={jobSheet.extras.mot || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select MOT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="not-required">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="motClass" className="text-xs">
                  MOT Class
                </Label>
                <Select value={jobSheet.extras.motClass || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class4">Class 4</SelectItem>
                    <SelectItem value="class7">Class 7</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="motStatus" className="text-xs">
                  MOT Status
                </Label>
                <Select value={jobSheet.extras.motStatus || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="motTester" className="text-xs">
                  MOT Tester
                </Label>
                <Select value={jobSheet.extras.motTester || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select tester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tester1">MOT Tester 1</SelectItem>
                    <SelectItem value="tester2">MOT Tester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sundries" className="text-xs">
                  Sundries
                </Label>
                <Select value={jobSheet.extras.sundries || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select sundries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lubricants" className="text-xs">
                  Lubricants
                </Label>
                <Select value={jobSheet.extras.lubricants || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select lubricants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="synthetic">Synthetic</SelectItem>
                    <SelectItem value="mineral">Mineral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paintMaterials" className="text-xs">
                  Paint & Mat.
                </Label>
                <Select value={jobSheet.extras.paintMaterials || ""}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>SubTotal</span>
                <span>{jobSheet.totals.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT</span>
                <span>{jobSheet.totals.vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>MOT</span>
                <span>{jobSheet.totals.mot.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Total</span>
                <span>{jobSheet.totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Excess</span>
                <span>{jobSheet.totals.excess.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Receipts</span>
                <span>{jobSheet.totals.receipts.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>Balance</span>
                <span className="text-yellow-600">{jobSheet.totals.balance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center text-gray-500 text-sm">
                No Vehicle
                <br />
                Reminders
              </div>

              <Separator />

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Veh Last Invoiced</span>
                  <span>{jobSheet.reminders.vehicleLastInvoiced}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust Last Invoiced</span>
                  <span>{jobSheet.reminders.customerLastInvoiced}</span>
                </div>
                <div className="flex justify-between">
                  <span>Referral</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                    {jobSheet.reminders.referral}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-sm font-medium">
                <span>Acc Balance</span>
                <span className="text-red-600">{jobSheet.reminders.accountBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
