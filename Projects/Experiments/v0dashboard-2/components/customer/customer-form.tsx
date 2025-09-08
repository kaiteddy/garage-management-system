"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save, User, Phone, Mail, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CustomerFormProps {
  customerId?: string
  initialData?: any
  onDataChange?: (data: any) => void
  onSave?: () => void
}

export function CustomerForm({ customerId, initialData, onDataChange, onSave }: CustomerFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [customerData, setCustomerData] = useState({
    firstName: initialData?.first_name || '',
    lastName: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    addressLine1: initialData?.address_line1 || '',
    addressLine2: initialData?.address_line2 || '',
    city: initialData?.city || '',
    postcode: initialData?.postcode || '',
    country: initialData?.country || '',
    notes: initialData?.notes || ''
  })

  useEffect(() => {
    if (customerId && !initialData) {
      loadCustomerData()
    }
  }, [customerId])

  const loadCustomerData = async () => {
    if (!customerId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      const data = await response.json()
      
      if (data.success && data.customer) {
        const customer = data.customer
        setCustomerData({
          firstName: customer.first_name || '',
          lastName: customer.last_name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          addressLine1: customer.address_line1 || '',
          addressLine2: customer.address_line2 || '',
          city: customer.city || '',
          postcode: customer.postcode || '',
          country: customer.country || '',
          notes: customer.notes || ''
        })
      }
    } catch (error) {
      console.error('Error loading customer:', error)
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...customerData, [field]: value }
    setCustomerData(newData)
    onDataChange?.(newData)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers${customerId ? `/${customerId}` : ''}`, {
        method: customerId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          address_line1: customerData.addressLine1,
          address_line2: customerData.addressLine2,
          city: customerData.city,
          postcode: customerData.postcode,
          country: customerData.country,
          notes: customerData.notes
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Customer ${customerId ? 'updated' : 'created'} successfully`,
        })
        onSave?.()
      } else {
        throw new Error(data.error || 'Failed to save customer')
      }
    } catch (error) {
      console.error('Error saving customer:', error)
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !customerData.firstName) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">
              {customerId ? 'Edit Customer' : 'New Customer'}
            </h1>
            <p className="text-gray-500">
              {customerData.firstName || customerData.lastName 
                ? `${customerData.firstName} ${customerData.lastName}`.trim()
                : 'Customer details'
              }
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Customer'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={customerData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={customerData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="07123 456789"
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
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={customerData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="Street address"
              />
            </div>
            
            <div>
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={customerData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={customerData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={customerData.postcode}
                  onChange={(e) => handleInputChange('postcode', e.target.value)}
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={customerData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="United Kingdom"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customerData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes about this customer..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  )
}
