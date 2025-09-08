"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"

interface AddressData {
  houseNo?: string
  road?: string
  locality?: string
  town?: string
  county?: string
  postCode?: string
}

interface PostcodeLookupProps {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  onAddressSelect: (address: AddressData) => void
  addressData: AddressData
  onAddressChange: (field: keyof AddressData, value: string) => void
  className?: string
  disabled?: boolean
}

interface LookupAddress {
  line1: string
  line2: string | null
  town: string
  county: string
  postcode: string
  fullAddress: string
}

export function PostcodeLookup({
  postcode,
  onPostcodeChange,
  onAddressSelect,
  addressData,
  onAddressChange,
  className = "",
  disabled = false
}: PostcodeLookupProps) {
  const [loading, setLoading] = useState(false)
  const [addresses, setAddresses] = useState<LookupAddress[]>([])
  const [showAddresses, setShowAddresses] = useState(false)
  const [postcodeValid, setPostcodeValid] = useState<boolean | null>(null)

  const validatePostcode = (pc: string) => {
    // UK postcode regex
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
    return postcodeRegex.test(pc.trim())
  }

  const handlePostcodeChange = (value: string) => {
    const upperValue = value.toUpperCase()
    onPostcodeChange(upperValue)

    // Reset validation state when typing
    setPostcodeValid(null)
    setShowAddresses(false)
    setAddresses([])
  }

  const lookupPostcode = async () => {
    if (!postcode.trim()) {
      toast.error("Please enter a postcode")
      return
    }

    if (!validatePostcode(postcode)) {
      toast.error("Please enter a valid UK postcode")
      setPostcodeValid(false)
      return
    }

    setLoading(true)
    setPostcodeValid(null)

    try {
      // First get basic postcode info
      const basicResponse = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`)
      const basicData = await basicResponse.json()

      if (!basicData.success) {
        toast.error("Postcode not found")
        setPostcodeValid(false)
        return
      }

      setPostcodeValid(true)

      // Auto-fill town and county from basic lookup
      onAddressChange('town', basicData.town || '')
      onAddressChange('county', basicData.county || '')
      onAddressChange('postCode', basicData.postcode || postcode)

      // Show success message with area information
      const areaInfo = [basicData.town, basicData.county].filter(Boolean).join(', ')
      toast.success(`Postcode found: ${areaInfo}. Please enter house number and street manually.`)
    } catch (error) {
      console.error('Postcode lookup error:', error)
      toast.error("Failed to lookup postcode")
      setPostcodeValid(false)
    } finally {
      setLoading(false)
    }
  }

  const selectAddress = (address: LookupAddress) => {
    // Parse the first line to extract house number and road
    const line1Parts = address.line1.split(' ')
    const houseNo = line1Parts[0] || ''
    const road = line1Parts.slice(1).join(' ') || ''

    const selectedAddress: AddressData = {
      houseNo,
      road,
      locality: address.line2 || '',
      town: address.town,
      county: address.county,
      postCode: address.postcode
    }

    onAddressSelect(selectedAddress)
    setShowAddresses(false)
    toast.success("Address selected")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lookupPostcode()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Postcode Input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="postcode" className="text-sm font-bold text-gray-800 mb-2 block">Postcode</Label>
          <div className="relative">
            <Input
              id="postcode"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., SW1A 1AA"
              disabled={disabled || loading}
              className={`pr-8 h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900 ${
                postcodeValid === true ? 'border-green-500' :
                postcodeValid === false ? 'border-red-500' : ''
              }`}
            />
            {postcodeValid === true && (
              <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
            )}
            {postcodeValid === false && (
              <X className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={lookupPostcode}
            disabled={disabled || loading || !postcode.trim()}
            className="gap-2 h-12 px-6 text-base font-bold bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            Lookup
          </Button>
        </div>
      </div>

      {/* Address Selection */}
      {showAddresses && addresses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select an address:</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {addresses.map((address, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectAddress(address)}
                  className="w-full text-left p-2 rounded border hover:bg-gray-50 transition-colors text-sm"
                >
                  {address.fullAddress}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Address Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="houseNo" className="text-sm font-bold text-gray-800 mb-2 block">House Number/Name</Label>
          <Input
            id="houseNo"
            value={addressData.houseNo || ''}
            onChange={(e) => onAddressChange('houseNo', e.target.value.toUpperCase())}
            placeholder="House number or name"
            disabled={disabled}
            className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <Label htmlFor="road" className="text-sm font-bold text-gray-800 mb-2 block">Street Address</Label>
          <Input
            id="road"
            value={addressData.road || ''}
            onChange={(e) => onAddressChange('road', e.target.value.toUpperCase())}
            placeholder="Street address"
            disabled={disabled}
            className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <Label htmlFor="locality" className="text-sm font-bold text-gray-800 mb-2 block">Locality</Label>
          <Input
            id="locality"
            value={addressData.locality || ''}
            onChange={(e) => onAddressChange('locality', e.target.value.toUpperCase())}
            placeholder="Locality (optional)"
            disabled={disabled}
            className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="town" className="text-sm font-bold text-gray-800 mb-2 block">Town/City</Label>
            <Input
              id="town"
              value={addressData.town || ''}
              onChange={(e) => onAddressChange('town', e.target.value.toUpperCase())}
              placeholder="Town or city"
              disabled={disabled}
              className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <Label htmlFor="county" className="text-sm font-bold text-gray-800 mb-2 block">County</Label>
            <Input
              id="county"
              value={addressData.county || ''}
              onChange={(e) => onAddressChange('county', e.target.value.toUpperCase())}
              placeholder="County (optional)"
              disabled={disabled}
              className="h-12 text-lg font-bold uppercase bg-white border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
