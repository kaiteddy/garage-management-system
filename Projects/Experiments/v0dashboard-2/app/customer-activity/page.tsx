'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Phone, Car, Calendar, DollarSign, FileText, Receipt, Wrench } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  totalSpent: number
  totalDocuments: number
  lastActivity: string
  customerTier: string
  smsStatus: string
  vehicles: number
}

interface Document {
  id: string
  type: string
  date: string
  amount: number
  vehicle: string
  status: string
  lineItemsCount: number
  receiptsCount: number
  hasJobDescription: boolean
}

interface LineItem {
  id: string
  type: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface JobDescription {
  documentId: string
  labourDescription: string
  docNotes: string
}

export default function CustomerActivityPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerDocuments, setCustomerDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [documentLineItems, setDocumentLineItems] = useState<LineItem[]>([])
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/enhanced-verification')
      const data = await response.json()
      
      if (data.success) {
        // Combine urgent and high-value customers for display
        const allCustomers = [
          ...data.urgentSmsReady.map((c: any) => ({
            id: c.id,
            name: c.name || 'Unknown',
            phone: c.phone,
            email: '',
            totalSpent: c.lifetimeSpent || 0,
            totalDocuments: c.lifetimeDocuments || 0,
            lastActivity: c.earliestExpiry,
            customerTier: c.customerTier,
            smsStatus: 'ready',
            vehicles: c.totalVehicles || 0
          })),
          ...data.highValueSmsReady.map((c: any) => ({
            id: c.id,
            name: c.name || 'Unknown',
            phone: c.phone,
            email: '',
            totalSpent: c.lifetimeSpent || 0,
            totalDocuments: c.lifetimeDocuments || 0,
            lastActivity: '',
            customerTier: c.customerTier,
            smsStatus: 'ready',
            vehicles: c.totalVehicles || 0
          }))
        ]
        
        setCustomers(allCustomers)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerDocuments = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/documents`)
      const data = await response.json()
      
      if (data.success) {
        setCustomerDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching customer documents:', error)
    }
  }

  const fetchDocumentDetails = async (documentId: string) => {
    try {
      // Fetch line items
      const lineItemsResponse = await fetch(`/api/documents/${documentId}/line-items`)
      const lineItemsData = await lineItemsResponse.json()
      
      if (lineItemsData.success) {
        setDocumentLineItems(lineItemsData.lineItems || [])
      }

      // Fetch job description
      const jobDescResponse = await fetch(`/api/documents/${documentId}/job-description`)
      const jobDescData = await jobDescResponse.json()
      
      if (jobDescData.success) {
        setJobDescription(jobDescData.jobDescription || null)
      }
    } catch (error) {
      console.error('Error fetching document details:', error)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  )

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800'
      case 'high_value': return 'bg-blue-100 text-blue-800'
      case 'regular': return 'bg-green-100 text-green-800'
      case 'occasional': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading customer activity data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Customer Activity Dashboard</h1>
        <p className="text-gray-600">Complete customer service history and document management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Customers ({filteredCustomers.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      fetchCustomerDocuments(customer.id)
                      setSelectedDocument(null)
                      setDocumentLineItems([])
                      setJobDescription(null)
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm">{customer.name}</h3>
                      <Badge className={getTierColor(customer.customerTier)}>
                        {customer.customerTier.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        £{customer.totalSpent.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {customer.totalDocuments} documents
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {customer.vehicles} vehicles
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="details">Customer Details</TabsTrigger>
              </TabsList>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Service Documents for {selectedCustomer.name}
                    </CardTitle>
                    <CardDescription>
                      Complete service history and documentation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {customerDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedDocument?.id === doc.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedDocument(doc)
                            fetchDocumentDetails(doc.id)
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{doc.type} - £{doc.amount}</h4>
                              <p className="text-sm text-gray-600">{doc.vehicle}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{doc.date}</p>
                              <Badge variant="outline">{doc.status}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>{doc.lineItemsCount} items</span>
                            <span>{doc.receiptsCount} receipts</span>
                            {doc.hasJobDescription && (
                              <span className="text-blue-600">Has job description</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name</label>
                        <p className="text-lg">{selectedCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-lg">{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Customer Tier</label>
                        <Badge className={getTierColor(selectedCustomer.customerTier)}>
                          {selectedCustomer.customerTier.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">SMS Status</label>
                        <Badge variant="outline">{selectedCustomer.smsStatus}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Spent</label>
                        <p className="text-lg font-semibold">£{selectedCustomer.totalSpent.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Documents</label>
                        <p className="text-lg">{selectedCustomer.totalDocuments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select a customer to view their activity</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Document Details Modal/Panel */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Document Details</h2>
                <Button variant="outline" onClick={() => setSelectedDocument(null)}>
                  Close
                </Button>
              </div>

              <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="items">Line Items</TabsTrigger>
                  <TabsTrigger value="description">Job Description</TabsTrigger>
                </TabsList>

                <TabsContent value="items">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Service Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {documentLineItems.map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{item.description}</h4>
                                <p className="text-sm text-gray-600">{item.type}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">£{item.totalPrice}</p>
                                <p className="text-sm text-gray-600">
                                  {item.quantity} × £{item.unitPrice}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="description">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Job Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {jobDescription ? (
                        <div className="space-y-4">
                          {jobDescription.labourDescription && (
                            <div>
                              <h4 className="font-medium mb-2">Work Performed:</h4>
                              <p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                {jobDescription.labourDescription}
                              </p>
                            </div>
                          )}
                          {jobDescription.docNotes && (
                            <div>
                              <h4 className="font-medium mb-2">Additional Notes:</h4>
                              <p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                {jobDescription.docNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No job description available for this document.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
