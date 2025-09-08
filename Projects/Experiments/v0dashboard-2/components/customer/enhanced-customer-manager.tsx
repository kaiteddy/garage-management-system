"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { EnhancedCustomerLookup } from "@/components/ui/enhanced-customer-lookup"
import { EnhancedPostcodeLookup } from "@/components/ui/enhanced-postcode-lookup"
import { User, Phone, Mail, MapPin, Save, Plus, Search, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id?: string
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

interface EnhancedCustomerManagerProps {
  initialCustomer?: Customer
  onCustomerSave?: (customer: Customer) => void
  onCustomerSelect?: (customer: Customer) => void
  mode?: 'create' | 'edit' | 'lookup'
  showLookup?: boolean
  className?: string
}

export function EnhancedCustomerManager({
  initialCustomer,
  onCustomerSave,
  onCustomerSelect,
  mode = 'create',
  showLookup = true,
  className = ""
}: EnhancedCustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null)
  const [isEditing, setIsEditing] = useState(mode === 'create')
  const [saving, setSaving] = useState(false)

  // Customer form data
  const [customerData, setCustomerData] = useState<Customer>({
    first_name: initialCustomer?.first_name || '',
    last_name: initialCustomer?.last_name || '',
    email: initialCustomer?.email || '',
    phone: initialCustomer?.phone || '',
    address_line1: initialCustomer?.address_line1 || '',
    address_line2: initialCustomer?.address_line2 || '',
    city: initialCustomer?.city || '',
    postcode: initialCustomer?.postcode || '',
    country: initialCustomer?.country || 'United Kingdom'
  })

  // Address data for enhanced postcode lookup
  const [addressData, setAddressData] = useState<AddressData>({
    houseNumber: '',
    houseName: '',
    road: initialCustomer?.address_line1 || '',
    locality: initialCustomer?.address_line2 || '',
    town: initialCustomer?.city || '',
    county: '',
    postCode: initialCustomer?.postcode || '',
    country: initialCustomer?.country || 'United Kingdom'
  })

  const handleCustomerSelect = (customer: Customer) => {
    console.log('👤 [CUSTOMER-MANAGER] Customer selected:', customer)
    
    setSelectedCustomer(customer)
    setCustomerData(customer)
    
    // Update address data
    setAddressData({
      houseNumber: '',
      houseName: '',
      road: customer.address_line1 || '',
      locality: customer.address_line2 || '',
      town: customer.city || '',
      county: '',
      postCode: customer.postcode || '',
      country: customer.country || 'United Kingdom'
    })

    if (onCustomerSelect) {
      onCustomerSelect(customer)
    }

    // Show success message
    toast.success(`Selected: ${customer.first_name} ${customer.last_name}`)
  }

  const handleCreateNew = () => {
    setSelectedCustomer(null)
    setIsEditing(true)
    setCustomerData({
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
    setAddressData({
      houseNumber: '',
      houseName: '',
      road: '',
      locality: '',
      town: '',
      county: '',
      postCode: '',
      country: 'United Kingdom'
    })
    setSearchTerm('')
    toast.info('Creating new customer')
  }

  const handleInputChange = (field: keyof Customer, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddressChange = (field: keyof AddressData, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }))

    // Update customer data based on address changes
    const updatedCustomer = { ...customerData }
    
    switch (field) {
      case 'road':
        updatedCustomer.address_line1 = value
        break
      case 'locality':
        updatedCustomer.address_line2 = value
        break
      case 'town':
        updatedCustomer.city = value
        break
      case 'postCode':
        updatedCustomer.postcode = value
        break
      case 'country':
        updatedCustomer.country = value
        break
      case 'houseNumber':
      case 'houseName':
        // Combine house number/name with road
        const houseInfo = [addressData.houseNumber, addressData.houseName].filter(Boolean).join(' ')
        updatedCustomer.address_line1 = houseInfo ? `${houseInfo} ${addressData.road}`.trim() : addressData.road
        break
    }

    setCustomerData(updatedCustomer)
  }

  const handleAddressComplete = (address: AddressData) => {
    // Auto-fill the full address when postcode lookup completes
    const fullAddress = [address.houseNumber, address.houseName, address.road].filter(Boolean).join(' ')
    
    setCustomerData(prev => ({
      ...prev,
      address_line1: fullAddress || address.road,
      address_line2: address.locality,
      city: address.town,
      postcode: address.postCode,
      country: address.country
    }))
  }

  const handleSave = async () => {
    // Validate required fields
    if (!customerData.first_name.trim() || !customerData.last_name.trim()) {
      toast.error('Please enter customer name')
      return
    }

    if (!customerData.phone.trim() && !customerData.email.trim()) {
      toast.error('Please enter phone number or email')
      return
    }

    setSaving(true)

    try {
      const action = selectedCustomer?.id ? 'update' : 'create'
      const payload = {
        action,
        ...customerData,
        ...(selectedCustomer?.id && { id: selectedCustomer.id })
      }

      console.log('💾 [CUSTOMER-MANAGER] Saving customer:', payload)

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        const savedCustomer = data.data
        setSelectedCustomer(savedCustomer)
        setIsEditing(false)
        
        toast.success(`Customer ${action === 'create' ? 'created' : 'updated'} successfully`)
        
        if (onCustomerSave) {
          onCustomerSave(savedCustomer)
        }
      } else {
        toast.error(data.error || `Failed to ${action} customer`)
      }

    } catch (error) {
      console.error('Customer save error:', error)
      toast.error('Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = () => {
    return customerData.first_name.trim() && 
           customerData.last_name.trim() && 
           (customerData.phone.trim() || customerData.email.trim())
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Customer Lookup Section */}
      {showLookup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Existing Customer
            </CardTitle>
            <CardDescription>
              Search for existing customers by name, phone, email, or postcode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancedCustomerLookup
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onCustomerSelect={handleCustomerSelect}
              onCreateNew={handleCreateNew}
              showCreateButton={true}
              autoSearch={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Selected Customer Display */}
      {selectedCustomer && !isEditing && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Selected Customer
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium text-lg">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {selectedCustomer.phone}
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {selectedCustomer.email}
                  </div>
                )}
              </div>
              {(selectedCustomer.city || selectedCustomer.postcode) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[selectedCustomer.city, selectedCustomer.postcode].filter(Boolean).join(', ')}
                </div>
              )}
              {selectedCustomer.vehicle_count !== undefined && (
                <Badge variant="secondary">
                  {selectedCustomer.vehicle_count} vehicle{selectedCustomer.vehicle_count !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedCustomer?.id ? 'Edit Customer' : 'New Customer'}
            </CardTitle>
            <CardDescription>
              Enter customer details and address information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={customerData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="John"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={customerData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Smith"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={customerData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="07123 456789"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john.smith@example.com"
                  disabled={saving}
                />
              </div>
            </div>

            <Separator />

            {/* Enhanced Address Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Address Information</h3>
              <EnhancedPostcodeLookup
                postcode={addressData.postCode}
                onPostcodeChange={(postcode) => handleAddressChange('postCode', postcode)}
                addressData={addressData}
                onAddressChange={handleAddressChange}
                onAddressComplete={handleAddressComplete}
                disabled={saving}
                autoLookup={true}
                showQuickFill={true}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : selectedCustomer?.id ? 'Update Customer' : 'Create Customer'}
              </Button>
              
              {selectedCustomer && (
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
