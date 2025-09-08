"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Search, Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react"
import { toast } from "sonner"

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

interface EnhancedPostcodeLookupProps {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  addressData: AddressData
  onAddressChange: (field: keyof AddressData, value: string) => void
  onAddressComplete?: (address: AddressData) => void
  className?: string
  disabled?: boolean
  autoLookup?: boolean
  showQuickFill?: boolean
}

export function EnhancedPostcodeLookup({
  postcode,
  onPostcodeChange,
  addressData,
  onAddressChange,
  onAddressComplete,
  className = "",
  disabled = false,
  autoLookup = true,
  showQuickFill = true
}: EnhancedPostcodeLookupProps) {
  const [loading, setLoading] = useState(false)
  const [postcodeValid, setPostcodeValid] = useState<boolean | null>(null)
  const [postcodeInfo, setPostcodeInfo] = useState<any>(null)
  const [quickFillSuggestions, setQuickFillSuggestions] = useState<string[]>([])

  const validatePostcode = (pc: string) => {
    // Enhanced UK postcode regex
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
    return postcodeRegex.test(pc.trim())
  }

  const handlePostcodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
    onPostcodeChange(upperValue)

    // Reset validation state when typing
    setPostcodeValid(null)
    setPostcodeInfo(null)
    setQuickFillSuggestions([])

    // Auto-lookup when postcode looks complete
    if (autoLookup && validatePostcode(upperValue)) {
      lookupPostcode(upperValue)
    }
  }

  const lookupPostcode = async (pc?: string) => {
    const postcodeToLookup = pc || postcode
    
    if (!postcodeToLookup.trim()) {
      toast.error("Please enter a postcode")
      return
    }

    if (!validatePostcode(postcodeToLookup)) {
      toast.error("Please enter a valid UK postcode")
      setPostcodeValid(false)
      return
    }

    setLoading(true)
    setPostcodeValid(null)

    try {
      console.log(`🔍 [POSTCODE-LOOKUP] Looking up: ${postcodeToLookup}`)

      const response = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcodeToLookup)}`)
      const data = await response.json()

      if (data.success) {
        console.log(`✅ [POSTCODE-LOOKUP] Found:`, data)
        
        setPostcodeValid(true)
        setPostcodeInfo(data)

        // Auto-fill available fields
        if (data.town) onAddressChange('town', data.town)
        if (data.county) onAddressChange('county', data.county)
        if (data.region && !data.county) onAddressChange('county', data.region)
        if (data.country) onAddressChange('country', data.country)
        onAddressChange('postCode', data.postcode || postcodeToLookup)

        // Generate quick-fill suggestions for common street patterns
        if (showQuickFill) {
          generateQuickFillSuggestions(data)
        }

        // Show success message
        const areaInfo = [data.town, data.county || data.region].filter(Boolean).join(', ')
        toast.success(`Postcode found: ${areaInfo}`)

        // Call completion callback if provided
        if (onAddressComplete) {
          onAddressComplete({
            ...addressData,
            town: data.town || addressData.town,
            county: data.county || data.region || addressData.county,
            postCode: data.postcode || postcodeToLookup,
            country: data.country || addressData.country
          })
        }

      } else {
        console.log(`❌ [POSTCODE-LOOKUP] Not found:`, data.error)
        setPostcodeValid(false)
        toast.error(data.error || "Postcode not found")
      }

    } catch (error) {
      console.error('Postcode lookup error:', error)
      setPostcodeValid(false)
      toast.error("Failed to lookup postcode")
    } finally {
      setLoading(false)
    }
  }

  const generateQuickFillSuggestions = (postcodeData: any) => {
    const suggestions: string[] = []
    
    // Common street types for the area
    const commonStreetTypes = ['Road', 'Street', 'Avenue', 'Lane', 'Close', 'Drive', 'Way', 'Gardens', 'Place', 'Court']
    
    // Generate suggestions based on town name
    if (postcodeData.town) {
      const townName = postcodeData.town
      suggestions.push(`${townName} Road`)
      suggestions.push(`${townName} Street`)
      suggestions.push(`High Street`)
      suggestions.push(`Main Street`)
      suggestions.push(`Church Lane`)
      suggestions.push(`Victoria Road`)
      suggestions.push(`Station Road`)
    }

    setQuickFillSuggestions(suggestions.slice(0, 5)) // Limit to 5 suggestions
  }

  const handleQuickFill = (suggestion: string) => {
    onAddressChange('road', suggestion)
    toast.success(`Filled: ${suggestion}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lookupPostcode()
    }
  }

  const isAddressComplete = () => {
    return addressData.houseNumber && addressData.road && addressData.town && addressData.postCode
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Postcode Input */}
      <div className="space-y-2">
        <Label htmlFor="postcode" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Postcode
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="postcode"
              placeholder="e.g. SW1A 1AA"
              value={postcode}
              onChange={(e) => handlePostcodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled || loading}
              className={`uppercase ${
                postcodeValid === true ? 'border-green-500' : 
                postcodeValid === false ? 'border-red-500' : ''
              }`}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
            {postcodeValid === true && (
              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {postcodeValid === false && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>
          {!autoLookup && (
            <Button
              onClick={() => lookupPostcode()}
              disabled={disabled || loading || !postcode.trim()}
              size="default"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Postcode Info Display */}
      {postcodeInfo && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Postcode Found</span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              {[postcodeInfo.town, postcodeInfo.county || postcodeInfo.region, postcodeInfo.country]
                .filter(Boolean)
                .join(', ')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Fill Suggestions */}
      {showQuickFill && quickFillSuggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Fill Suggestions
            </CardTitle>
            <CardDescription className="text-xs">
              Common street names for this area
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {quickFillSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill(suggestion)}
                  disabled={disabled}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="houseNumber">House Number</Label>
          <Input
            id="houseNumber"
            placeholder="e.g. 123"
            value={addressData.houseNumber}
            onChange={(e) => onAddressChange('houseNumber', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="houseName">House Name (optional)</Label>
          <Input
            id="houseName"
            placeholder="e.g. Rose Cottage"
            value={addressData.houseName}
            onChange={(e) => onAddressChange('houseName', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="road">Street Address</Label>
          <Input
            id="road"
            placeholder="e.g. High Street"
            value={addressData.road}
            onChange={(e) => onAddressChange('road', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locality">Locality (optional)</Label>
          <Input
            id="locality"
            placeholder="e.g. City Centre"
            value={addressData.locality}
            onChange={(e) => onAddressChange('locality', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="town">Town/City</Label>
          <Input
            id="town"
            placeholder="e.g. London"
            value={addressData.town}
            onChange={(e) => onAddressChange('town', e.target.value)}
            disabled={disabled}
            className={postcodeInfo ? 'bg-green-50' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="county">County</Label>
          <Input
            id="county"
            placeholder="e.g. Greater London"
            value={addressData.county}
            onChange={(e) => onAddressChange('county', e.target.value)}
            disabled={disabled}
            className={postcodeInfo ? 'bg-green-50' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            placeholder="e.g. England"
            value={addressData.country}
            onChange={(e) => onAddressChange('country', e.target.value)}
            disabled={disabled}
            className={postcodeInfo ? 'bg-green-50' : ''}
          />
        </div>
      </div>

      {/* Address Completion Status */}
      {isAddressComplete() && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Address Complete</span>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {[
                [addressData.houseNumber, addressData.houseName].filter(Boolean).join(' '),
                addressData.road,
                addressData.locality,
                addressData.town,
                addressData.county,
                addressData.postCode
              ].filter(Boolean).join(', ')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
