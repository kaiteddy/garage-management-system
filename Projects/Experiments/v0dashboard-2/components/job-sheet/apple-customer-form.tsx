"use client"

import React, { useState } from 'react'
import { 
  AppleCard, 
  AppleButton, 
  AppleInput, 
  AppleBadge, 
  AppleList, 
  AppleListItem,
  AppleSectionHeader 
} from '@/components/ui/apple-inspired-components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  CreditCard,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface AppleCustomerFormProps {
  customerData: {
    name: string
    accountNumber: string
    company: string
    mobile: string
    telephone: string
    email: string
    houseNumber: string
    road: string
    locality: string
    town: string
    county: string
    postCode: string
  }
  onCustomerUpdate: (field: string, value: string) => void
  onCustomerSearch: () => void
  expanded: boolean
  onToggleExpanded: () => void
}

export function AppleCustomerForm({
  customerData,
  onCustomerUpdate,
  onCustomerSearch,
  expanded,
  onToggleExpanded
}: AppleCustomerFormProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  return (
    <div className="space-y-4 apple-font-system">
      {/* Main Customer Card */}
      <AppleCard className="apple-transition">
        <CardHeader 
          className="cursor-pointer apple-transition hover:bg-gray-50 rounded-t-xl"
          onClick={onToggleExpanded}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center apple-transition">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="apple-headline text-gray-900">Customer Information</h3>
                <p className="apple-caption">Tap to {expanded ? 'collapse' : 'expand'} details</p>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400 apple-transition" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400 apple-transition" />
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Always Visible: Name and Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                Name <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <AppleInput
                  placeholder="CUSTOMER NAME"
                  value={customerData.name}
                  onChange={(e) => onCustomerUpdate('name', e.target.value.toUpperCase())}
                  className={`flex-1 apple-transition ${
                    focusedField === 'name' ? 'apple-focus' : ''
                  }`}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
                <AppleButton
                  variant="secondary"
                  size="medium"
                  onClick={onCustomerSearch}
                  className="apple-transition apple-hover-scale"
                >
                  <Search className="h-4 w-4" />
                </AppleButton>
              </div>
            </div>

            {/* Contact Field */}
            <div className="space-y-2">
              <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact <span className="text-red-500">*</span>
              </Label>
              <AppleInput
                placeholder="Phone Number"
                value={customerData.telephone}
                onChange={(e) => onCustomerUpdate('telephone', e.target.value)}
                className={`apple-transition ${
                  focusedField === 'telephone' ? 'apple-focus' : ''
                }`}
                onFocus={() => setFocusedField('telephone')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="space-y-6 pt-6 border-t border-gray-100 apple-fade-in">
              {/* Account & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Account Number
                  </Label>
                  <AppleInput
                    placeholder="REN002"
                    value={customerData.accountNumber}
                    onChange={(e) => onCustomerUpdate('accountNumber', e.target.value.toUpperCase())}
                    className={`apple-transition ${
                      focusedField === 'accountNumber' ? 'apple-focus' : ''
                    }`}
                    onFocus={() => setFocusedField('accountNumber')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company
                  </Label>
                  <AppleInput
                    placeholder="COMPANY NAME"
                    value={customerData.company}
                    onChange={(e) => onCustomerUpdate('company', e.target.value.toUpperCase())}
                    className={`apple-transition ${
                      focusedField === 'company' ? 'apple-focus' : ''
                    }`}
                    onFocus={() => setFocusedField('company')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <AppleSectionHeader 
                  title="Address Information" 
                  subtitle="Required for invoicing"
                />
                
                {/* Postcode */}
                <div className="space-y-2">
                  <Label className="apple-body font-medium text-gray-800">Postcode</Label>
                  <div className="flex gap-2">
                    <AppleInput
                      placeholder="WD23 3SY"
                      value={customerData.postCode}
                      onChange={(e) => onCustomerUpdate('postCode', e.target.value.toUpperCase())}
                      className={`flex-1 apple-transition ${
                        focusedField === 'postCode' ? 'apple-focus' : ''
                      }`}
                      onFocus={() => setFocusedField('postCode')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <AppleButton variant="primary" size="medium" className="apple-transition">
                      Lookup
                    </AppleButton>
                  </div>
                </div>

                {/* Address Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="apple-caption font-medium text-gray-600">House Number/Name</Label>
                    <AppleInput
                      placeholder="House number or name"
                      value={customerData.houseNumber}
                      onChange={(e) => onCustomerUpdate('houseNumber', e.target.value.toUpperCase())}
                      variant="rounded"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="apple-caption font-medium text-gray-600">Street Address</Label>
                    <AppleInput
                      placeholder="Street address"
                      value={customerData.road}
                      onChange={(e) => onCustomerUpdate('road', e.target.value.toUpperCase())}
                      variant="rounded"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="apple-caption font-medium text-gray-600">Locality</Label>
                    <AppleInput
                      placeholder="Locality (optional)"
                      value={customerData.locality}
                      onChange={(e) => onCustomerUpdate('locality', e.target.value.toUpperCase())}
                      variant="rounded"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="apple-caption font-medium text-gray-600">Town/City</Label>
                    <AppleInput
                      placeholder="Town or city"
                      value={customerData.town}
                      onChange={(e) => onCustomerUpdate('town', e.target.value.toUpperCase())}
                      variant="rounded"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="apple-caption font-medium text-gray-600">County</Label>
                    <AppleInput
                      placeholder="County (optional)"
                      value={customerData.county}
                      onChange={(e) => onCustomerUpdate('county', e.target.value.toUpperCase())}
                      variant="rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <AppleSectionHeader title="Contact Details" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Mobile
                    </Label>
                    <AppleInput
                      placeholder="07962999642"
                      value={customerData.mobile}
                      onChange={(e) => onCustomerUpdate('mobile', e.target.value)}
                      type="tel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="apple-body font-medium text-gray-800 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <AppleInput
                      placeholder="customer@example.com"
                      value={customerData.email}
                      onChange={(e) => onCustomerUpdate('email', e.target.value.toLowerCase())}
                      type="email"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <AppleButton variant="primary" className="apple-transition apple-hover-scale">
                  Save Customer
                </AppleButton>
                <AppleButton variant="secondary" className="apple-transition">
                  View History
                </AppleButton>
                <AppleButton variant="plain" className="apple-transition">
                  Reset Form
                </AppleButton>
              </div>
            </div>
          )}
        </CardContent>
      </AppleCard>
    </div>
  )
}
