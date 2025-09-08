"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Car, MapPin, Search, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface VDGAddressData {
  houseNumber: string
  houseName: string
  road: string
  locality: string
  town: string
  county: string
  postCode: string
  country: string
  fullAddress: string
}

interface VDGAddressLookupProps {
  registration: string
  onRegistrationChange: (registration: string) => void
  onAddressFound: (address: VDGAddressData) => void
  className?: string
  disabled?: boolean
  showCost?: boolean
}

export function VDGAddressLookup({
  registration,
  onRegistrationChange,
  onAddressFound,
  className = "",
  disabled = false,
  showCost = true
}: VDGAddressLookupProps) {
  const [loading, setLoading] = useState(false)
  const [lastLookup, setLastLookup] = useState<{
    registration: string
    address: VDGAddressData
    cost: number
    timestamp: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateRegistration = (reg: string) => {
    // UK registration regex - basic validation
    const regexes = [
      /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$/i, // Current format: AB12 CDE
      /^[A-Z][0-9]{1,3}\s?[A-Z]{3}$/i,  // Prefix format: A123 BCD
      /^[A-Z]{3}\s?[0-9]{1,3}[A-Z]$/i,  // Suffix format: ABC 123D
      /^[0-9]{1,4}\s?[A-Z]{1,3}$/i      // Dateless format: 1234 AB
    ]
    return regexes.some(regex => regex.test(reg.trim()))
  }

  const handleRegistrationChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
    onRegistrationChange(upperValue)
    setError(null)
    setLastLookup(null)
  }

  const lookupAddress = async () => {
    if (!registration.trim()) {
      toast.error("Please enter a vehicle registration")
      return
    }

    if (!validateRegistration(registration)) {
      toast.error("Please enter a valid UK vehicle registration")
      setError("Invalid registration format")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🏠 [VDG-ADDRESS-LOOKUP] Looking up address for ${registration}`)

      const response = await fetch('/api/vdg-address-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registration: registration.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ [VDG-ADDRESS-LOOKUP] Address found:`, data.data.address)
        
        setLastLookup({
          registration: data.data.registration,
          address: data.data.address,
          cost: data.data.cost,
          timestamp: data.timestamp
        })

        // Call the callback with the address data
        onAddressFound(data.data.address)

        // Show success message
        const costText = showCost ? ` (Cost: £${data.data.cost.toFixed(4)})` : ''
        toast.success(`Address found for ${data.data.registration}${costText}`)

      } else {
        console.log(`❌ [VDG-ADDRESS-LOOKUP] Address lookup failed:`, data.error)
        setError(data.error || 'Address lookup failed')
        toast.error(data.error || 'No address found for this registration')
      }

    } catch (error) {
      console.error('VDG address lookup error:', error)
      setError('Failed to lookup address')
      toast.error('Failed to lookup address. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      lookupAddress()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Vehicle Address Lookup
        </CardTitle>
        <CardDescription>
          Find the registered keeper's address using the vehicle registration (£0.05 per lookup)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registration Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="registration">Vehicle Registration</Label>
            <Input
              id="registration"
              placeholder="e.g. AB12 CDE"
              value={registration}
              onChange={(e) => handleRegistrationChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled || loading}
              className="uppercase"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={lookupAddress}
              disabled={disabled || loading || !registration.trim()}
              size="default"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? 'Looking up...' : 'Lookup'}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Success Display */}
        {lastLookup && (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Address found for {lastLookup.registration}
              {showCost && (
                <Badge variant="secondary" className="ml-2">
                  £{lastLookup.cost.toFixed(4)}
                </Badge>
              )}
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <div className="font-medium">{lastLookup.address.fullAddress}</div>
                  <div className="text-muted-foreground mt-1">
                    This address has been automatically filled in the form below
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
