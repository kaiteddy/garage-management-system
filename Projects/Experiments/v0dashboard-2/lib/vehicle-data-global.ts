// Vehicle Data Global API integration
// Cost: £0.32 per lookup (vs £0.70 SWS) - 54% savings

const VDG_API_KEY = process.env.VDG_API_KEY
const VDG_BASE_URL = 'https://uk.api.vehicledataglobal.com/r2/lookup'

// Import the working VDG V2 integration
import { getVDGVehicleDataV2 } from './vehicle-data-global-v2'

export interface VDGVehicleData {
  registration: string
  make: string
  model: string
  derivative: string
  year: number
  engineSize?: string
  fuelType: string
  colour: string
  imageUrl?: string
  specifications?: VDGSpecification[]
  source: 'VDG'
}

export interface VDGSpecification {
  category: string
  name: string
  description: string
  fitment: 'Standard' | 'Optional'
}

// Test VDG API connection and understand the format
export async function testVDGAPIFormat(registration: string = 'LN64XFG'): Promise<any> {
  try {
    console.log(`🧪 [VDG] Testing API format for ${registration}`)

    // Try different possible endpoints using correct VDG format
    // Start with basic packages that should be available to all accounts
    const endpoints = [
      'VehicleDetails',           // Basic vehicle data - should be available
      'VehicleDetailsWithImage',  // £0.14 - from your account
      'MotHistoryDetails',        // £0.05 - from your account
      'SpecAndOptionsDetails',    // £0.18 - from your account
      'TyreDetails',              // £0.08 - from your account
      'BatteryDetails',           // £0.06 - from your account
      'AddressDetails'            // £0.05 - from your account
    ]

    const results: any = {}

    for (const endpoint of endpoints) {
      try {
        // Use correct VDG API format: v=2&api_nullitems=1&auth_apikey={key}&key_VRM={vrm}
        const apiUrl = `${VDG_BASE_URL}/${endpoint}?v=2&api_nullitems=1&auth_apikey=${VDG_API_KEY}&key_VRM=${registration.toUpperCase().replace(/\s/g, '')}`
        console.log(`🔍 [VDG] Testing: ${endpoint}`)

        const response = await fetch(apiUrl, {
          method: 'GET'
        })

        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }

        if (response.ok) {
          const data = await response.json()
          results[endpoint].data = data
          console.log(`✅ [VDG] ${endpoint} successful`)
        } else {
          const errorText = await response.text()
          results[endpoint].error = errorText
          console.log(`⚠️ [VDG] ${endpoint} returned ${response.status}: ${errorText}`)
        }

      } catch (error) {
        results[endpoint] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return results

  } catch (error) {
    console.error('❌ [VDG] Test error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get vehicle data from VDG with specific packages
export async function getVDGVehicleDataWithPackages(registration: string, packages: string[]): Promise<VDGVehicleData | null> {
  try {
    console.log(`🔍 [VDG] Looking up vehicle data for ${registration} with packages: ${packages.join(', ')} using V2 API`)

    const cleanReg = registration.toUpperCase().replace(/\s/g, '')

    // Use the first package (or default to VehicleDetailsWithImage)
    const primaryPackage = packages[0] || 'VehicleDetailsWithImage'

    // Use the working VDG V2 integration
    const vdgV2Data = await getVDGVehicleDataV2(cleanReg, primaryPackage)

    if (!vdgV2Data) {
      console.log(`⚠️ [VDG] No data returned from V2 API`)
      return null
    }

    // Convert V2 format to legacy format for compatibility
    const specifications: VDGSpecification[] = vdgV2Data.specifications?.map(spec => ({
      category: 'Technical',
      name: spec.name,
      description: spec.value,
      fitment: 'Standard' as const
    })) || []

    return {
      registration: cleanReg,
      make: vdgV2Data.make,
      model: vdgV2Data.model,
      derivative: vdgV2Data.bodyType || 'STANDARD',
      year: vdgV2Data.year,
      engineSize: vdgV2Data.specifications?.find(s => s.name === 'Engine Capacity')?.value,
      fuelType: vdgV2Data.fuelType,
      colour: vdgV2Data.colour,
      imageUrl: vdgV2Data.imageUrl,
      specifications: specifications,
      source: 'VDG'
    }

  } catch (error) {
    console.error('❌ [VDG] Error:', error)
    return null
  }
}

// Get comprehensive vehicle data from VDG (£0.32 per lookup)
export async function getVDGVehicleData(registration: string): Promise<VDGVehicleData | null> {
  if (!VDG_API_KEY) {
    console.log('⚠️ [VDG] API key not configured')
    return null
  }

  const cleanReg = registration.replace(/\s+/g, '').toUpperCase()
  console.log(`🔍 [VDG] Fetching vehicle details for ${cleanReg} using V2 API`)

  try {
    // Use the working VDG V2 integration
    const vdgV2Data = await getVDGVehicleDataV2(cleanReg, 'VehicleDetailsWithImage')

    if (!vdgV2Data) {
      console.log(`⚠️ [VDG] No data returned from V2 API`)
      return null
    }

    // Convert V2 format to legacy format for compatibility
    const specifications: VDGSpecification[] = vdgV2Data.specifications?.map(spec => ({
      category: 'Technical',
      name: spec.name,
      description: spec.value,
      fitment: 'Standard' as const
    })) || []

    return {
      registration: cleanReg,
      make: vdgV2Data.make,
      model: vdgV2Data.model,
      derivative: vdgV2Data.bodyType || 'STANDARD',
      year: vdgV2Data.year,
      engineSize: vdgV2Data.specifications?.find(s => s.name === 'Engine Capacity')?.value,
      fuelType: vdgV2Data.fuelType,
      colour: vdgV2Data.colour,
      imageUrl: vdgV2Data.imageUrl,
      specifications: specifications,
      source: 'VDG'
    }

  } catch (error) {
    console.error('❌ [VDG] Error:', error)
    return null
  }
}

// Extract derivative from VDG data
function extractDerivativeFromVDG(vehicleData: any, specifications: VDGSpecification[]): string {
  // Try to extract from model name first using correct VDG structure
  const vehicleIdentification = vehicleData.Results?.VehicleDetails?.[0]?.VehicleIdentification
  const model = vehicleIdentification?.DvlaModel || ''
  const modelUpper = model.toUpperCase()

  // Common derivative patterns in VDG model names
  const derivativePatterns = [
    /\b(SE|SEL|S-LINE|SPORT|GTI|GTD|TSI|TDI|TFSI)\b/,
    /\b(TITANIUM|ZETEC|GHIA|TREND|EDGE|VIGNALE)\b/,
    /\b(ELEGANCE|CLASSIC|EXECUTIVE|LUXURY|PREMIUM)\b/,
    /\b(MATCH|BLUEMOTION|R-LINE|AMG|M-SPORT)\b/,
    /\b(ACTIVE|DESIGN|ICON|EXCEL|STYLE)\b/
  ]

  for (const pattern of derivativePatterns) {
    const match = modelUpper.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // Try to extract from specifications (engine type, trim level)
  if (specifications.length > 0) {
    // Look for engine specifications
    const engineSpecs = specifications.filter(spec => 
      spec.category.includes('Engine') || 
      spec.name.includes('TSI') || 
      spec.name.includes('TDI') ||
      spec.name.includes('Turbo')
    )

    if (engineSpecs.length > 0) {
      const engineSpec = engineSpecs[0]
      if (engineSpec.name.includes('TSI')) return 'TSI'
      if (engineSpec.name.includes('TDI')) return 'TDI'
      if (engineSpec.name.includes('Turbo')) return 'TURBO'
    }

    // Look for trim level specifications
    const trimSpecs = specifications.filter(spec =>
      spec.category.includes('Trim') ||
      spec.name.includes('Sport') ||
      spec.name.includes('Luxury') ||
      spec.name.includes('Premium')
    )

    if (trimSpecs.length > 0) {
      const trimSpec = trimSpecs[0]
      if (trimSpec.name.includes('Sport')) return 'SPORT'
      if (trimSpec.name.includes('Luxury')) return 'LUXURY'
      if (trimSpec.name.includes('Premium')) return 'PREMIUM'
    }
  }

  return 'STANDARD'
}

// Combine data from multiple VDG packages
function combineVDGPackageData(registration: string, packageResults: any): VDGVehicleData | null {
  try {
    // Start with basic vehicle details from any available package
    let vehicleData: any = null
    let imageUrl: string | undefined = undefined
    let specifications: VDGSpecification[] = []

    // Extract vehicle details from VehicleDetails or VehicleDetailsWithImage
    if (packageResults.VehicleDetailsWithImage) {
      vehicleData = packageResults.VehicleDetailsWithImage
      const imageDetails = vehicleData.Results?.VehicleImageDetails || vehicleData.VehicleImageDetails
      imageUrl = imageDetails?.VehicleImageList?.[0]?.ImageUrl || imageDetails?.ImageUrl
    } else if (packageResults.VehicleDetails) {
      vehicleData = packageResults.VehicleDetails
    }

    if (!vehicleData) {
      console.log('⚠️ [VDG] No basic vehicle data found in any package')
      return null
    }

    // Extract specifications from SpecAndOptionsDetails
    if (packageResults.SpecAndOptionsDetails) {
      specifications = extractSpecifications(packageResults.SpecAndOptionsDetails)
    }

    // Extract basic vehicle information
    const vehicleIdentification = vehicleData.Results?.VehicleDetails?.[0]?.VehicleIdentification
    const vehicleStatus = vehicleData.Results?.VehicleDetails?.[0]?.VehicleStatus
    const technicalDetails = vehicleData.Results?.VehicleDetails?.[0]?.DvlaTechnicalDetails

    // Extract derivative
    const derivative = extractDerivativeFromVDG(vehicleData, specifications)

    return {
      registration: registration,
      make: vehicleIdentification?.DvlaMake || 'Unknown',
      model: vehicleIdentification?.DvlaModel || 'Unknown',
      derivative: derivative,
      year: vehicleIdentification?.YearOfManufacture || 0,
      engineSize: technicalDetails?.EngineCapacityCc ? `${technicalDetails.EngineCapacityCc}cc` : undefined,
      fuelType: vehicleIdentification?.DvlaFuelType || 'Unknown',
      colour: vehicleStatus?.ColourDetails?.CurrentColour || 'Unknown',
      imageUrl: imageUrl,
      specifications: specifications,
      source: 'VDG'
    }

  } catch (error) {
    console.error('❌ [VDG] Error combining package data:', error)
    return null
  }
}

// Extract specifications from VDG response
function extractSpecifications(specsData: any): VDGSpecification[] {
  const specifications: VDGSpecification[] = []

  // Check if the request was successful first
  if (specsData.StatusCode !== 0) {
    console.log(`⚠️ [VDG] Specs API returned status code ${specsData.StatusCode}: ${specsData.StatusMessage}`)
    return specifications
  }

  // Extract from the correct VDG response structure
  const specResults = specsData.Results?.SpecAndOptionsDetails?.[0]

  if (specResults?.FactoryEquipmentList) {
    for (const item of specResults.FactoryEquipmentList) {
      specifications.push({
        category: item.Category || 'Other',
        name: item.Name || 'Unknown',
        description: item.Description || '',
        fitment: item.Fitment === 'Standard' ? 'Standard' : 'Optional'
      })
    }
  }

  // Also check for standard equipment
  if (specResults?.StandardEquipmentList) {
    for (const item of specResults.StandardEquipmentList) {
      specifications.push({
        category: item.Category || 'Standard Equipment',
        name: item.Name || 'Unknown',
        description: item.Description || '',
        fitment: 'Standard'
      })
    }
  }

  // Also check for optional equipment
  if (specResults?.OptionalEquipmentList) {
    for (const item of specResults.OptionalEquipmentList) {
      specifications.push({
        category: item.Category || 'Optional Equipment',
        name: item.Name || 'Unknown',
        description: item.Description || '',
        fitment: 'Optional'
      })
    }
  }

  return specifications
}

// Test VDG API connection with multiple approaches
export async function testVDGConnection(): Promise<boolean> {
  try {
    console.log('🧪 [VDG] Testing API connection...')
    console.log(`🔑 [VDG] Using API key: ${VDG_API_KEY.substring(0, 8)}...`)

    // Test the correct VDG API format from the documentation
    const testApproaches = [
      {
        name: 'Correct VDG R2 format',
        url: `${VDG_BASE_URL}?apiKey=${VDG_API_KEY}&packageName=VehicleDetailsWithImage&vrm=LN64XFG`,
        headers: {}
      },
      {
        name: 'Alternative URL format 1',
        url: `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleDetails?api_key=${VDG_API_KEY}&vrm=LN64XFG`,
        headers: {}
      },
      {
        name: 'Alternative URL format 2',
        url: `https://api.vehicledataglobal.com/uk/lookup/VehicleDetails?key=${VDG_API_KEY}&registration=LN64XFG`,
        headers: {}
      },
      {
        name: 'POST with JSON body',
        url: `${VDG_BASE_URL}/VehicleDetails`,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          api_key: VDG_API_KEY,
          vrm: 'LN64XFG',
          v: 2,
          api_nullitems: 1
        })
      },
      {
        name: 'Authorization header Bearer',
        url: `${VDG_BASE_URL}/VehicleDetails?v=2&api_nullitems=1&key_VRM=LN64XFG`,
        headers: { 'Authorization': `Bearer ${VDG_API_KEY}` }
      }
    ]

    for (const approach of testApproaches) {
      console.log(`🧪 [VDG] Testing ${approach.name}...`)

      try {
        const fetchOptions: any = {
          method: approach.method || 'GET',
          headers: approach.headers
        }

        if (approach.body) {
          fetchOptions.body = approach.body
        }

        const response = await fetch(approach.url, fetchOptions)

        console.log(`🧪 [VDG] ${approach.name} response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ [VDG] ${approach.name} HTTP successful!`)
          console.log(`📊 [VDG] Response structure:`, Object.keys(data))

          // Check VDG response format
          if (data.ResponseInformation?.IsSuccessStatusCode) {
            console.log(`✅ [VDG] ${approach.name} data successful!`)
            console.log(`✅ [VDG] Vehicle found:`, data.Results?.VehicleDetails?.VehicleIdentification?.Make)
            return true
          } else {
            console.log(`⚠️ [VDG] ${approach.name} returned status code ${data.ResponseInformation?.StatusCode}: ${data.ResponseInformation?.StatusMessage}`)
          }
        } else {
          const errorText = await response.text()
          console.log(`⚠️ [VDG] ${approach.name} failed: ${response.status} - ${errorText.substring(0, 100)}...`)
        }
      } catch (error) {
        console.log(`❌ [VDG] ${approach.name} error:`, error instanceof Error ? error.message : 'Unknown error')
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('❌ [VDG] All authentication approaches failed')
    return false

  } catch (error) {
    console.error('❌ [VDG] Connection test error:', error)
    return false
  }
}
