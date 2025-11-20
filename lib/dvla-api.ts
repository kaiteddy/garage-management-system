import { getDVLAApiKey } from "./dvsa-auth"

export interface DVLAVehicleData {
  registrationNumber: string
  make: string
  model: string
  colour: string
  yearOfManufacture: number
  engineCapacity?: number
  fuelType: string
  motStatus?: string
  motExpiryDate?: string
  taxStatus?: string
  taxDueDate?: string
  co2Emissions?: number
  euroStatus?: string
  realDrivingEmissions?: string
  dateOfLastV5CIssued?: string
  wheelplan?: string
  typeApproval?: string
}

export async function lookupVehicle(registration: string): Promise<DVLAVehicleData | null> {
  try {
    console.log(`🔍 Looking up DVLA vehicle data for: ${registration}`)

    const apiKey = getDVLAApiKey()
    if (!apiKey) {
      console.error("❌ DVLA API key not available")
      return null
    }

    const formattedRegistration = formatRegistration(registration)

    const response = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "User-Agent": "ServiceDataTable/1.0",
      },
      body: JSON.stringify({
        registrationNumber: formattedRegistration,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ DVLA API error (${response.status}):`, errorText)

      if (response.status === 404) {
        console.log(`❌ Vehicle not found in DVLA database: ${registration}`)
        return null
      }

      if (response.status === 401 || response.status === 403) {
        console.error("❌ DVLA authentication failed - check API key")
        return null
      }

      return null
    }

    const data = await response.json()
    console.log(`✅ DVLA vehicle data retrieved for: ${registration}`)

    return {
      registrationNumber: data.registrationNumber,
      make: data.make,
      model: data.model,
      colour: data.colour,
      yearOfManufacture: data.yearOfManufacture,
      engineCapacity: data.engineCapacity,
      fuelType: data.fuelType,
      motStatus: data.motStatus,
      motExpiryDate: data.motExpiryDate,
      taxStatus: data.taxStatus,
      taxDueDate: data.taxDueDate,
      co2Emissions: data.co2Emissions,
      euroStatus: data.euroStatus,
      realDrivingEmissions: data.realDrivingEmissions,
      dateOfLastV5CIssued: data.dateOfLastV5CIssued,
      wheelplan: data.wheelplan,
      typeApproval: data.typeApproval,
    }
  } catch (error) {
    console.error("❌ DVLA lookup failed:", error)
    return null
  }
}

export function formatRegistration(reg: string): string {
  // Remove spaces and convert to uppercase
  const clean = reg.toUpperCase().replace(/\s/g, "")

  // Format as XX## XXX (UK format)
  if (clean.length === 7) {
    return `${clean.slice(0, 2)}${clean.slice(2, 4)} ${clean.slice(4)}`
  }

  return clean
}

// Legacy alias
export const lookupVehicleByRegistration = lookupVehicle
