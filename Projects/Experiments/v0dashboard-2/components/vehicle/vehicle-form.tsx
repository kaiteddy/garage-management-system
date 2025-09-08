"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, Car, Calendar, Fuel, Wrench, User, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VehicleFormProps {
  registration?: string
  initialData?: any
  onDataChange?: (data: any) => void
  onSave?: () => void
}

export function VehicleForm({ registration, initialData, onDataChange, onSave }: VehicleFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    registration: initialData?.registration || registration || '',
    make: initialData?.make || '',
    model: initialData?.model || '',
    year: initialData?.year || '',
    color: initialData?.color || '',
    fuelType: initialData?.fuel_type || '',
    engineSize: initialData?.engine_size || '',
    vin: initialData?.vin || '',
    motStatus: initialData?.mot_status || '',
    motExpiryDate: initialData?.mot_expiry_date || '',
    taxStatus: initialData?.tax_status || '',
    taxDueDate: initialData?.tax_due_date || '',
    customer: initialData?.customer || null
  })

  useEffect(() => {
    if (registration && !initialData) {
      loadVehicleData()
    }
  }, [registration])

  const loadVehicleData = async () => {
    if (!registration) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(registration)}`)
      const data = await response.json()
      
      if (data.success && data.vehicle) {
        const vehicle = data.vehicle
        setVehicleData({
          registration: vehicle.registration || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || '',
          color: vehicle.color || '',
          fuelType: vehicle.fuelType || '',
          engineSize: vehicle.engineSize || '',
          vin: vehicle.vin || '',
          motStatus: vehicle.motStatus || '',
          motExpiryDate: vehicle.motExpiryDate || '',
          taxStatus: vehicle.taxStatus || '',
          taxDueDate: vehicle.taxDueDate || '',
          customer: vehicle.customer || null
        })
      }
    } catch (error) {
      console.error('Error loading vehicle:', error)
      toast({
        title: "Error",
        description: "Failed to load vehicle data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...vehicleData, [field]: value }
    setVehicleData(newData)
    onDataChange?.(newData)
  }

  const handleDVLALookup = async () => {
    if (!vehicleData.registration) {
      toast({
        title: "Error",
        description: "Please enter a registration number",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/dvla-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registration: vehicleData.registration })
      })

      const data = await response.json()
      
      if (data.success && data.data) {
        const dvlaData = data.data
        const updatedData = {
          ...vehicleData,
          make: dvlaData.make || vehicleData.make,
          model: dvlaData.model || vehicleData.model,
          year: dvlaData.yearOfManufacture?.toString() || vehicleData.year,
          color: dvlaData.colour || vehicleData.color,
          fuelType: dvlaData.fuelType || vehicleData.fuelType,
          engineSize: dvlaData.engineCapacity ? `${dvlaData.engineCapacity}cc` : vehicleData.engineSize,
          motStatus: dvlaData.motStatus || vehicleData.motStatus,
          motExpiryDate: dvlaData.motExpiryDate || vehicleData.motExpiryDate,
          taxStatus: dvlaData.taxStatus || vehicleData.taxStatus,
          taxDueDate: dvlaData.taxDueDate || vehicleData.taxDueDate
        }
        
        setVehicleData(updatedData)
        onDataChange?.(updatedData)
        
        toast({
          title: "Success",
          description: "Vehicle data updated from DVLA",
        })
      } else {
        throw new Error(data.error || 'Vehicle not found')
      }
    } catch (error) {
      console.error('Error looking up vehicle:', error)
      toast({
        title: "Error",
        description: "Failed to lookup vehicle from DVLA",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/vehicles${registration ? `/${encodeURIComponent(registration)}` : ''}`, {
        method: registration ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration: vehicleData.registration,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year ? parseInt(vehicleData.year) : null,
          color: vehicleData.color,
          fuel_type: vehicleData.fuelType,
          engine_size: vehicleData.engineSize,
          vin: vehicleData.vin,
          mot_status: vehicleData.motStatus,
          mot_expiry_date: vehicleData.motExpiryDate,
          tax_status: vehicleData.taxStatus,
          tax_due_date: vehicleData.taxDueDate
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Vehicle ${registration ? 'updated' : 'created'} successfully`,
        })
        onSave?.()
      } else {
        throw new Error(data.error || 'Failed to save vehicle')
      }
    } catch (error) {
      console.error('Error saving vehicle:', error)
      toast({
        title: "Error",
        description: "Failed to save vehicle",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !vehicleData.registration) {
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
          <Car className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">
              {vehicleData.registration || 'New Vehicle'}
            </h1>
            <p className="text-gray-500">
              {vehicleData.make && vehicleData.model 
                ? `${vehicleData.make} ${vehicleData.model}`
                : 'Vehicle details'
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDVLALookup} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            DVLA Lookup
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Vehicle'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="registration">Registration</Label>
              <Input
                id="registration"
                value={vehicleData.registration}
                onChange={(e) => handleInputChange('registration', e.target.value.toUpperCase())}
                placeholder="AB12 CDE"
                className="font-mono"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={vehicleData.make}
                  onChange={(e) => handleInputChange('make', e.target.value)}
                  placeholder="Ford"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={vehicleData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="Focus"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={vehicleData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  placeholder="2020"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={vehicleData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="Blue"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={vehicleData.vin}
                onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                placeholder="Vehicle Identification Number"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Engine & Fuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Engine & Fuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Input
                id="fuelType"
                value={vehicleData.fuelType}
                onChange={(e) => handleInputChange('fuelType', e.target.value)}
                placeholder="Petrol"
              />
            </div>
            
            <div>
              <Label htmlFor="engineSize">Engine Size</Label>
              <Input
                id="engineSize"
                value={vehicleData.engineSize}
                onChange={(e) => handleInputChange('engineSize', e.target.value)}
                placeholder="1600cc"
              />
            </div>
          </CardContent>
        </Card>

        {/* MOT Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              MOT Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="motStatus">MOT Status</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="motStatus"
                  value={vehicleData.motStatus}
                  onChange={(e) => handleInputChange('motStatus', e.target.value)}
                  placeholder="Valid"
                />
                {vehicleData.motStatus && (
                  <Badge 
                    variant={vehicleData.motStatus === 'Valid' ? 'default' : 'destructive'}
                  >
                    {vehicleData.motStatus}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="motExpiryDate">MOT Expiry Date</Label>
              <Input
                id="motExpiryDate"
                type="date"
                value={vehicleData.motExpiryDate}
                onChange={(e) => handleInputChange('motExpiryDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tax Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="taxStatus">Tax Status</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="taxStatus"
                  value={vehicleData.taxStatus}
                  onChange={(e) => handleInputChange('taxStatus', e.target.value)}
                  placeholder="Taxed"
                />
                {vehicleData.taxStatus && (
                  <Badge 
                    variant={vehicleData.taxStatus === 'Taxed' ? 'default' : 'destructive'}
                  >
                    {vehicleData.taxStatus}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="taxDueDate">Tax Due Date</Label>
              <Input
                id="taxDueDate"
                type="date"
                value={vehicleData.taxDueDate}
                onChange={(e) => handleInputChange('taxDueDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      {vehicleData.customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name</Label>
                <p className="font-medium">
                  {vehicleData.customer.firstName} {vehicleData.customer.lastName}
                </p>
              </div>
              <div>
                <Label>Phone</Label>
                <p className="font-medium">{vehicleData.customer.phone}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="font-medium">{vehicleData.customer.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
