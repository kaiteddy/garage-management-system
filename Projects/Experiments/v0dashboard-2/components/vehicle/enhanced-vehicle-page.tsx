"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  FileText,
  User,
  ExternalLink,
  RefreshCw,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Wrench
} from "lucide-react"
import { VehicleServiceHistory } from "@/components/vehicle/vehicle-service-history"
import { MOTHistoryVisualization } from "@/components/vehicle/mot-history-visualization"
import { PartSoupButton } from "@/components/ui/partsoup-button"
import { SevenZapButton } from "@/components/ui/sevenzap-button"
import { PostcodeLookup } from "@/components/ui/postcode-lookup"
import { ManufacturerLogo } from "@/components/ui/manufacturer-logo"
import { VehicleImageXL } from "@/components/vehicle-image"
import { ChangeOwnerDialog } from "@/components/vehicle/change-owner-dialog"

interface VehicleDetails {
  registration: string
  make: string
  model: string
  year: number
  color: string
  fuelType: string
  engineSize: number
  vin: string
  motStatus: string
  motExpiryDate: string
  taxStatus: string
  taxDueDate: string
  vehicleAge: number
  sornStatus: string
  yearOfManufacture: number
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    addressLine1: string
    addressLine2: string
    city: string
    postcode: string
    country: string
  }
}

interface EnhancedVehiclePageProps {
  registration: string
}

export function EnhancedVehiclePage({ registration }: EnhancedVehiclePageProps) {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [customerData, setCustomerData] = useState<any>({})
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [fetchingMotHistory, setFetchingMotHistory] = useState(false)
  const [motHistoryFetched, setMotHistoryFetched] = useState(false)
  const [showChangeOwnerDialog, setShowChangeOwnerDialog] = useState(false)
  // Prevent repeated auto-fetch attempts per registration to avoid loops
  const autoFetchAttemptedRef = useRef(false)

  const handleBackNavigation = () => {
    // Simple navigation back to vehicles page
    router.push('/vehicles')
  }

  const fetchMotHistory = useCallback(async () => {
    try {
      setFetchingMotHistory(true)
      setError(null)

      console.log(`🔍 Fetching MOT history for ${registration}...`)

      const response = await fetch(`/api/vehicles/${encodeURIComponent(registration)}/fetch-exact-mot-history`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        console.log('✅ MOT history fetched successfully')
        setMotHistoryFetched(true)
        // Trigger a reload of vehicle data
        setMotHistoryFetched(prev => !prev)
      } else {
        console.log('⚠️ MOT history fetch failed:', data.error)

        // Show user-friendly error with manual check option
        if (data.manualCheckUrl) {
          setError(`${data.error}. ${data.details || ''} You can check MOT history manually at: ${data.manualCheckUrl}`)
        } else {
          setError(data.error || 'Failed to fetch MOT history')
        }
      }
    } catch (err) {
      console.error('Error fetching MOT history:', err)
      setError('Network error while fetching MOT history. Please try again.')
    } finally {
      setFetchingMotHistory(false)
    }
  }, [registration])

  const loadVehicleDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/vehicles/${encodeURIComponent(registration)}`)
      const data = await response.json()

      if (data.success) {
        setVehicle(data.vehicle)
        setCustomerData(data.vehicle.customer || {})

        // Auto-fetch MOT/Tax if missing, guarded to avoid infinite loops
        const needsMotOrTax = !data.vehicle.motStatus || !data.vehicle.taxStatus || (!data.vehicle.motExpiryDate && !data.vehicle.taxDueDate)
        if (needsMotOrTax && !autoFetchAttemptedRef.current) {
          autoFetchAttemptedRef.current = true
          try {
            await fetchMotHistory()
          } catch (e) {
            console.warn('Auto-fetch MOT/Tax failed:', e)
          }
        }
      } else {
        setError(data.error || 'Failed to load vehicle details')
      }
    } catch (err) {
      setError('Failed to load vehicle details')
      console.error('Error loading vehicle:', err)
    } finally {
      setLoading(false)
    }
  }, [registration, motHistoryFetched, fetchMotHistory])

  const refreshVehicleData = async () => {
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(registration)}/refresh`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        await loadVehicleDetails()
      }
    } catch (err) {
      console.error('Error refreshing vehicle data:', err)
    }
  }

  useEffect(() => {
    setMotHistoryFetched(false) // Reset the flag when registration changes
    autoFetchAttemptedRef.current = false // Allow auto-fetch for new registrations
    loadVehicleDetails()
  }, [registration, loadVehicleDetails])

  const saveCustomerData = async () => {
    if (!vehicle?.customer?.id) return

    try {
      setSavingCustomer(true)
      const response = await fetch(`/api/customers/${vehicle.customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      })

      const data = await response.json()

      if (data.success) {
        setVehicle(prev => prev ? {
          ...prev,
          customer: { ...prev.customer, ...customerData }
        } : null)
        setEditingCustomer(false)
      } else {
        setError('Failed to update customer information')
      }
    } catch (err) {
      setError('Failed to update customer information')
      console.error('Error updating customer:', err)
    } finally {
      setSavingCustomer(false)
    }
  }

  const openDVLAMOTCheck = () => {
    const cleanReg = registration.replace(/\s/g, '')
    const dvlaUrl = `https://www.check-mot.service.gov.uk/results?registration=${cleanReg}&checkRecalls=true`
    window.open(dvlaUrl, '_blank')
  }

  const handleOwnerChanged = (newOwner: any) => {
    // Refresh vehicle data to get updated owner information
    fetchVehicleData()
  }

  const isValidEmail = (email: string) => {
    if (!email) return false

    // Check for fake/placeholder emails
    const fakeEmailPatterns = [
      /noemail\./,
      /placeholder\./,
      /example\./,
      /test\./,
      /fake\./,
      /dummy\./,
      /temp\./,
      /^[a-f0-9]{32,}@/i, // Long hex strings
      /@placeholder\./,
      /@example\./,
      /@test\./,
      /@fake\./
    ]

    return !fakeEmailPatterns.some(pattern => pattern.test(email))
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} days ago`
    } else if (diffDays === 0) {
      return 'Expires today'
    } else {
      return `Expires in ${diffDays} days`
    }
  }

  const getMotStatusBadge = (status: string, expiryDate: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (status.toLowerCase().includes('valid')) {
      if (diffDays < 0) return 'bg-red-100 text-red-800' // Expired
      if (diffDays <= 14) return 'bg-red-100 text-red-800' // Critical (14 days or less)
      if (diffDays <= 30) return 'bg-orange-100 text-orange-800' // Due soon (30 days or less)
      return 'bg-green-100 text-green-800' // Valid
    }
    return 'bg-red-100 text-red-800'
  }

  const getTaxStatusBadge = (status: string, expiryDate: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (status.toLowerCase().includes('taxed')) {
      if (diffDays < 0) return 'bg-red-100 text-red-800' // Expired
      if (diffDays <= 14) return 'bg-red-100 text-red-800' // Critical (14 days or less)
      if (diffDays <= 30) return 'bg-orange-100 text-orange-800' // Due soon (30 days or less)
      return 'bg-green-100 text-green-800' // Valid
    }
    return 'bg-red-100 text-red-800'
  }

  const getActualMotStatus = (status: string, expiryDate: string) => {
    if (!status || !expiryDate) return status || 'Unknown'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Override status if expired
    if (diffDays < 0) return 'Expired'
    return status
  }

  const getActualTaxStatus = (status: string, expiryDate: string) => {
    if (!status || !expiryDate) return status || 'Unknown'

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Override status if expired
    if (diffDays < 0) return 'Expired'
    return status
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vehicle details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Vehicle</h3>
            <p className="text-muted-foreground mb-4">{error || 'Vehicle not found'}</p>
            <Button onClick={() => router.push('/vehicles')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackNavigation}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <ManufacturerLogo make={vehicle.make} size="lg" />
          <div>
            <div className="bg-yellow-400 border-2 border-black rounded-lg px-4 py-2 mb-2 inline-block">
              <h1 className="text-2xl font-black text-black tracking-wider">
                {vehicle.registration}
              </h1>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={openDVLAMOTCheck}>
            <ExternalLink className="h-4 w-4 mr-2" />
            DVLA Check
          </Button>
          <Button onClick={refreshVehicleData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Vehicle Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Registration</Label>
                <p className="font-medium">{vehicle.registration}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Make & Model</Label>
                <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Year</Label>
                <p className="font-medium">{vehicle.year || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Color</Label>
                <p className="font-medium">{vehicle.color || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                <p className="font-medium">{vehicle.fuelType || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Engine Size</Label>
                <p className="font-medium">{vehicle.engineSize || 'Unknown'}</p>
              </div>
              {vehicle.vin && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">VIN</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-vin">{vehicle.vin}</p>
                    <div className="flex gap-1">
                      <PartSoupButton vin={vehicle.vin} />
                      <SevenZapButton vin={vehicle.vin} make={vehicle.make} />
                    </div>
                    <PartSoupButton vin={vehicle.vin} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Image
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <VehicleImageXL
              vrm={vehicle.registration}
              make={vehicle.make}
              model={vehicle.model}
              year={vehicle.year}
              className="rounded-lg"
            />
          </CardContent>
        </Card>
      </div>

      {/* MOT & Tax Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MOT & Tax Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              MOT & Tax Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">MOT Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getMotStatusBadge(vehicle.motStatus, vehicle.motExpiryDate)}>
                    {getActualMotStatus(vehicle.motStatus, vehicle.motExpiryDate)}
                  </Badge>
                  {vehicle.motExpiryDate && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(vehicle.motExpiryDate)}
                    </span>
                  )}
                </div>
                {vehicle.motExpiryDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {new Date(vehicle.motExpiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tax Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getTaxStatusBadge(vehicle.taxStatus, vehicle.taxDueDate)}>
                    {getActualTaxStatus(vehicle.taxStatus, vehicle.taxDueDate)}
                  </Badge>
                  {vehicle.taxDueDate && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(vehicle.taxDueDate)}
                    </span>
                  )}
                </div>
                {vehicle.taxDueDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {new Date(vehicle.taxDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">SORN Status</Label>
                <p className="font-medium">{vehicle.sornStatus || 'unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      {vehicle.customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangeOwnerDialog(true)}
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                >
                  <User className="h-4 w-4 mr-2" />
                  Change Owner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editingCustomer) {
                      setCustomerData(vehicle.customer)
                      setEditingCustomer(false)
                    } else {
                      setEditingCustomer(true)
                    }
                  }}
                >
                  {editingCustomer ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                {editingCustomer ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={customerData.firstName || ''}
                      onChange={(e) => setCustomerData({...customerData, firstName: e.target.value})}
                      placeholder="First Name"
                    />
                    <Input
                      value={customerData.lastName || ''}
                      onChange={(e) => setCustomerData({...customerData, lastName: e.target.value})}
                      placeholder="Last Name"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-lg">
                    {vehicle.customer.firstName} {vehicle.customer.lastName}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                {editingCustomer ? (
                  <Input
                    value={customerData.phone || ''}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    placeholder="Phone number"
                    className="mt-1"
                  />
                ) : vehicle.customer.phone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium">{vehicle.customer.phone}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`tel:${vehicle.customer.phone}`, '_self')}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1">No phone number</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                {editingCustomer ? (
                  <Input
                    type="email"
                    value={customerData.email || ''}
                    onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    placeholder="Email address"
                    className="mt-1"
                  />
                ) : vehicle.customer.email && isValidEmail(vehicle.customer.email) ? (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium">{vehicle.customer.email}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`mailto:${vehicle.customer.email}`, '_self')}
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1">No valid email</p>
                )}
              </div>

              {(vehicle.customer.addressLine1 || vehicle.customer.city || vehicle.customer.postcode || editingCustomer) && (
                <div className="md:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  {editingCustomer ? (
                    <div className="mt-1">
                      <PostcodeLookup
                        postcode={customerData.postcode || ''}
                        onPostcodeChange={(postcode) => setCustomerData({...customerData, postcode})}
                        onAddressSelect={(address) => {
                          setCustomerData({
                            ...customerData,
                            addressLine1: [address.houseNo, address.road].filter(Boolean).join(' '),
                            addressLine2: address.locality || '',
                            city: address.town || '',
                            postcode: address.postCode || ''
                          })
                        }}
                        addressData={{
                          houseNo: customerData.addressLine1?.split(' ')[0] || '',
                          road: customerData.addressLine1?.split(' ').slice(1).join(' ') || '',
                          locality: customerData.addressLine2 || '',
                          town: customerData.city || '',
                          county: '', // Not stored separately in this component
                          postCode: customerData.postcode || ''
                        }}
                        onAddressChange={(field, value) => {
                          if (field === 'houseNo' || field === 'road') {
                            const houseNo = field === 'houseNo' ? value : customerData.addressLine1?.split(' ')[0] || ''
                            const road = field === 'road' ? value : customerData.addressLine1?.split(' ').slice(1).join(' ') || ''
                            setCustomerData({...customerData, addressLine1: [houseNo, road].filter(Boolean).join(' ')})
                          } else if (field === 'locality') {
                            setCustomerData({...customerData, addressLine2: value})
                          } else if (field === 'town') {
                            setCustomerData({...customerData, city: value})
                          } else if (field === 'postCode') {
                            setCustomerData({...customerData, postcode: value})
                          }
                        }}
                        className="max-w-2xl"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        {vehicle.customer.addressLine1 && <p>{vehicle.customer.addressLine1}</p>}
                        {vehicle.customer.addressLine2 && <p>{vehicle.customer.addressLine2}</p>}
                        <p>
                          {[vehicle.customer.city, vehicle.customer.postcode, vehicle.customer.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2"
                        onClick={() => {
                          const address = [
                            vehicle.customer.addressLine1,
                            vehicle.customer.addressLine2,
                            vehicle.customer.city,
                            vehicle.customer.postcode,
                            vehicle.customer.country
                          ].filter(Boolean).join(', ')
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                          window.open(mapsUrl, '_blank')
                        }}
                        title="View on Google Maps"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {editingCustomer && (
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCustomerData(vehicle.customer)
                    setEditingCustomer(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveCustomerData}
                  disabled={savingCustomer}
                >
                  {savingCustomer ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service History Tabs */}
      <Tabs defaultValue="service" className="space-y-4">
        <TabsList>
          <TabsTrigger value="service">Service History</TabsTrigger>
          <TabsTrigger value="mot">MOT History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="service">
          <VehicleServiceHistory registration={vehicle.registration} />
        </TabsContent>

        <TabsContent value="mot">
          <div className="space-y-4">
            {(!vehicle?.motHistory || !Array.isArray(vehicle.motHistory) || vehicle.motHistory.length === 0) && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    {fetchingMotHistory ? (
                      <>
                        <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h3 className="text-lg font-semibold mb-2">Fetching MOT History</h3>
                        <p className="text-muted-foreground mb-4">
                          Retrieving MOT history from DVLA database...
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                          🔄 This may take a few moments while we fetch the latest data
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No MOT History Available</h3>
                        <p className="text-muted-foreground mb-4">
                          MOT history data is not available for this vehicle. Click below to fetch from DVLA.
                        </p>
                        <Button
                          onClick={fetchMotHistory}
                          disabled={fetchingMotHistory}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Fetch MOT History from DVLA
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <MOTHistoryVisualization
              motHistory={vehicle?.motHistory || []}
              currentMotStatus={vehicle?.motStatus}
              currentMotExpiry={vehicle?.motExpiryDate}
              currentTaxStatus={vehicle?.taxStatus}
              currentTaxExpiry={vehicle?.taxDueDate}
              registration={vehicle?.registration || ''}
            />
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>All documents related to this vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>Documents will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Owner Dialog */}
      <ChangeOwnerDialog
        open={showChangeOwnerDialog}
        onOpenChange={setShowChangeOwnerDialog}
        vehicleRegistration={registration}
        currentOwner={vehicle?.customer ? {
          id: vehicle.customer.id,
          name: `${vehicle.customer.firstName} ${vehicle.customer.lastName}`,
          phone: vehicle.customer.phone,
          email: vehicle.customer.email
        } : null}
        onOwnerChanged={handleOwnerChanged}
      />
    </div>
  )
}
