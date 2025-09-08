"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Search,
  User,
  UserPlus,
  Phone,
  Mail, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  ArrowRight
} from "lucide-react"
import { EnhancedCustomerLookup } from "@/components/ui/enhanced-customer-lookup"
import { PostcodeLookup } from "@/components/ui/postcode-lookup"

interface Customer {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postcode?: string
  total_visits?: number
  last_visit?: string
}

interface NewCustomerData {
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  postcode: string
  // Additional address fields for PostcodeLookup compatibility
  houseNo?: string
  road?: string
  locality?: string
  town?: string
  county?: string
}

interface ChangeOwnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleRegistration: string
  currentOwner?: {
    id: string
    name: string
    phone?: string
    email?: string
  } | null
  onOwnerChanged: (newOwner: any) => void
}

export function ChangeOwnerDialog({
  open,
  onOpenChange,
  vehicleRegistration,
  currentOwner,
  onOwnerChanged
}: ChangeOwnerDialogProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    postcode: '',
    houseNo: '',
    road: '',
    locality: '',
    town: '',
    county: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedCustomer(null)
      setCustomerSearchTerm('')
      setNewCustomerData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        address: '',
        postcode: ''
      })
      setError(null)
      setSuccess(false)
      setActiveTab('existing')
    }
  }, [open])

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setError(null)
  }, [])

  const handleAddressSelect = useCallback((address: any) => {
    setNewCustomerData(prev => ({
      ...prev,
      address: [address.houseNo, address.road].filter(Boolean).join(' '),
      postcode: address.postCode || '',
      houseNo: address.houseNo || '',
      road: address.road || '',
      locality: address.locality || '',
      town: address.town || '',
      county: address.county || ''
    }))
  }, [])

  const handleAddressFieldChange = useCallback((field: string, value: string) => {
    setNewCustomerData(prev => ({
      ...prev,
      [field]: value,
      // Update the combined address when individual fields change
      ...(field === 'houseNo' || field === 'road' ? {
        address: [
          field === 'houseNo' ? value : prev.houseNo,
          field === 'road' ? value : prev.road
        ].filter(Boolean).join(' ')
      } : {})
    }))
  }, [])

  const validateNewCustomer = (): boolean => {
    if (!newCustomerData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!newCustomerData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!newCustomerData.phone.trim()) {
      setError('Phone number is required')
      return false
    }
    return true
  }

  const handleChangeOwner = async () => {
    setLoading(true)
    setError(null)

    try {
      let requestBody: any = {
        changeType: 'transferred',
        changeDate: new Date().toISOString().split('T')[0],
        notes: `Owner changed via vehicle management interface`
      }

      if (activeTab === 'existing' && selectedCustomer) {
        requestBody.newCustomerId = selectedCustomer.id
      } else if (activeTab === 'new') {
        if (!validateNewCustomer()) {
          setLoading(false)
          return
        }
        requestBody.newCustomerInfo = newCustomerData
      } else {
        setError('Please select a customer or fill in new customer details')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicleRegistration)}/change-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        console.log('✅ [CHANGE-OWNER] Success! Database updated, forcing page reload...')

        // Show success toast
        toast.success('Vehicle owner changed successfully! Refreshing page...')

        // Close dialog immediately
        onOpenChange(false)

        // Force page reload after a short delay to ensure database consistency
        setTimeout(() => {
          console.log('🔄 [CHANGE-OWNER] Reloading page to show updated owner')
          window.location.reload()
        }, 1000)
      } else {
        setError(data.error || 'Failed to change vehicle owner')
      }
    } catch (err) {
      setError('Failed to change vehicle owner. Please try again.')
      console.error('Error changing owner:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Owner Changed Successfully!</h3>
            <p className="text-gray-600">
              Vehicle {vehicleRegistration} has been transferred to the new owner.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Change Owner - {vehicleRegistration}
          </DialogTitle>
        </DialogHeader>

        {currentOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Current Owner</h4>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{currentOwner.name}</p>
                {currentOwner.phone && (
                  <p className="text-sm text-gray-600">{currentOwner.phone}</p>
                )}
                {currentOwner.email && (
                  <p className="text-sm text-gray-600">{currentOwner.email}</p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600" />
              <div className="text-blue-600 font-medium">New Owner</div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Existing Customer
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Customer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Search for Existing Customer</Label>
              <EnhancedCustomerLookup
                searchTerm={customerSearchTerm}
                onSearchTermChange={setCustomerSearchTerm}
                onCustomerSelect={handleCustomerSelect}
                placeholder="Search by name, phone, or email..."
                showCreateButton={false}
              />
            </div>

            {selectedCustomer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Selected Customer</h4>
                <div className="space-y-2">
                  <p className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      {selectedCustomer.email}
                    </div>
                  )}
                  {(selectedCustomer.address_line1 || selectedCustomer.city) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[selectedCustomer.address_line1, selectedCustomer.city, selectedCustomer.postcode]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedCustomer.total_visits && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCustomer.total_visits} previous visits
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newCustomerData.firstName}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newCustomerData.lastName}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Address</Label>
              <PostcodeLookup
                postcode={newCustomerData.postcode}
                onPostcodeChange={(postcode) => setNewCustomerData(prev => ({ ...prev, postcode }))}
                onAddressSelect={handleAddressSelect}
                addressData={{
                  houseNo: newCustomerData.houseNo,
                  road: newCustomerData.road,
                  locality: newCustomerData.locality,
                  town: newCustomerData.town,
                  county: newCustomerData.county,
                  postCode: newCustomerData.postcode
                }}
                onAddressChange={handleAddressFieldChange}
              />
              {newCustomerData.address && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Selected Address:</p>
                  <p className="text-sm">{newCustomerData.address}</p>
                  <p className="text-sm">{newCustomerData.postcode}</p>
                  {newCustomerData.town && (
                    <p className="text-sm text-muted-foreground">{newCustomerData.town}, {newCustomerData.county}</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleChangeOwner} 
            disabled={loading || (activeTab === 'existing' && !selectedCustomer) || (activeTab === 'new' && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.phone))}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing Owner...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Change Owner
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
