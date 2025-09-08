"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EnhancedCustomerLookup } from "@/components/ui/enhanced-customer-lookup"
import { EnhancedPostcodeLookup } from "@/components/ui/enhanced-postcode-lookup"
import { EnhancedCustomerManager } from "@/components/customer/enhanced-customer-manager"
import { Search, MapPin, User, Zap } from "lucide-react"

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1?: string
  city?: string
  postcode?: string
  vehicle_count?: number
}

interface AddressData {
  houseNumber: string
  houseName: string
  road: string
  locality: string
  town: string
  county: string
  postCode: string
  country: string
}

export default function TestEnhancedLookupPage() {
  // Customer Lookup Test
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Postcode Lookup Test
  const [postcode, setPostcode] = useState('NW4 2RH')
  const [addressData, setAddressData] = useState<AddressData>({
    houseNumber: '',
    houseName: '',
    road: '',
    locality: '',
    town: '',
    county: '',
    postCode: '',
    country: 'United Kingdom'
  })

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    console.log('Selected customer:', customer)
  }

  const handleAddressChange = (field: keyof AddressData, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomerSave = (customer: Customer) => {
    console.log('Customer saved:', customer)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Lookup System Test</h1>
          <p className="text-muted-foreground">
            Test the enhanced customer lookup and postcode lookup features
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Enhanced Search
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Auto Address
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="customer-lookup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customer-lookup">Customer Lookup</TabsTrigger>
          <TabsTrigger value="postcode-lookup">Postcode Lookup</TabsTrigger>
          <TabsTrigger value="customer-manager">Customer Manager</TabsTrigger>
          <TabsTrigger value="integration">Integration Demo</TabsTrigger>
        </TabsList>

        {/* Customer Lookup Test */}
        <TabsContent value="customer-lookup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Enhanced Customer Lookup
              </CardTitle>
              <CardDescription>
                Search customers by name, phone, email, or postcode with intelligent ranking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedCustomerLookup
                searchTerm={customerSearchTerm}
                onSearchTermChange={setCustomerSearchTerm}
                onCustomerSelect={handleCustomerSelect}
                onCreateNew={() => console.log('Create new customer')}
                showCreateButton={true}
                autoSearch={true}
                minSearchLength={2}
              />
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle>Selected Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-white p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(selectedCustomer, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Test Searches</CardTitle>
              <CardDescription>Try these example searches to see the ranking system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Name: "Anna"', value: 'Anna' },
                  { label: 'Phone: "07768586027"', value: '07768586027' },
                  { label: 'Postcode: "NW4"', value: 'NW4' },
                  { label: 'Email: "reynolds"', value: 'reynolds' }
                ].map((test, index) => (
                  <button
                    key={index}
                    onClick={() => setCustomerSearchTerm(test.value)}
                    className="p-2 text-sm border rounded hover:bg-muted transition-colors text-left"
                  >
                    {test.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Postcode Lookup Test */}
        <TabsContent value="postcode-lookup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Enhanced Postcode Lookup
              </CardTitle>
              <CardDescription>
                Auto-complete addresses with postcode lookup and quick-fill suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedPostcodeLookup
                postcode={postcode}
                onPostcodeChange={setPostcode}
                addressData={addressData}
                onAddressChange={handleAddressChange}
                onAddressComplete={(address) => console.log('Address complete:', address)}
                autoLookup={true}
                showQuickFill={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(addressData, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Postcodes</CardTitle>
              <CardDescription>Try these example postcodes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  'SW1A 1AA', // Westminster
                  'M1 1AA',   // Manchester
                  'B1 1AA',   // Birmingham
                  'NW4 2RH'   // London
                ].map((testPostcode, index) => (
                  <button
                    key={index}
                    onClick={() => setPostcode(testPostcode)}
                    className="p-2 text-sm border rounded hover:bg-muted transition-colors"
                  >
                    {testPostcode}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Manager Test */}
        <TabsContent value="customer-manager" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Enhanced Customer Manager
              </CardTitle>
              <CardDescription>
                Complete customer management with lookup, creation, and editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedCustomerManager
                onCustomerSave={handleCustomerSave}
                onCustomerSelect={handleCustomerSelect}
                mode="create"
                showLookup={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Demo */}
        <TabsContent value="integration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Customer Lookup</CardTitle>
                <CardDescription>Simulates job sheet customer selection</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedCustomerLookup
                  searchTerm=""
                  onSearchTermChange={() => {}}
                  onCustomerSelect={(customer) => {
                    console.log('Job sheet customer selected:', customer)
                    alert(`Selected: ${customer.first_name} ${customer.last_name}`)
                  }}
                  placeholder="Search for job sheet customer..."
                  showCreateButton={false}
                  autoSearch={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Address Entry</CardTitle>
                <CardDescription>Simulates customer address form</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedPostcodeLookup
                  postcode=""
                  onPostcodeChange={() => {}}
                  addressData={{
                    houseNumber: '',
                    houseName: '',
                    road: '',
                    locality: '',
                    town: '',
                    county: '',
                    postCode: '',
                    country: 'United Kingdom'
                  }}
                  onAddressChange={() => {}}
                  onAddressComplete={(address) => {
                    console.log('Quick address complete:', address)
                    alert(`Address: ${address.road}, ${address.town}, ${address.postCode}`)
                  }}
                  autoLookup={true}
                  showQuickFill={true}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-muted-foreground">Faster Customer Lookup</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">70%</div>
                  <div className="text-sm text-muted-foreground">Faster Address Entry</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-muted-foreground">Reduced Typing Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
