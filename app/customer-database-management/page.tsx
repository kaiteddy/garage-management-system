"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Phone,
  Mail,
  Car,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  MessageSquare,
  Database,
  Trash2,
  UserX,
  ArrowLeft,
  Settings
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface CleanupData {
  soldVehicles: any[]
  optedOutCustomers: any[]
  duplicateCustomers: any[]
  customersWithoutVehicles: any[]
  abandonedVehicles: any[]
}

interface Statistics {
  soldVehiclesCount: number
  optedOutCustomersCount: number
  duplicateCustomersCount: number
  customersWithoutVehiclesCount: number
  abandonedVehiclesCount: number
  inactive_vehicles: number
  sold_vehicles: number
  opted_out_customers: number
  long_expired_mots: number
  total_customers: number
  total_vehicles: number
}

interface EmailCleanupData {
  emailsCleaned: number
  invalidEmails: any[]
  duplicateEmails: any[]
  verifiableCustomers: any[]
  customersNeedingVerification: any[]
  tokensGenerated: number
}

interface CustomerResponses {
  responses: any[]
  statistics: {
    total_responses: number
    sold_responses: number
    opt_out_responses: number
    update_requests: number
    processed_responses: number
    pending_responses: number
  }
}

interface ContactUpdates {
  contactUpdates: any[]
  newEmailCustomers: any[]
  statistics: {
    total_updates: number
    emails_added: number
    phones_updated: number
    from_sms: number
    verified_updates: number
    pending_verification: number
    qualityImprovements: {
      customers_with_email: number
      email_coverage_percent: number
      phone_coverage_percent: number
    }
  }
}

interface ContactCampaign {
  campaign: any
  messages: any
  statistics: any
  targeting: any
  expectedOutcomes: any
}

export default function CustomerDatabaseManagementPage() {
  const [cleanupData, setCleanupData] = useState<CleanupData | null>(null)
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [emailCleanupData, setEmailCleanupData] = useState<EmailCleanupData | null>(null)
  const [customerResponses, setCustomerResponses] = useState<CustomerResponses | null>(null)
  const [contactUpdates, setContactUpdates] = useState<ContactUpdates | null>(null)
  const [contactCampaign, setContactCampaign] = useState<ContactCampaign | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const loadCleanupData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/database/cleanup-sold-vehicles", {
        method: "POST"
      })
      const data = await response.json()

      if (data.success) {
        setCleanupData(data.cleanup)
        setStatistics(data.statistics)
      } else {
        toast.error("Failed to load cleanup data")
      }
    } catch (error) {
      toast.error("Error loading cleanup data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadEmailCleanup = async () => {
    try {
      const response = await fetch("/api/email/cleanup-verification", {
        method: "POST"
      })
      const data = await response.json()

      if (data.success) {
        setEmailCleanupData(data.cleanup)
        toast.success(`Email cleanup completed: ${data.cleanup.emailsCleaned} emails cleaned`)
      }
    } catch (error) {
      toast.error("Error during email cleanup")
    }
  }

  const loadCustomerResponses = async () => {
    try {
      const response = await fetch("/api/customer-responses")
      const data = await response.json()

      if (data.success) {
        setCustomerResponses(data)
      }
    } catch (error) {
      toast.error("Error loading customer responses")
    }
  }

  const loadContactUpdates = async () => {
    try {
      const response = await fetch("/api/contact-updates")
      const data = await response.json()

      if (data.success) {
        setContactUpdates(data)
      }
    } catch (error) {
      toast.error("Error loading contact updates")
    }
  }

  const loadContactCampaign = async () => {
    try {
      const response = await fetch("/api/sms/contact-update-campaign", {
        method: "POST"
      })
      const data = await response.json()

      if (data.success) {
        setContactCampaign(data)
        toast.success(`Contact update campaign prepared: ${data.statistics.totalMessages} messages ready`)
      }
    } catch (error) {
      toast.error("Error preparing contact campaign")
    }
  }

  const processCleanupAction = async (action: string, items: any[]) => {
    try {
      const response = await fetch("/api/database/cleanup-sold-vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, items })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`${data.processed} items processed successfully`)
        loadCleanupData() // Refresh data
      } else {
        toast.error("Failed to process cleanup action")
      }
    } catch (error) {
      toast.error("Error processing cleanup action")
    }
  }

  useEffect(() => {
    loadCleanupData()
    loadCustomerResponses()
    loadContactUpdates()
  }, [])

  const getHealthScore = () => {
    if (!statistics) return 0

    const totalIssues = statistics.soldVehiclesCount +
                       statistics.optedOutCustomersCount +
                       statistics.duplicateCustomersCount +
                       statistics.customersWithoutVehiclesCount +
                       statistics.abandonedVehiclesCount

    const healthScore = Math.max(0, 100 - (totalIssues / statistics.total_customers * 100))
    return Math.round(healthScore)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Customer Database Management</h1>
            <p className="text-muted-foreground">
              Clean up sold vehicles, manage customer responses, and maintain data quality
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadCleanupData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Database Health Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Database Health</p>
                  <div className="flex items-center gap-2">
                    <Progress value={getHealthScore()} className="w-16" />
                    <span className="text-lg font-bold">{getHealthScore()}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{statistics.total_customers.toLocaleString()}</p>
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
                  <p className="text-sm text-muted-foreground">Total Vehicles</p>
                  <p className="text-2xl font-bold">{statistics.total_vehicles.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issues Found</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statistics.soldVehiclesCount + statistics.duplicateCustomersCount + statistics.abandonedVehiclesCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sold-vehicles">Sold Vehicles</TabsTrigger>
          <TabsTrigger value="customer-responses">Responses</TabsTrigger>
          <TabsTrigger value="contact-updates">Contact Updates</TabsTrigger>
          <TabsTrigger value="email-cleanup">Email Cleanup</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sold Vehicles Card */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-orange-600" />
                  Sold Vehicles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Reported as sold:</span>
                    <Badge variant="secondary">{statistics?.soldVehiclesCount || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Marked inactive:</span>
                    <Badge variant="outline">{statistics?.inactive_vehicles || 0}</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setActiveTab("sold-vehicles")}
                  >
                    Review Sold Vehicles
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Responses Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Customer Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total responses:</span>
                    <Badge variant="secondary">{customerResponses?.statistics.total_responses || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending review:</span>
                    <Badge variant="destructive">{customerResponses?.statistics.pending_responses || 0}</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setActiveTab("customer-responses")}
                  >
                    Review Responses
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Updates Card */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  Contact Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Emails added:</span>
                    <Badge variant="default">{contactUpdates?.statistics.emails_added || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Email coverage:</span>
                    <Badge variant="outline">{contactUpdates?.statistics.qualityImprovements.email_coverage_percent || 0}%</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => setActiveTab("contact-updates")}
                  >
                    View Contact Updates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common database maintenance tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={loadContactCampaign} className="h-auto p-4 flex-col">
                  <MessageSquare className="h-6 w-6 mb-2" />
                  <span className="font-medium">Contact Update Campaign</span>
                  <span className="text-xs text-muted-foreground">Collect customer emails via SMS</span>
                </Button>

                <Button onClick={loadEmailCleanup} className="h-auto p-4 flex-col" variant="outline">
                  <Mail className="h-6 w-6 mb-2" />
                  <span className="font-medium">Clean Email Addresses</span>
                  <span className="text-xs text-muted-foreground">Format and validate emails</span>
                </Button>

                <Link href="/test-sms-response">
                  <Button variant="outline" className="h-auto p-4 flex-col w-full">
                    <Settings className="h-6 w-6 mb-2" />
                    <span className="font-medium">Test SMS Responses</span>
                    <span className="text-xs text-muted-foreground">Demo response processing</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sold-vehicles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicles Reported as Sold</CardTitle>
              <CardDescription>
                Customers have indicated they no longer own these vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cleanupData?.soldVehicles && cleanupData.soldVehicles.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Registration</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Previous Owner</TableHead>
                        <TableHead>Reported Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanupData.soldVehicles.map((vehicle, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{vehicle.vehicle_registration}</TableCell>
                          <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                          <TableCell>{vehicle.first_name} {vehicle.last_name}</TableCell>
                          <TableCell>{new Date(vehicle.change_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processCleanupAction('mark_vehicles_inactive', [vehicle.vehicle_registration])}
                            >
                              Mark Inactive
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => processCleanupAction(
                        'mark_vehicles_inactive',
                        cleanupData.soldVehicles.map(v => v.vehicle_registration)
                      )}
                    >
                      Mark All as Inactive
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sold vehicles to review</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-updates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Emails Added</p>
                    <p className="text-2xl font-bold text-green-600">
                      {contactUpdates?.statistics.emails_added || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phones Updated</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {contactUpdates?.statistics.phones_updated || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Coverage</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {contactUpdates?.statistics.qualityImprovements.email_coverage_percent || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Contact Updates</CardTitle>
                <CardDescription>
                  Customers who have provided updated contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contactUpdates ? (
                  <div className="space-y-4">
                    {contactUpdates.contactUpdates.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Update Type</TableHead>
                            <TableHead>New Value</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contactUpdates.contactUpdates.slice(0, 10).map((update, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {update.first_name} {update.last_name}
                                <div className="text-xs text-muted-foreground">{update.phone}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {update.update_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{update.new_value}</TableCell>
                              <TableCell>
                                <Badge variant={update.source === 'sms_response' ? 'default' : 'secondary'}>
                                  {update.source}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(update.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No contact updates yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button onClick={loadContactUpdates}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Contact Updates
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Update Campaign</CardTitle>
                <CardDescription>
                  Encourage customers to provide email addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contactCampaign ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {contactCampaign.statistics.totalMessages}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Messages</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {contactCampaign.expectedOutcomes.estimatedEmailAddresses}
                        </p>
                        <p className="text-sm text-muted-foreground">Expected Emails</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Email Collection Messages:</span>
                        <Badge>{contactCampaign.messages.emailCollection.length}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Verification Messages:</span>
                        <Badge variant="outline">{contactCampaign.messages.contactVerification.length}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Estimated Cost:</span>
                        <span className="font-medium">£{contactCampaign.statistics.estimatedCost}</span>
                      </div>
                    </div>

                    <Button className="w-full" disabled>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Campaign (Demo)
                    </Button>
                  </div>
                ) : (
                  <Button onClick={loadContactCampaign}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Prepare Campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customer-responses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Customer Responses</CardTitle>
              <CardDescription>
                SMS and email responses from customers about their vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerResponses?.responses && customerResponses.responses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerResponses.responses.slice(0, 10).map((response, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {response.first_name} {response.last_name}
                          <div className="text-xs text-muted-foreground">{response.phone}</div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{response.message}</TableCell>
                        <TableCell>
                          <Badge variant={
                            response.response_type === 'sold' ? 'destructive' :
                            response.response_type === 'opt_out' ? 'secondary' :
                            'outline'
                          }>
                            {response.response_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{response.vehicle_registration}</TableCell>
                        <TableCell>{new Date(response.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {response.processed ? (
                            <Badge variant="default">Processed</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customer responses yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-cleanup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Address Cleanup</CardTitle>
              <CardDescription>
                Clean and verify customer email addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailCleanupData ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Email cleanup completed: {emailCleanupData.emailsCleaned} emails cleaned,
                      {emailCleanupData.tokensGenerated} verification tokens generated
                    </AlertDescription>
                  </Alert>

                  {emailCleanupData.invalidEmails.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Invalid Email Formats</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emailCleanupData.invalidEmails.map((customer, index) => (
                            <TableRow key={index}>
                              <TableCell>{customer.first_name} {customer.last_name}</TableCell>
                              <TableCell className="text-red-600">{customer.email}</TableCell>
                              <TableCell>{customer.phone}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <Button onClick={loadEmailCleanup}>
                  <Mail className="h-4 w-4 mr-2" />
                  Start Email Cleanup
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Duplicate Customer Records</CardTitle>
              <CardDescription>
                Customers with duplicate phone numbers or email addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cleanupData?.duplicateCustomers && cleanupData.duplicateCustomers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Duplicate Count</TableHead>
                      <TableHead>Customer Names</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cleanupData.duplicateCustomers.map((duplicate, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {duplicate.phone && <div>📞 {duplicate.phone}</div>}
                          {duplicate.email && <div>✉️ {duplicate.email}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{duplicate.duplicate_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {duplicate.names.slice(0, 3).map((name: string, i: number) => (
                              <div key={i} className="text-sm">{name}</div>
                            ))}
                            {duplicate.names.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{duplicate.names.length - 3} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" disabled>
                            Review & Merge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No duplicate customers found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
