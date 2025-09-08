"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, User, Phone, Mail, MapPin, Plus, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PostcodeLookup } from '@/components/ui/postcode-lookup'

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  country?: string
  vehicle_count?: number
  created_at?: string
  last_visit?: string
}

interface CustomerSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerSelect: (customer: Customer) => void
  initialSearchTerm?: string
}

export function CustomerSearchDialog({
  open,
  onOpenChange,
  onCustomerSelect,
  initialSearchTerm = ""
}: CustomerSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom'
  })
  const { toast } = useToast()

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm)
      searchCustomers(initialSearchTerm)
    }
  }, [initialSearchTerm])

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomers([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query.trim())}`)
      const data = await response.json()

      if (data.success && data.data) {
        setCustomers(data.data)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Customer search error:', error)
      toast({
        title: "Search Failed",
        description: "Failed to search for customers. Please try again.",
        variant: "destructive",
      })
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2) {
      searchCustomers(value)
    } else {
      setCustomers([])
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer)
    onOpenChange(false)
    toast({
      title: "Customer Selected",
      description: `Selected ${customer.first_name} ${customer.last_name}`,
    })
  }

  const handleCreateNew = () => {
    setShowCreateForm(true)
    // Pre-fill name if search term looks like a name
    const nameParts = searchTerm.trim().split(' ')
    if (nameParts.length >= 2) {
      setNewCustomer(prev => ({
        ...prev,
        first_name: nameParts[0].toUpperCase(),
        last_name: nameParts.slice(1).join(' ').toUpperCase()
      }))
    } else if (nameParts.length === 1) {
      setNewCustomer(prev => ({
        ...prev,
        first_name: nameParts[0].toUpperCase()
      }))
    }
  }

  const handleSaveNewCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.last_name) {
      toast({
        title: "Missing Information",
        description: "Please enter at least first and last name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer)
      })

      const data = await response.json()
      
      if (data.success) {
        const createdCustomer = data.customer
        onCustomerSelect(createdCustomer)
        onOpenChange(false)
        toast({
          title: "Customer Created",
          description: `Created new customer: ${createdCustomer.first_name} ${createdCustomer.last_name}`,
        })
      } else {
        throw new Error(data.error || 'Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: "Creation Failed",
        description: "Failed to create new customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCustomerDisplay = (customer: Customer) => {
    const name = `${customer.first_name} ${customer.last_name}`.trim()
    const contact = customer.phone || customer.email || 'No contact info'
    const address = [customer.address_line1, customer.city, customer.postcode]
      .filter(Boolean)
      .join(', ') || 'No address'
    
    return { name, contact, address }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {showCreateForm ? 'Create New Customer' : 'Find Customer'}
          </DialogTitle>
          <DialogDescription>
            {showCreateForm 
              ? 'Enter details for the new customer'
              : 'Search for existing customers or create a new one'
            }
          </DialogDescription>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Search by name, phone, email, or postcode..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-12 h-12 text-lg font-bold bg-white border-2 border-gray-300 focus:border-blue-500"
                  />
                </div>
                <Button
                  onClick={handleCreateNew}
                  className="h-12 px-6 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create New
                </Button>
              </div>
            </div>

            {/* Results Section */}
            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : customers.length > 0 ? (
                <div className="space-y-3">
                  {customers.map((customer) => {
                    const { name, contact, address } = formatCustomerDisplay(customer)
                    return (
                      <Card 
                        key={customer.id} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors border-2"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-blue-600" />
                                <span className="font-bold text-lg text-gray-900">{name}</span>
                                {customer.vehicle_count && (
                                  <Badge variant="secondary">
                                    {customer.vehicle_count} vehicle{customer.vehicle_count !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{contact}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{address}</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No customers found matching "{searchTerm}"</p>
                  <Button onClick={handleCreateNew} className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Customer
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Enter at least 2 characters to search for customers
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          /* Create New Customer Form */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={newCustomer.first_name}
                        onChange={(e) => setNewCustomer(prev => ({...prev, first_name: e.target.value.toUpperCase()}))}
                        placeholder="FIRST NAME"
                        className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-800 mb-2 block">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={newCustomer.last_name}
                        onChange={(e) => setNewCustomer(prev => ({...prev, last_name: e.target.value.toUpperCase()}))}
                        placeholder="LAST NAME"
                        className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-bold text-gray-800 mb-2 block">Phone</Label>
                    <Input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({...prev, phone: e.target.value}))}
                      placeholder="07123 456789"
                      className="h-12 text-lg font-bold bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-bold text-gray-800 mb-2 block">Email</Label>
                    <Input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({...prev, email: e.target.value.toLowerCase()}))}
                      placeholder="customer@example.com"
                      className="h-12 text-lg font-bold bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PostcodeLookup
                    postcode={newCustomer.postcode || ''}
                    onPostcodeChange={(postcode) => setNewCustomer(prev => ({...prev, postcode: postcode.toUpperCase()}))}
                    onAddressSelect={(address) => {
                      setNewCustomer(prev => ({
                        ...prev,
                        address_line1: (address.houseNo && address.road) ? `${address.houseNo} ${address.road}`.toUpperCase() : prev.address_line1,
                        address_line2: address.locality?.toUpperCase() || prev.address_line2,
                        city: address.town?.toUpperCase() || prev.city,
                        postcode: address.postCode?.toUpperCase() || prev.postcode
                      }))
                    }}
                    addressData={{
                      houseNo: '',
                      road: '',
                      locality: '',
                      town: newCustomer.city || '',
                      county: '',
                      postCode: newCustomer.postcode || ''
                    }}
                    onAddressChange={(field, value) => {
                      if (field === 'town') {
                        setNewCustomer(prev => ({...prev, city: value.toUpperCase()}))
                      } else if (field === 'postCode') {
                        setNewCustomer(prev => ({...prev, postcode: value.toUpperCase()}))
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="h-12 px-6"
              >
                Back to Search
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNewCustomer}
                  disabled={loading || !newCustomer.first_name || !newCustomer.last_name}
                  className="h-12 px-6 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
