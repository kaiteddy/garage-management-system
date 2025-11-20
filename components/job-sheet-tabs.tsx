"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Users, AlertTriangle, Car, FileText, TrendingUp, Calendar, Phone, Mail } from "lucide-react"
import type { CustomerData, MOTReminder, VehicleData, DocumentData } from "@/lib/job-sheet-parser"

interface JobSheetTabsProps {
  customers: CustomerData[]
  motReminders: MOTReminder[]
  vehicles: VehicleData[]
  documents: DocumentData[]
}

export function JobSheetTabs({ customers, motReminders, vehicles, documents }: JobSheetTabsProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filterData = <T extends { registration?: string; name?: string; docNo?: string }>(
    data: T[],
    searchTerm: string,
  ): T[] => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter(
      (item) =>
        item.registration?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        item.docNo?.toLowerCase().includes(term),
    )
  }

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("/")
      if (parts.length === 3) {
        const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "destructive"
      case "MEDIUM":
        return "default"
      case "LOW":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Calculate summary statistics
  const totalCustomers = customers.length
  const totalVehicles = vehicles.length
  const totalDocuments = documents.length
  const highPriorityMOTs = motReminders.filter((r) => r.priority === "HIGH").length
  const totalValue = documents.reduce((sum, doc) => sum + doc.total, 0)
  const completedJobs = documents.filter((doc) => doc.status === "COMPLETED").length

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6" />
            Job Sheet Data Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of job sheets, customer data, and vehicle service history
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicles</p>
                <p className="text-xl font-bold">{totalVehicles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">High Priority</p>
                <p className="text-xl font-bold">{highPriorityMOTs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Documents</p>
                <p className="text-xl font-bold">{totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{completedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all data (customers, vehicles, registrations, documents)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers ({filterData(customers, searchTerm).length})
          </TabsTrigger>
          <TabsTrigger value="mot-reminders" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            MOT Reminders ({filterData(motReminders, searchTerm).length})
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicles ({filterData(vehicles, searchTerm).length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({filterData(documents, searchTerm).length})
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analysis</CardTitle>
              <CardDescription>
                Customers grouped by registration patterns with multiple vehicles or significant service history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicles</TableHead>
                      <TableHead>Total Jobs</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Avg Job Value</TableHead>
                      <TableHead>Last Service</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterData(customers, searchTerm).map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {customer.registrations.slice(0, 3).map((reg) => (
                              <Badge key={reg} variant="outline" className="text-xs">
                                {reg}
                              </Badge>
                            ))}
                            {customer.registrations.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{customer.registrations.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.totalJobs}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatCurrency(customer.totalValue)}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(customer.averageJobValue)}</TableCell>
                        <TableCell>{formatDate(customer.lastJobDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOT Reminders Tab */}
        <TabsContent value="mot-reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MOT Reminders</CardTitle>
              <CardDescription>Vehicles that may need MOT attention based on service history analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Days Since Last Job</TableHead>
                      <TableHead>Last Service</TableHead>
                      <TableHead>Estimated MOT Due</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterData(motReminders, searchTerm).map((reminder, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono font-medium">{reminder.registration}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(reminder.priority)}>{reminder.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              reminder.daysSinceLastJob > 330
                                ? "text-red-600 font-semibold"
                                : reminder.daysSinceLastJob > 270
                                  ? "text-orange-600"
                                  : ""
                            }
                          >
                            {reminder.daysSinceLastJob} days
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(reminder.lastJobDate)}</TableCell>
                        <TableCell>{formatDate(reminder.estimatedMOTDue)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs">{reminder.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Performance</CardTitle>
              <CardDescription>
                Individual vehicle statistics including job count, total value, and service history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Job Count</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Average Job Value</TableHead>
                      <TableHead>First Job</TableHead>
                      <TableHead>Last Job</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterData(vehicles, searchTerm)
                      .slice(0, 100)
                      .map((vehicle, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono font-medium">{vehicle.registration}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{vehicle.jobCount}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{formatCurrency(vehicle.totalValue)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(vehicle.averageJobValue)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(vehicle.firstJobDate)}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(vehicle.lastJobDate)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {vehicles.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Showing first 100 vehicles of {vehicles.length} total. Use search to find specific vehicles.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document History</CardTitle>
              <CardDescription>Complete chronological list of all job sheets and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterData(documents, searchTerm)
                      .slice(0, 200)
                      .map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{doc.docNo}</TableCell>
                          <TableCell>
                            <Badge variant={doc.type === "JOB_SHEET" ? "default" : "secondary"}>
                              {doc.type === "JOB_SHEET" ? "Job Sheet" : "Invoice"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(doc.date)}</TableCell>
                          <TableCell className="font-mono">{doc.registration}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(doc.total)}</TableCell>
                          <TableCell>
                            <Badge variant={doc.status === "COMPLETED" ? "default" : "outline"}>{doc.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {documents.length > 200 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Showing first 200 documents of {documents.length} total. Use search to find specific documents.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
