// Updated VDG API Integration - Correct Endpoint and Format
const VDG_API_KEY = process.env.VDG_API_KEY
const VDG_ENDPOINT = 'https://uk.api.vehicledataglobal.com/r2/lookup'

// VDG Response Types (based on ExampleVDG.rtf)
interface VDGResponse {
  requestInformation: {
    packageName: string
    searchTerm: string
    searchType: string
    requestIp: string
  }
  responseInformation: {
    statusCode: number
    statusMessage: string
    isSuccessStatusCode: boolean
    queryTimeMs: number
    responseId: string
  }
  billingInformation: {
    billingTransactionId?: string
    accountType: number
    accountBalance: number
    transactionCost: number
    billingResult: number
    billingResultMessage: string
  }
  Results: {
    VehicleDetails?: VehicleDetails
    ModelDetails?: ModelDetails
    VehicleImageDetails?: VehicleImageDetails
  }
}

interface VehicleDetails {
  vehicleIdentification: {
    vrm: string
    vin?: string
    dvlaMake: string
    dvlaModel: string
    yearOfManufacture: number
    dvlaBodyType: string
    dvlaFuelType: string
    engineNumber?: string
  }
  vehicleStatus: {
    isImported: boolean
    certificateOfDestructionIssued: boolean
    isExported: boolean
    isScrapped: boolean
    vehicleExciseDutyDetails: {
      dvlaCo2: number
      dvlaCo2Band: string
    }
  }
  dvlaTechnicalDetails: {
    grossWeight?: number
    unladenWeight?: number
    maxPermissibleMass?: number
  }
  statusCode: number
  statusMessage: string
}

interface ModelDetails {
  vehicleSpecifications: {
    engineCapacityCC: number
    powerBHP: number
    torqueNM: number
    fuelEconomyDetails: {
      urbanMpg: number
      extraUrbanMpg: number
      combinedMpg: number
      urbanColdL100Km: number
      extraUrbanL100Km: number
      combinedL100Km: number
    }
  }
  statusCode: number
  statusMessage: string
}

interface VehicleImageDetails {
  vehicleImageList: Array<{
    viewAngle: string
    imageUrl: string
    colour: string
    description: string
    expiryDate: string
  }>
  statusCode: number
  statusMessage: string
}

// Available VDG Packages
export const VDG_PACKAGES = {
  VehicleDetails: 'VehicleDetails',
  VehicleDetailsWithImage: 'VehicleDetailsWithImage',
  SpecAndOptionsDetails: 'SpecAndOptionsDetails',
  MotHistoryDetails: 'MotHistoryDetails',
  TyreDetails: 'TyreDetails',
  BatteryDetails: 'BatteryDetails',
  AddressDetails: 'AddressDetails'
}

// Smart package selection based on requirements
export function selectOptimalVDGPackage(requirements: {
  needsImages?: boolean
  needsDetailedSpecs?: boolean
  needsTyreData?: boolean
  needsMOTHistory?: boolean
  needsComprehensiveData?: boolean
  budgetMode?: boolean
}): string | string[] {
  if (requirements.budgetMode && !requirements.needsImages) {
    return 'VehicleDetails' // £0.05 - cheapest option
  }

  // For comprehensive data (eliminating N/A values), return multiple packages
  if (requirements.needsComprehensiveData) {
    return ['VehicleDetailsWithImage', 'TyreDetails', 'SpecAndOptionsDetails'] // £0.40 total
  }

  if (requirements.needsDetailedSpecs && requirements.needsTyreData) {
    return ['VehicleDetailsWithImage', 'TyreDetails', 'SpecAndOptionsDetails'] // £0.40 total
  }

  if (requirements.needsDetailedSpecs) {
    return 'SpecAndOptionsDetails' // £0.18 - most detailed specs
  }

  if (requirements.needsTyreData) {
    return 'TyreDetails' // £0.08 - tyre specifications
  }

  if (requirements.needsMOTHistory) {
    return 'MotHistoryDetails' // £0.05 - MOT data (though free API available)
  }

  // Default: best value for most use cases
  return 'VehicleDetailsWithImage' // £0.14 - complete data + images
}

export async function getVDGVehicleDataV2(registration: string, packageName: string = 'VehicleDetailsWithImage') {
  if (!VDG_API_KEY) {
    throw new Error('VDG_API_KEY not configured')
  }

  const cleanReg = registration.replace(/\s+/g, '').toUpperCase()
  
  console.log(`🔍 [VDG-V2] Fetching data for ${cleanReg} with package: ${packageName}`)
  
  try {
    // Try different approaches to pass the registration

    // Approach 1: POST with JSON body (like many modern APIs)
    console.log(`🧪 [VDG-V2] Trying POST with JSON body`)
    let response = await fetch(VDG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GarageManager/1.0'
      },
      body: JSON.stringify({
        apiKey: VDG_API_KEY,
        packageName: packageName,
        searchTerm: cleanReg,
        searchType: 'VRM'
      })
    })

    if (!response.ok) {
      // Approach 2: GET with different parameter names
      console.log(`🧪 [VDG-V2] POST failed, trying GET with vrm parameter`)
      const url = `${VDG_ENDPOINT}?apiKey=${VDG_API_KEY}&packageName=${packageName}&vrm=${cleanReg}`
      console.log(`🌐 [VDG-V2] Calling: ${url.replace(VDG_API_KEY, 'API_KEY_HIDDEN')}`)

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GarageManager/1.0'
        }
      })
    }

    if (!response.ok) {
      // Approach 3: GET with registration parameter
      console.log(`🧪 [VDG-V2] Trying GET with registration parameter`)
      const url = `${VDG_ENDPOINT}?apiKey=${VDG_API_KEY}&packageName=${packageName}&registration=${cleanReg}`
      console.log(`🌐 [VDG-V2] Calling: ${url.replace(VDG_API_KEY, 'API_KEY_HIDDEN')}`)

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GarageManager/1.0'
        }
      })
    }

    if (!response.ok) {
      // Approach 4: Original approach with searchTerm
      console.log(`🧪 [VDG-V2] Trying original GET with searchTerm`)
      const url = `${VDG_ENDPOINT}?apiKey=${VDG_API_KEY}&packageName=${packageName}&searchTerm=${cleanReg}&searchType=VRM`
      console.log(`🌐 [VDG-V2] Calling: ${url.replace(VDG_API_KEY, 'API_KEY_HIDDEN')}`)

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GarageManager/1.0'
        }
      })
    }
    
    console.log(`📡 [VDG-V2] Response status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [VDG-V2] HTTP Error: ${response.status} - ${errorText}`)
      throw new Error(`VDG API HTTP Error: ${response.status} - ${response.statusText}`)
    }
    
    const data: VDGResponse = await response.json()
    
    console.log(`📊 [VDG-V2] Full response data:`, JSON.stringify(data, null, 2))

    console.log(`📊 [VDG-V2] Response summary:`, {
      statusCode: data.ResponseInformation?.StatusCode,
      statusMessage: data.ResponseInformation?.StatusMessage,
      isSuccess: data.ResponseInformation?.IsSuccessStatusCode,
      hasVehicleDetails: !!data.Results?.VehicleDetails,
      hasModelDetails: !!data.Results?.ModelDetails,
      hasImageDetails: !!data.Results?.VehicleImageDetails,
      transactionCost: data.BillingInformation?.TransactionCost
    })

    // Check if the API call was successful
    if (!data.ResponseInformation?.IsSuccessStatusCode) {
      console.error(`❌ [VDG-V2] API Error: ${data.ResponseInformation?.StatusMessage}`)
      console.error(`❌ [VDG-V2] Full error response:`, JSON.stringify(data, null, 2))
      throw new Error(`VDG API Error: ${data.ResponseInformation?.StatusMessage || 'Unknown error'}`)
    }
    
    // Extract and normalize the data
    const result = extractVDGData(data, cleanReg)
    
    console.log(`✅ [VDG-V2] Data extracted successfully:`, {
      make: result.make,
      model: result.model,
      year: result.year,
      hasImage: !!result.imageUrl,
      hasSpecs: !!result.specifications,
      cost: data.billingInformation?.transactionCost || 0
    })
    
    return result
    
  } catch (error) {
    console.error(`❌ [VDG-V2] Error fetching data for ${cleanReg}:`, error)
    throw error
  }
}

function extractVDGData(data: VDGResponse, registration: string) {
  const vehicleDetails = data.Results?.VehicleDetails
  const modelDetails = data.Results?.ModelDetails
  const imageDetails = data.Results?.VehicleImageDetails

  // Extract basic vehicle information
  const basicInfo = {
    registration,
    make: vehicleDetails?.VehicleIdentification?.DvlaMake || 'Unknown',
    model: vehicleDetails?.VehicleIdentification?.DvlaModel || 'Unknown',
    year: vehicleDetails?.VehicleIdentification?.YearOfManufacture || 0,
    fuelType: vehicleDetails?.VehicleIdentification?.DvlaFuelType || 'Unknown',
    bodyType: vehicleDetails?.VehicleIdentification?.DvlaBodyType || 'Unknown',
    vin: vehicleDetails?.VehicleIdentification?.Vin,
    engineNumber: vehicleDetails?.VehicleIdentification?.EngineNumber
  }

  // Extract technical specifications from multiple sources
  const specifications: Array<{ name: string; value: string }> = []

  // Engine specifications from ModelDetails
  if (modelDetails?.Powertrain?.IceDetails) {
    const engine = modelDetails.Powertrain.IceDetails
    if (engine.EngineCapacityCc) {
      specifications.push({ name: 'Engine Capacity', value: `${engine.EngineCapacityCc}cc` })
    }
    if (engine.EngineDescription) {
      specifications.push({ name: 'Engine Description', value: engine.EngineDescription })
    }
    if (engine.NumberOfCylinders) {
      specifications.push({ name: 'Cylinders', value: `${engine.NumberOfCylinders} (${engine.CylinderArrangement})` })
    }
    if (engine.Aspiration) {
      specifications.push({ name: 'Aspiration', value: engine.Aspiration })
    }
  }

  // Power and performance from ModelDetails
  if (modelDetails?.Performance) {
    const perf = modelDetails.Performance
    if (perf.Power?.Bhp) {
      specifications.push({ name: 'Power', value: `${perf.Power.Bhp} BHP` })
    }
    if (perf.Torque?.Nm) {
      specifications.push({ name: 'Torque', value: `${perf.Torque.Nm} Nm @ ${perf.Torque.Rpm} RPM` })
    }
    if (perf.Statistics?.ZeroToSixtyMph) {
      specifications.push({ name: '0-60 mph', value: `${perf.Statistics.ZeroToSixtyMph} seconds` })
    }
    if (perf.Statistics?.MaxSpeedMph) {
      specifications.push({ name: 'Top Speed', value: `${perf.Statistics.MaxSpeedMph} mph` })
    }

    // Fuel economy
    if (perf.FuelEconomy) {
      const fuel = perf.FuelEconomy
      if (fuel.CombinedMpg) {
        specifications.push({ name: 'Fuel Economy Combined', value: `${fuel.CombinedMpg} MPG` })
      }
      if (fuel.UrbanColdMpg) {
        specifications.push({ name: 'Fuel Economy Urban', value: `${fuel.UrbanColdMpg} MPG` })
      }
      if (fuel.ExtraUrbanMpg) {
        specifications.push({ name: 'Fuel Economy Extra Urban', value: `${fuel.ExtraUrbanMpg} MPG` })
      }
    }
  }

  // Transmission details
  if (modelDetails?.Powertrain?.Transmission) {
    const trans = modelDetails.Powertrain.Transmission
    if (trans.TransmissionType) {
      const gears = trans.NumberOfGears ? `${trans.NumberOfGears}-speed ` : ''
      specifications.push({ name: 'Transmission', value: `${gears}${trans.TransmissionType}`.trim() })
    }
    if (trans.DriveType) {
      specifications.push({ name: 'Drive Type', value: String(trans.DriveType) })
    }
  }

  // Body and dimensions
  if (modelDetails?.BodyDetails) {
    const body = modelDetails.BodyDetails
    if (body.BodyStyle) {
      specifications.push({ name: 'Body Style', value: body.BodyStyle })
    }
    if (body.NumberOfDoors) {
      specifications.push({ name: 'Doors', value: `${body.NumberOfDoors}` })
    }
    if (body.NumberOfSeats) {
      specifications.push({ name: 'Seats', value: `${body.NumberOfSeats}` })
    }
    if (body.FuelTankCapacityLitres) {
      specifications.push({ name: 'Fuel Tank Capacity', value: `${body.FuelTankCapacityLitres} litres` })
    }
  }

  // Dimensions
  if (modelDetails?.Dimensions) {
    const dims = modelDetails.Dimensions
    if (dims.LengthMm && dims.WidthMm && dims.HeightMm) {
      specifications.push({
        name: 'Dimensions (L×W×H)',
        value: `${dims.LengthMm}mm × ${dims.WidthMm}mm × ${dims.HeightMm}mm`
      })
    }
    if (dims.WheelbaseLengthMm) {
      specifications.push({ name: 'Wheelbase', value: `${dims.WheelbaseLengthMm}mm` })
    }
  }

  // Weight information
  if (modelDetails?.Weights) {
    const weights = modelDetails.Weights
    if (weights.KerbWeightKg) {
      specifications.push({ name: 'Kerb Weight', value: `${weights.KerbWeightKg} kg` })
    }
    if (weights.GrossVehicleWeightKg) {
      specifications.push({ name: 'Gross Vehicle Weight', value: `${weights.GrossVehicleWeightKg} kg` })
    }
  }
  
  // Extract CO2 and emissions data
  if (vehicleDetails?.VehicleStatus?.VehicleExciseDutyDetails) {
    const dutyDetails = vehicleDetails.VehicleStatus.VehicleExciseDutyDetails
    if (dutyDetails.DvlaCo2) {
      specifications.push({ name: 'CO2 Emissions', value: `${dutyDetails.DvlaCo2} g/km` })
    }
    if (dutyDetails.DvlaCo2Band) {
      specifications.push({ name: 'CO2 Band', value: dutyDetails.DvlaCo2Band })
    }
  }

  // Additional emissions data from ModelDetails
  if (modelDetails?.Emissions) {
    const emissions = modelDetails.Emissions
    if (emissions.EuroStatus) {
      specifications.push({ name: 'Euro Status', value: `Euro ${emissions.EuroStatus}` })
    }
    if (emissions.ManufacturerCo2) {
      specifications.push({ name: 'Manufacturer CO2', value: `${emissions.ManufacturerCo2} g/km` })
    }
  }

  // Safety rating
  if (modelDetails?.Safety?.EuroNcap) {
    const ncap = modelDetails.Safety.EuroNcap
    if (ncap.NcapStarRating) {
      specifications.push({ name: 'Euro NCAP Rating', value: `${ncap.NcapStarRating} stars` })
    }
  }

  // Attempt to extract TyreDetails from any result payload
  try {
    const resultsAny: any = (data as any).Results || {}

    const humanize = (s: string) => s
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()

    const includesTyreKeyword = (k: string) => {
      const l = k.toLowerCase()
      return l.includes('tyre') || l.includes('tire') || l.includes('wheel') || l.includes('pressure')
    }

    const includesQualifier = (k: string) => {
      const l = k.toLowerCase()
      return l.includes('front') || l.includes('rear') || l.includes('size') || l.includes('psi') || l.includes('bar')
    }

    const pushSpec = (path: string[], val: any) => {
      const last = path[path.length - 1] || ''
      if (!includesTyreKeyword(last) && !path.some(includesTyreKeyword)) return
      if (typeof val === 'object' || val === null || val === undefined || val === '') return
      const name = humanize(path.join(' '))
      const value = String(val)
      // Only push if it looks meaningful
      if (value && value.length <= 100) {
        specifications.push({ name, value })
      }
    }

    const walk = (obj: any, path: string[] = []) => {
      if (!obj || typeof obj !== 'object') return
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          walk(obj[i], path)
        }
        return
      }
      for (const [key, value] of Object.entries(obj)) {
        const nextPath = [...path, key]
        if (value && typeof value === 'object') {
          walk(value, nextPath)
        } else {
          if (includesTyreKeyword(key) || includesQualifier(key) || path.some(includesTyreKeyword)) {
            pushSpec(nextPath, value)
          }
        }
      }
    }

    // Specifically walk TyreDetails and any Wheel/Tyre related branches if present
    if (resultsAny.TyreDetails) walk(resultsAny.TyreDetails, ['TyreDetails'])
    if (resultsAny.WheelDetails) walk(resultsAny.WheelDetails, ['WheelDetails'])
  } catch (e) {
    console.warn('⚠️ [VDG-V2] TyreDetails extraction fallback failed:', e)
  }

  // Extract vehicle image
  let imageUrl = null
  let imageExpiry = null
  if (imageDetails?.VehicleImageList && imageDetails.VehicleImageList.length > 0) {
    const primaryImage = imageDetails.VehicleImageList[0]
    imageUrl = primaryImage.ImageUrl
    imageExpiry = primaryImage.ExpiryDate
  }
  
  // Extract vehicle status information
  const statusInfo = []
  if (vehicleDetails?.VehicleStatus) {
    const status = vehicleDetails.VehicleStatus
    if (status.IsImported) statusInfo.push('Imported Vehicle')
    if (status.IsExported) statusInfo.push('Exported Vehicle')
    if (status.IsScrapped) statusInfo.push('Scrapped Vehicle')
    if (status.CertificateOfDestructionIssued) statusInfo.push('Certificate of Destruction Issued')
  }

  // Extract color information
  let colour = 'Unknown'
  if (vehicleDetails?.VehicleHistory?.ColourDetails?.CurrentColour) {
    colour = vehicleDetails.VehicleHistory.ColourDetails.CurrentColour
  }

  return {
    ...basicInfo,
    colour,
    specifications,
    imageUrl,
    imageExpiry,
    statusInfo,
    source: 'VDG_V2',
    cost: data.BillingInformation?.TransactionCost || 0,
    responseId: data.ResponseInformation?.ResponseId,
    accountBalance: data.BillingInformation?.AccountBalance,
    rawData: data // Include raw data for debugging
  }
}

// Extract address information from VDG AddressDetails response
export function extractVDGAddressData(data: any) {
  console.log('🏠 [VDG-ADDRESS] Extracting address data from VDG response')

  if (!data?.Results?.AddressDetails) {
    console.log('⚠️ [VDG-ADDRESS] No AddressDetails found in response')
    return null
  }

  const addressDetails = data.Results.AddressDetails
  console.log('📍 [VDG-ADDRESS] Raw address data:', JSON.stringify(addressDetails, null, 2))

  // Extract address components from VDG response
  const address = {
    houseNumber: addressDetails.HouseNumber || '',
    houseName: addressDetails.HouseName || '',
    road: addressDetails.Street || addressDetails.Road || '',
    locality: addressDetails.Locality || addressDetails.District || '',
    town: addressDetails.Town || addressDetails.City || '',
    county: addressDetails.County || addressDetails.Region || '',
    postCode: addressDetails.Postcode || addressDetails.PostCode || '',
    country: addressDetails.Country || 'United Kingdom',
    // Formatted full address
    fullAddress: [
      addressDetails.HouseNumber || addressDetails.HouseName,
      addressDetails.Street || addressDetails.Road,
      addressDetails.Locality || addressDetails.District,
      addressDetails.Town || addressDetails.City,
      addressDetails.County || addressDetails.Region,
      addressDetails.Postcode || addressDetails.PostCode
    ].filter(Boolean).join(', ')
  }

  console.log('✅ [VDG-ADDRESS] Extracted address:', address)

  return {
    address,
    cost: data.BillingInformation?.TransactionCost || 0.05,
    responseId: data.ResponseInformation?.ResponseId,
    accountBalance: data.BillingInformation?.AccountBalance,
    source: 'VDG_AddressDetails'
  }
}

// Enhanced function to get comprehensive vehicle data from multiple VDG packages
export async function getComprehensiveVDGData(registration: string): Promise<any> {
  console.log(`🔍 [VDG-COMPREHENSIVE] Fetching comprehensive data for ${registration}`)

  try {
    const packages = ['VehicleDetailsWithImage', 'TyreDetails', 'SpecAndOptionsDetails']
    const results: any = {}
    let totalCost = 0

    for (const packageName of packages) {
      console.log(`📦 [VDG-COMPREHENSIVE] Fetching ${packageName}...`)

      try {
        const result = await getVDGVehicleDataV2(registration, packageName)
        if (result) {
          results[packageName] = result
          totalCost += result.cost || 0
          console.log(`✅ [VDG-COMPREHENSIVE] ${packageName} successful`)
        } else {
          console.log(`⚠️ [VDG-COMPREHENSIVE] ${packageName} returned no data`)
        }
      } catch (error) {
        console.error(`❌ [VDG-COMPREHENSIVE] ${packageName} failed:`, error)
        // Continue with other packages even if one fails
      }

      // Rate limiting between calls
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Merge all data into comprehensive result
    const mergedData = mergeVDGPackageData(results)
    mergedData.totalCost = totalCost
    mergedData.packagesUsed = Object.keys(results)

    console.log(`✅ [VDG-COMPREHENSIVE] Complete. Total cost: £${totalCost.toFixed(4)}`)
    return mergedData

  } catch (error) {
    console.error(`❌ [VDG-COMPREHENSIVE] Failed:`, error)
    throw error
  }
}

// Helper function to merge data from multiple VDG packages
function mergeVDGPackageData(packageResults: any): any {
  const merged: any = {
    specifications: [],
    source: 'VDG_COMPREHENSIVE',
    packages: Object.keys(packageResults)
  }

  // Start with base data from VehicleDetailsWithImage
  if (packageResults.VehicleDetailsWithImage) {
    Object.assign(merged, packageResults.VehicleDetailsWithImage)
  }

  // Add tyre data from TyreDetails
  if (packageResults.TyreDetails) {
    const tyreData = packageResults.TyreDetails
    if (tyreData.specifications) {
      merged.specifications.push(...tyreData.specifications.filter((spec: any) =>
        spec.name?.toLowerCase().includes('tyre') ||
        spec.name?.toLowerCase().includes('tire') ||
        spec.name?.toLowerCase().includes('wheel') ||
        spec.name?.toLowerCase().includes('pressure')
      ))
    }
  }

  // Add detailed specs from SpecAndOptionsDetails
  if (packageResults.SpecAndOptionsDetails) {
    const specData = packageResults.SpecAndOptionsDetails
    if (specData.specifications) {
      merged.specifications.push(...specData.specifications.filter((spec: any) =>
        spec.name?.toLowerCase().includes('euro') ||
        spec.name?.toLowerCase().includes('engine') ||
        spec.name?.toLowerCase().includes('emission') ||
        spec.name?.toLowerCase().includes('option') ||
        spec.name?.toLowerCase().includes('tyre') ||
        spec.name?.toLowerCase().includes('tire') ||
        spec.name?.toLowerCase().includes('pressure')
      ))
    }
  }

  // Extract explicit tyre fields from collected specifications
  try {
    const specs = Array.isArray(merged.specifications) ? merged.specifications : []
    let tyreSizeFront: string | null = null
    let tyreSizeRear: string | null = null
    let tyrePressureFront: string | null = null
    let tyrePressureRear: string | null = null

    for (const raw of specs) {
      const name = (raw.name || '').toString().toLowerCase()
      const value = (raw.value || raw.description || '').toString()
      if (!name || !value) continue

      // Sizes
      if (name.includes('tyre') || name.includes('tire')) {
        if (name.includes('front') && name.includes('size') && !tyreSizeFront) {
          tyreSizeFront = value
        } else if (name.includes('rear') && name.includes('size') && !tyreSizeRear) {
          tyreSizeRear = value
        } else if (name.includes('size') && !tyreSizeFront && !tyreSizeRear) {
          // Single size provided; assume front as default
          tyreSizeFront = value
        }
      }

      // Pressures (accept bar/psi string as-is)
      if (name.includes('pressure')) {
        if (name.includes('front') && !tyrePressureFront) {
          tyrePressureFront = value
        } else if (name.includes('rear') && !tyrePressureRear) {
          tyrePressureRear = value
        }
      }
    }

    if (tyreSizeFront) merged.tyreSizeFront = tyreSizeFront
    if (tyreSizeRear) merged.tyreSizeRear = tyreSizeRear
    if (tyrePressureFront) merged.tyrePressureFront = tyrePressureFront
    if (tyrePressureRear) merged.tyrePressureRear = tyrePressureRear
    if (tyreSizeFront && !merged.tyreSize) merged.tyreSize = tyreSizeFront
  } catch (e) {
    console.warn('⚠️ [VDG-COMPREHENSIVE] Failed to extract explicit tyre fields:', e)
  }

  return merged
}

// Test function for debugging
export async function testVDGV2(registration: string = 'LN64XFG') {
  console.log(`🧪 [VDG-V2-TEST] Testing new VDG API with ${registration}`)

  try {
    const result = await getVDGVehicleDataV2(registration, 'VehicleDetailsWithImage')
    console.log(`✅ [VDG-V2-TEST] Success:`, result)
    return result
  } catch (error) {
    console.error(`❌ [VDG-V2-TEST] Failed:`, error)
    throw error
  }
}
