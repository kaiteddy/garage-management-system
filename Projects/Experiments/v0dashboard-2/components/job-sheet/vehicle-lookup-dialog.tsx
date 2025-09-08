"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Car, Loader2, Database, DollarSign } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { DVLAVehicleData } from "@/lib/types/job-sheet"
import { VehicleDataSelector } from "@/components/vehicle/vehicle-data-selector"

interface VehicleLookupDialogProps {
  onVehicleSelect: (vehicle: DVLAVehicleData) => void
  children: React.ReactNode
}

export function VehicleLookupDialog({ onVehicleSelect, children }: VehicleLookupDialogProps) {
  const [open, setOpen] = useState(false)
  const [registration, setRegistration] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState<DVLAVehicleData | null>(null)
  const [showDataSelector, setShowDataSelector] = useState(false)
  const [comprehensiveData, setComprehensiveData] = useState<any>(null)
  const [totalCost, setTotalCost] = useState(0)

  const handleLookup = async () => {
    if (!registration.trim()) {
      toast({
        title: "Error",
        description: "Please enter a registration number",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const cleanReg = registration.trim().toUpperCase().replace(/\s/g, '')

      // First try to get vehicle from your database
      console.log(`[VEHICLE-LOOKUP] 🔍 Looking up ${cleanReg} in database first...`)

      let vehicleInfo = null
      let source = "Database"

      try {
        const dbResponse = await fetch(`/api/vehicles/${encodeURIComponent(cleanReg)}`)
        if (dbResponse.ok) {
          const dbData = await dbResponse.json()
          if (dbData.success && dbData.vehicle) {
            // Convert database format to DVLA format
            vehicleInfo = {
              registrationNumber: dbData.vehicle.registration,
              make: dbData.vehicle.make,
              model: dbData.vehicle.model,
              colour: dbData.vehicle.color || dbData.vehicle.colour,
              yearOfManufacture: dbData.vehicle.year,
              fuelType: dbData.vehicle.fuel_type,
              motExpiryDate: dbData.vehicle.mot_expiry_date,
              engineCapacity: dbData.vehicle.engine_size
            }
            console.log(`[VEHICLE-LOOKUP] ✅ Found in database:`, vehicleInfo)
          }
        }
      } catch (dbError) {
        console.log(`[VEHICLE-LOOKUP] Database lookup failed, trying DVLA...`)
      }

      // If not found in database, try enhanced vehicle data API (VDG + DVLA + MOT)
      if (!vehicleInfo) {
        console.log(`[VEHICLE-LOOKUP] 📡 Trying enhanced vehicle data API...`)
        source = "Enhanced API (VDG)"

        const response = await fetch(`/api/vehicle-data?registration=${encodeURIComponent(cleanReg)}&dataTypes=basic,technical`)

        if (!response.ok) {
          throw new Error("Failed to lookup vehicle from enhanced API")
        }

        const data = await response.json()
        console.log("[VEHICLE-LOOKUP] Enhanced API Response:", data)

        if (data.success && data.data) {
          const basicData = data.data.basic
          const technicalData = data.data.technical

          // Use the best available data (technical preferred, fallback to basic)
          const sourceData = technicalData || basicData
          if (sourceData) {
            vehicleInfo = {
              registrationNumber: sourceData.registration,
              make: sourceData.make,
              model: sourceData.model,
              colour: sourceData.colour || sourceData.color,
              yearOfManufacture: sourceData.year,
              fuelType: sourceData.fuelType,
              motExpiryDate: sourceData.motExpiryDate,
              engineCapacity: sourceData.engineCapacityCC || sourceData.engineSize,
              derivative: sourceData.derivative,
              imageUrl: sourceData.imageUrl
            }
            console.log(`[VEHICLE-LOOKUP] ✅ Enhanced data found:`, vehicleInfo)
          }
        }
      }

      // Fallback to DVLA API if enhanced API didn't work
      if (!vehicleInfo) {
        console.log(`[VEHICLE-LOOKUP] 📡 Fallback to DVLA API...`)
        source = "DVLA"

        const response = await fetch("/api/dvla-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration: cleanReg }),
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Vehicle not found in DVLA database")
          }
          throw new Error("Failed to lookup vehicle from DVLA")
        }

        const data = await response.json()
        console.log("[VEHICLE-LOOKUP] DVLA API Response:", data)

        // Extract the actual vehicle data from the API response
        vehicleInfo = data.data || data
      }

      if (!vehicleInfo) {
        throw new Error("Vehicle not found in database or DVLA")
      }

      setVehicleData(vehicleInfo)
      setShowDataSelector(true) // Show data selector after basic lookup

      toast({
        title: "Success",
        description: `Vehicle details found from ${source}: ${vehicleInfo.registrationNumber || vehicleInfo.registration}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to lookup vehicle",
        variant: "destructive",
      })
      setVehicleData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDataFetch = (data: any, cost: number) => {
    setComprehensiveData(data)
    setTotalCost(cost)

    // Merge basic vehicle data with comprehensive data
    const enhancedVehicleData = {
      ...vehicleData,
      comprehensiveData: data,
      dataCost: cost
    }

    toast({
      title: "Enhanced data fetched",
      description: `Total cost: £${cost.toFixed(4)} | Data enriched successfully`,
    })
  }

  const handleSelect = () => {
    if (vehicleData) {
      // Include comprehensive data if available
      const finalVehicleData = comprehensiveData
        ? { ...vehicleData, comprehensiveData, dataCost: totalCost }
        : vehicleData

      onVehicleSelect(finalVehicleData)
      setOpen(false)
      setRegistration("")
      setVehicleData(null)
      setShowDataSelector(false)
      setComprehensiveData(null)
      setTotalCost(0)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={showDataSelector ? "sm:max-w-6xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {showDataSelector ? 'Enhanced Vehicle Data' : 'Vehicle Lookup'}
          </DialogTitle>
          <DialogDescription>
            {showDataSelector
              ? 'Select additional data packages to enhance vehicle information'
              : 'Enter a vehicle registration number to lookup details from DVLA'
            }
          </DialogDescription>
        </DialogHeader>

        {!showDataSelector ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="registration"
                  placeholder="e.g., AB12 CDE"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleLookup} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {vehicleData && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Vehicle Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Registration:</span>
                    <div>{vehicleData.registrationNumber}</div>
                  </div>
                  <div>
                    <span className="font-medium">Make:</span>
                    <div>{vehicleData.make}</div>
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <div>{vehicleData.model}</div>
                  </div>
                  <div>
                    <span className="font-medium">Year:</span>
                    <div>{vehicleData.yearOfManufacture}</div>
                  </div>
                  <div>
                    <span className="font-medium">Colour:</span>
                    <div>{vehicleData.colour}</div>
                  </div>
                  <div>
                    <span className="font-medium">Fuel:</span>
                    <div>{vehicleData.fuelType}</div>
                  </div>
                  {vehicleData.motExpiryDate && (
                    <div className="col-span-2">
                      <span className="font-medium">MOT Expiry:</span>
                      <div>{new Date(vehicleData.motExpiryDate).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSelect} className="flex-1">
                    Use Basic Data
                  </Button>
                  <Button onClick={() => setShowDataSelector(true)} className="flex-1">
                    <Database className="h-4 w-4 mr-2" />
                    Enhance Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {vehicleData && (
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {vehicleData.registrationNumber || vehicleData.registration}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {vehicleData.make} {vehicleData.model} ({vehicleData.yearOfManufacture || vehicleData.year})
                    </p>
                  </div>
                  {totalCost > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />
                        £{totalCost.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">Enhanced data cost</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <VehicleDataSelector
              registration={registration}
              onDataFetch={handleDataFetch}
              existingData={comprehensiveData}
            />

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDataSelector(false)}>
                Back to Basic Lookup
              </Button>
              <Button onClick={handleSelect} disabled={!vehicleData}>
                Use Enhanced Vehicle Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
