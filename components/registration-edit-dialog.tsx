"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Car, Save, X, RefreshCw, AlertTriangle } from "lucide-react"

// Import shared types
import type { Vehicle, Customer } from "@/types/vehicle"

interface RegistrationEditDialogProps {
  vehicle: Vehicle | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (vehicle: Vehicle) => void
}

export function RegistrationEditDialog({ vehicle, open, onOpenChange, onSave }: RegistrationEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Vehicle>>({})
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && vehicle) {
      console.log("✏️ Edit Dialog opened for:", vehicle.registration)
      setFormData({
        ...vehicle,
        customer: vehicle.customer || undefined,
      })
      setErrors({})
    }
  }, [open, vehicle])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.registration?.trim()) {
      newErrors.registration = "Registration is required"
    } else if (!/^[A-Z0-9\s]{1,8}$/i.test(formData.registration.trim())) {
      newErrors.registration = "Invalid registration format"
    }

    if (!formData.make?.trim()) {
      newErrors.make = "Make is required"
    }

    if (!formData.model?.trim()) {
      newErrors.model = "Model is required"
    }

    if (!formData.year?.trim()) {
      newErrors.year = "Year is required"
    } else if (!/^\d{4}$/.test(formData.year.trim())) {
      newErrors.year = "Year must be 4 digits"
    }

    if (formData.vin && formData.vin.length > 0 && formData.vin.length !== 17) {
      newErrors.vin = "VIN must be exactly 17 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      console.log("💾 Saving vehicle:", formData)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedVehicle: Vehicle = {
        ...vehicle!,
        ...formData,
        registration: formData.registration!.toUpperCase().trim(),
        make: formData.make!.trim(),
        model: formData.model!.trim(),
        year: formData.year!.trim(),
        colour: formData.colour?.trim() || undefined,
        fuelType: formData.fuelType?.trim() || undefined,
        vin: formData.vin?.trim().toUpperCase() || undefined,
        engineCode: formData.engineCode?.trim().toUpperCase() || undefined,
      }

      onSave(updatedVehicle)

      toast({
        title: "Vehicle Updated",
        description: `${updatedVehicle.registration} has been successfully updated`,
      })

      console.log("✅ Vehicle saved successfully:", updatedVehicle)
    } catch (error) {
      console.error("❌ Error saving vehicle:", error)
      toast({
        title: "Save Error",
        description: "Failed to save vehicle. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    console.log("❌ Edit cancelled")
    setFormData({})
    setErrors({})
    onOpenChange(false)
  }

  if (!vehicle) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Edit Vehicle - {vehicle.registration}
          </DialogTitle>
          <DialogDescription>Update vehicle information and details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Essential vehicle details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration">
                    Registration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registration"
                    value={formData.registration || ""}
                    onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                    placeholder="AB12 CDE"
                    className={errors.registration ? "border-red-500" : ""}
                  />
                  {errors.registration && <p className="text-sm text-red-500">{errors.registration}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="year"
                    value={formData.year || ""}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2020"
                    className={errors.year ? "border-red-500" : ""}
                  />
                  {errors.year && <p className="text-sm text-red-500">{errors.year}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">
                    Make <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="make"
                    value={formData.make || ""}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="Ford"
                    className={errors.make ? "border-red-500" : ""}
                  />
                  {errors.make && <p className="text-sm text-red-500">{errors.make}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">
                    Model <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="model"
                    value={formData.model || ""}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Focus"
                    className={errors.model ? "border-red-500" : ""}
                  />
                  {errors.model && <p className="text-sm text-red-500">{errors.model}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Details</CardTitle>
              <CardDescription>Optional vehicle specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colour">Colour</Label>
                  <Select
                    value={formData.colour || ""}
                    onValueChange={(value) => setFormData({ ...formData, colour: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select colour" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Black">Black</SelectItem>
                      <SelectItem value="White">White</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Grey">Grey</SelectItem>
                      <SelectItem value="Blue">Blue</SelectItem>
                      <SelectItem value="Red">Red</SelectItem>
                      <SelectItem value="Green">Green</SelectItem>
                      <SelectItem value="Yellow">Yellow</SelectItem>
                      <SelectItem value="Orange">Orange</SelectItem>
                      <SelectItem value="Purple">Purple</SelectItem>
                      <SelectItem value="Brown">Brown</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select
                    value={formData.fuelType || ""}
                    onValueChange={(value) => setFormData({ ...formData, fuelType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="LPG">LPG</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
                <Input
                  id="vin"
                  value={formData.vin || ""}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  placeholder="17-character VIN"
                  maxLength={17}
                  className={errors.vin ? "border-red-500" : ""}
                />
                {errors.vin && <p className="text-sm text-red-500">{errors.vin}</p>}
                <p className="text-xs text-muted-foreground">Optional: 17-character vehicle identification number</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="engineCode">Engine Code</Label>
                <Input
                  id="engineCode"
                  value={formData.engineCode || ""}
                  onChange={(e) => setFormData({ ...formData, engineCode: e.target.value })}
                  placeholder="Engine code"
                />
                <p className="text-xs text-muted-foreground">Optional: Engine identification code</p>
              </div>
            </CardContent>
          </Card>

          {/* Current MOT Status */}
          {vehicle.motStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Current MOT Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={vehicle.motStatus === "Valid" ? "default" : "destructive"}>{vehicle.motStatus}</Badge>
                  {vehicle.motExpiry && (
                    <span className="text-sm text-muted-foreground">
                      Expires: {new Date(vehicle.motExpiry).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  MOT information is automatically updated from DVSA records
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
