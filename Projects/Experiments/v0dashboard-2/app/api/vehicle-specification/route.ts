import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// Vehicle specification API configuration
const VEHICLE_SPEC_CONFIG = {
  // CAP HPI API for UK vehicle data (Primary - most accurate for UK vehicles)
  capHpi: {
    apiKey: process.env.CAP_HPI_API_KEY,
    baseUrl: 'https://api.cap-hpi.co.uk/v1',
    enabled: !!process.env.CAP_HPI_API_KEY
  },

  // JATO VINView API (Secondary - comprehensive VIN decoding)
  jato: {
    apiKey: process.env.JATO_API_KEY,
    baseUrl: 'https://api.jato.com/vinview/v1',
    enabled: !!process.env.JATO_API_KEY
  },

  // MarketCheck VIN Decoder API (Tertiary - US/UK coverage)
  marketCheck: {
    apiKey: process.env.MARKETCHECK_API_KEY,
    baseUrl: 'https://api.marketcheck.com/v2',
    enabled: !!process.env.MARKETCHECK_API_KEY
  },

  // Vehicle Databases API (Quaternary - backup)
  vehicleDb: {
    apiKey: process.env.VEHICLE_DB_API_KEY,
    baseUrl: 'https://api.vehicledatabases.com/v1',
    enabled: !!process.env.VEHICLE_DB_API_KEY
  },

  // DVLA API for basic data (Fallback)
  dvla: {
    apiKey: process.env.DVLA_API_KEY,
    baseUrl: 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
    enabled: !!process.env.DVLA_API_KEY
  }
}

interface VehicleSpecification {
  registration: string
  vin?: string
  make: string
  model: string
  derivative: string
  trim?: string
  year: number
  engineSize?: string
  fuelType?: string
  transmission?: string
  bodyType?: string
  doors?: number
  seats?: number
  co2Emissions?: number
  euroStatus?: string
  colour?: string
  source: string
}

// Enhanced VIN decoding with manufacturer-specific patterns
function decodeVINAdvanced(vin: string): { manufacturer: string; modelCode?: string; year?: number } {
  if (!vin || vin.length !== 17) {
    return { manufacturer: 'Unknown' }
  }

  const wmi = vin.substring(0, 3).toUpperCase()
  const vds = vin.substring(3, 9)
  const vis = vin.substring(9, 17)
  const yearCode = vin.charAt(9)

  // Enhanced manufacturer mapping with model patterns
  const manufacturerMap: Record<string, { name: string; modelPatterns?: Record<string, string> }> = {
    // German manufacturers
    'WVW': { name: 'Volkswagen', modelPatterns: { 'ZZZ1': 'Golf', 'ZZZ2': 'Polo', 'ZZZ3': 'Passat' } },
    'WV1': { name: 'Volkswagen' },
    'WV2': { name: 'Volkswagen' },
    'WBA': { name: 'BMW', modelPatterns: { 'A': '1 Series', 'B': '3 Series', 'C': '5 Series' } },
    'WBS': { name: 'BMW' },
    'WBX': { name: 'BMW' },
    'WDD': { name: 'Mercedes-Benz' },
    'WDC': { name: 'Mercedes-Benz' },
    'WDB': { name: 'Mercedes-Benz' },
    'WAU': { name: 'Audi' },
    'WA1': { name: 'Audi' },
    'TRU': { name: 'Audi' },
    
    // British manufacturers
    'SAL': { name: 'Land Rover' },
    'SAJ': { name: 'Jaguar' },
    'SAR': { name: 'Jaguar' },
    'SCC': { name: 'Lotus' },
    'SFD': { name: 'Alexander Dennis' },
    
    // French manufacturers
    'VF1': { name: 'Renault' },
    'VF3': { name: 'Peugeot' },
    'VF7': { name: 'Citroën' },
    'VF6': { name: 'Renault' },
    'VF8': { name: 'Matra' },
    
    // Italian manufacturers
    'ZFA': { name: 'Fiat' },
    'ZAR': { name: 'Alfa Romeo' },
    'ZLA': { name: 'Lancia' },
    'ZFF': { name: 'Ferrari' },
    'ZAM': { name: 'Maserati' },
    
    // Japanese manufacturers
    'JHM': { name: 'Honda' },
    'JMZ': { name: 'Mazda' },
    'JN1': { name: 'Nissan' },
    'JN6': { name: 'Nissan' },
    'JTD': { name: 'Toyota' },
    'JTE': { name: 'Toyota' },
    'JTN': { name: 'Toyota' },
    
    // Korean manufacturers
    'KNA': { name: 'Kia' },
    'KMH': { name: 'Hyundai' },
    'KNM': { name: 'Renault Samsung' },
    
    // Swedish manufacturers
    'YV1': { name: 'Volvo' },
    'YS3': { name: 'Saab' },
    'YTN': { name: 'Saab' },
    
    // Czech manufacturers
    'TMB': { name: 'Škoda' },
    'TMA': { name: 'Škoda' },
    
    // Spanish manufacturers
    'VSS': { name: 'SEAT' },
    'VSK': { name: 'SEAT' },
    
    // American manufacturers (for imports)
    '1FA': { name: 'Ford' },
    '1FB': { name: 'Ford' },
    '1FC': { name: 'Ford' },
    '1FD': { name: 'Ford' },
    '1G1': { name: 'Chevrolet' },
    '1G6': { name: 'Cadillac' },
    '1GM': { name: 'Pontiac' },
    '1GC': { name: 'Chevrolet' },
    '1GT': { name: 'GMC' },
    '1HG': { name: 'Honda' },
    '1J4': { name: 'Jeep' },
    '1N4': { name: 'Nissan' },
    '1VW': { name: 'Volkswagen' },
    '2FA': { name: 'Ford' },
    '2G1': { name: 'Chevrolet' },
    '2HG': { name: 'Honda' },
    '2T1': { name: 'Toyota' },
    '3FA': { name: 'Ford' },
    '3G1': { name: 'Chevrolet' },
    '3VW': { name: 'Volkswagen' },
    '4F2': { name: 'Mazda' },
    '4T1': { name: 'Toyota' },
    '5NP': { name: 'Hyundai' },
    '5YJ': { name: 'Tesla' }
  }

  // Year decoding (10th character)
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
    'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  }

  const manufacturer = manufacturerMap[wmi]
  const year = yearMap[yearCode]

  return {
    manufacturer: manufacturer?.name || 'Unknown',
    modelCode: vds,
    year
  }
}

// Get vehicle specification from MOT History API (Primary source)
async function getMotHistorySpecification(registration: string): Promise<VehicleSpecification | null> {
  try {
    console.log(`🔍 [MOT-HISTORY] Looking up specification for ${registration}`)

    // Use the same approach as the working MOT endpoint
    const { DVSAClient } = await import('@/lib/dvsa')
    const { getVehicleDetails } = await import('@/lib/dvla')

    const dvsaClient = DVSAClient.getInstance()

    // Get MOT history and vehicle details like the working endpoint
    const [motHistory, vehicleDetails] = await Promise.all([
      dvsaClient.getMOTHistory(registration).catch(() => null),
      getVehicleDetails(registration).catch(() => null)
    ])

    console.log(`🔍 [MOT-HISTORY] Data check:`, {
      motHistory: !!motHistory,
      vehicleDetails: !!vehicleDetails,
      motMake: motHistory?.make,
      motModel: motHistory?.model,
      dvlaMake: vehicleDetails?.make
    })

    if (motHistory && vehicleDetails) {
      const derivative = extractDerivativeFromModel(motHistory.make, motHistory.model, vehicleDetails.engineCapacity, motHistory.fuelType)

      const result = {
        registration: registration.toUpperCase().replace(/\s/g, ''),
        make: motHistory.make,
        model: motHistory.model,
        derivative: derivative,
        year: vehicleDetails.yearOfManufacture,
        engineSize: vehicleDetails.engineCapacity ? `${vehicleDetails.engineCapacity}cc` : undefined,
        fuelType: motHistory.fuelType,
        colour: vehicleDetails.colour,
        co2Emissions: vehicleDetails.co2Emissions,
        source: 'MOT_HISTORY'
      }

      console.log(`✅ [MOT-HISTORY] Returning result:`, {
        make: result.make,
        model: result.model,
        derivative: result.derivative,
        source: result.source
      })

      return result
    }

    console.log(`⚠️ [MOT-HISTORY] No complete vehicle data found for ${registration}`)
    return null
  } catch (error) {
    console.error('❌ [MOT-HISTORY] Error:', error)
    return null
  }
}

// Get vehicle specification from DVLA API (Secondary source)
async function getDvlaSpecification(registration: string): Promise<VehicleSpecification | null> {
  try {
    console.log(`🔍 [DVLA] Looking up specification for ${registration}`)

    // Import the DVLA lookup function directly
    const { getVehicleDetails } = await import('@/lib/dvla')

    const dvlaData = await getVehicleDetails(registration)

    if (dvlaData && dvlaData.make) {
      // DVLA typically doesn't provide model or derivative, so we'll use intelligent mapping
      const derivative = getDerivativeFromDvlaData(dvlaData)

      return {
        registration: registration.toUpperCase().replace(/\s/g, ''),
        make: dvlaData.make,
        model: dvlaData.model || 'UNKNOWN',
        derivative: derivative,
        year: dvlaData.yearOfManufacture,
        engineSize: dvlaData.engineCapacity ? `${dvlaData.engineCapacity}cc` : undefined,
        fuelType: dvlaData.fuelType,
        colour: dvlaData.colour,
        co2Emissions: dvlaData.co2Emissions,
        source: 'DVLA'
      }
    }

    console.log(`⚠️ [DVLA] No vehicle data found for ${registration}`)
    return null
  } catch (error) {
    console.error('❌ [DVLA] Error:', error)
    return null
  }
}

// Get vehicle specification from SWS/Haynes Pro API (Tertiary source - most detailed)
async function getSWSHaynesSpecification(registration: string): Promise<VehicleSpecification | null> {
  try {
    console.log(`🔍 [SWS-HAYNES] Looking up specification for ${registration}`)

    const response = await fetch(`http://localhost:3001/api/sws-vehicle-data?vrm=${registration}`)

    if (!response.ok) {
      console.log(`⚠️ [SWS-HAYNES] API returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.success && data.data?.technicalData) {
      const techData = data.data.technicalData

      // Extract derivative from fullName field which contains complete vehicle description
      const derivative = extractDerivativeFromHaynesData(techData)

      return {
        registration: registration.toUpperCase().replace(/\s/g, ''),
        make: techData.make || 'UNKNOWN',
        model: techData.model || 'UNKNOWN',
        derivative: derivative,
        year: techData.year || techData.modelYear,
        engineSize: techData.engineSize || techData.engineCapacity,
        fuelType: techData.fuelType,
        colour: techData.colour,
        source: 'SWS_HAYNES_PRO'
      }
    }

    console.log(`⚠️ [SWS-HAYNES] No technical data found for ${registration}`)
    return null
  } catch (error) {
    console.error('❌ [SWS-HAYNES] Error:', error)
    return null
  }
}

// Extract derivative from Haynes Pro technical data
function extractDerivativeFromHaynesData(techData: any): string {
  if (!techData) return 'STANDARD'

  // The fullName field in Haynes Pro data often contains the complete vehicle description
  // Example: "VOLKSWAGEN GOLF 1.4 TSI MATCH 5DR HATCHBACK"
  const fullName = techData.fullName || techData.description || techData.name || ''

  if (fullName) {
    console.log(`🔍 [HAYNES-DERIVATIVE] Analyzing fullName: "${fullName}"`)

    // Extract derivative from the full vehicle name
    const derivative = extractDerivativeFromFullName(fullName)
    if (derivative !== 'STANDARD') {
      console.log(`✅ [HAYNES-DERIVATIVE] Found derivative: "${derivative}"`)
      return derivative
    }
  }

  // Fallback to other fields that might contain derivative information
  const possibleDerivativeFields = [
    techData.trim,
    techData.variant,
    techData.grade,
    techData.series,
    techData.edition,
    techData.specification
  ]

  for (const field of possibleDerivativeFields) {
    if (field && typeof field === 'string' && field.trim()) {
      console.log(`✅ [HAYNES-DERIVATIVE] Found derivative in field: "${field}"`)
      return field.trim().toUpperCase()
    }
  }

  console.log(`⚠️ [HAYNES-DERIVATIVE] No derivative found, using STANDARD`)
  return 'STANDARD'
}

// Extract derivative from full vehicle name (Haynes Pro format)
function extractDerivativeFromFullName(fullName: string): string {
  if (!fullName) return 'STANDARD'

  const nameUpper = fullName.toUpperCase()

  // Common patterns in Haynes Pro full names:
  // "VOLKSWAGEN GOLF 1.4 TSI MATCH 5DR HATCHBACK"
  // "HONDA JAZZ 1.3 DSI SE 5DR HATCHBACK"
  // "FORD FIESTA 1.0 ECOBOOST TITANIUM 5DR HATCHBACK"

  // Split the name into parts
  const parts = nameUpper.split(' ')

  // Look for common derivative patterns
  const derivativePatterns = [
    // Volkswagen derivatives
    'MATCH', 'SE', 'SEL', 'R-LINE', 'GTI', 'R', 'GTD', 'BLUEMOTION', 'COMFORTLINE', 'HIGHLINE',

    // Ford derivatives
    'ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'STYLE', 'EDGE', 'RS', 'ST',

    // Honda derivatives
    'DSI', 'SE', 'SR', 'EX', 'VTEC', 'TYPE R',

    // Audi derivatives
    'SPORT', 'S LINE', 'BLACK EDITION', 'S3', 'RS3', 'S4', 'RS4',

    // BMW derivatives
    'M SPORT', 'M135I', 'M140I', 'M3', 'M5',

    // Mercedes derivatives
    'AMG LINE', 'AMG',

    // Toyota derivatives
    'ICON', 'DESIGN', 'EXCEL', 'GR', 'VVT-I',

    // Nissan derivatives
    'VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA',

    // Vauxhall derivatives
    'DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION', 'ECOFLEX',

    // Engine/fuel derivatives
    'TSI', 'TDI', 'TFSI', 'ECOBOOST', 'BLUEMOTION', 'HYBRID', 'ELECTRIC',

    // Generic derivatives
    'SPORT', 'LUXURY', 'PREMIUM', 'BASE', 'STANDARD'
  ]

  // Look for derivative patterns in the parts
  for (const pattern of derivativePatterns) {
    // Check for exact matches
    if (parts.includes(pattern)) {
      return pattern
    }

    // Check for partial matches (e.g., "S-LINE" vs "S LINE")
    const patternNormalized = pattern.replace(/[\s-]/g, '')
    for (const part of parts) {
      const partNormalized = part.replace(/[\s-]/g, '')
      if (partNormalized === patternNormalized) {
        return pattern
      }
    }
  }

  // Look for multi-word derivatives (e.g., "S LINE", "AMG LINE")
  const multiWordPatterns = [
    'S LINE', 'AMG LINE', 'M SPORT', 'BLACK EDITION', 'LIMITED EDITION',
    'TYPE R', 'ST LINE', 'R LINE'
  ]

  for (const pattern of multiWordPatterns) {
    if (nameUpper.includes(pattern)) {
      return pattern
    }
  }

  // If no specific derivative found, try to extract from position
  // Usually derivative comes after engine size but before body type
  // Example: "VOLKSWAGEN GOLF 1.4 TSI MATCH 5DR HATCHBACK"
  //                                    ^^^^^ derivative

  const engineSizeIndex = parts.findIndex(part => /^\d+\.\d+$/.test(part))
  const bodyTypeIndex = parts.findIndex(part =>
    ['HATCHBACK', 'SALOON', 'ESTATE', 'COUPE', 'CONVERTIBLE', 'SUV', 'MPV', '5DR', '3DR', '4DR'].includes(part)
  )

  if (engineSizeIndex >= 0 && bodyTypeIndex >= 0 && bodyTypeIndex > engineSizeIndex + 1) {
    // Extract parts between engine size and body type
    const derivativeParts = parts.slice(engineSizeIndex + 1, bodyTypeIndex)
    if (derivativeParts.length > 0) {
      const extractedDerivative = derivativeParts.join(' ')
      // Validate it's not just engine type
      if (!['TSI', 'TDI', 'TFSI', 'PETROL', 'DIESEL'].includes(extractedDerivative)) {
        return extractedDerivative
      }
    }
  }

  return 'STANDARD'
}

// Get vehicle specification from JATO VINView API
async function getJatoVinSpecification(vin: string): Promise<VehicleSpecification | null> {
  if (!VEHICLE_SPEC_CONFIG.jato.enabled || !vin) {
    return null
  }

  try {
    console.log(`🔍 [JATO] Decoding VIN: ${vin}`)

    const response = await fetch(`${VEHICLE_SPEC_CONFIG.jato.baseUrl}/decode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VEHICLE_SPEC_CONFIG.jato.apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'GarageManager/1.0'
      },
      body: JSON.stringify({
        vin: vin,
        market: 'GB',
        includeSpecification: true,
        includeOptions: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`⚠️ [JATO] API returned ${response.status}: ${response.statusText} - ${errorText}`)
      return null
    }

    const data = await response.json()

    if (data.status === 'success' && data.vehicle) {
      const vehicle = data.vehicle
      const spec = vehicle.specification || {}

      return {
        registration: '', // Will be filled by caller
        vin: vin,
        make: vehicle.make || spec.make,
        model: vehicle.model || spec.model,
        derivative: vehicle.derivative || spec.derivative || spec.trim || vehicle.grade || 'STANDARD',
        trim: vehicle.trim || spec.trim || vehicle.grade,
        year: vehicle.modelYear || spec.year || vehicle.year,
        engineSize: spec.engineDisplacement ? `${spec.engineDisplacement}cc` : spec.engineSize,
        fuelType: spec.fuelType || vehicle.fuelType,
        transmission: spec.transmission || vehicle.transmission,
        bodyType: spec.bodyStyle || vehicle.bodyStyle,
        doors: spec.doors || vehicle.doors,
        seats: spec.seats || vehicle.seats,
        co2Emissions: spec.co2Emissions,
        euroStatus: spec.euroStatus,
        colour: vehicle.exteriorColor || vehicle.colour,
        source: 'JATO_VINVIEW'
      }
    }

    console.log(`⚠️ [JATO] No vehicle data found for VIN ${vin}`)
    return null
  } catch (error) {
    console.error('❌ [JATO] Error:', error)
    return null
  }
}

// Get vehicle specification from MarketCheck API
async function getMarketCheckSpecification(vin: string): Promise<VehicleSpecification | null> {
  if (!VEHICLE_SPEC_CONFIG.marketCheck.enabled || !vin) {
    return null
  }

  try {
    console.log(`🔍 [MARKETCHECK] Decoding VIN: ${vin}`)

    const response = await fetch(`${VEHICLE_SPEC_CONFIG.marketCheck.baseUrl}/vin/${vin}/specs?api_key=${VEHICLE_SPEC_CONFIG.marketCheck.apiKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GarageManager/1.0'
      }
    })

    if (!response.ok) {
      console.log(`⚠️ [MARKETCHECK] API returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.build && data.build.length > 0) {
      const build = data.build[0] // First build result

      return {
        registration: '', // Will be filled by caller
        vin: vin,
        make: build.make,
        model: build.model,
        derivative: build.trim || build.style || 'STANDARD',
        trim: build.trim,
        year: build.year,
        engineSize: build.engine ? `${build.engine.displacement}L` : undefined,
        fuelType: build.engine?.fuel_type,
        transmission: build.transmission?.type,
        bodyType: build.body?.type,
        doors: build.body?.doors,
        seats: build.interior?.seating_capacity,
        co2Emissions: build.emissions?.co2,
        source: 'MARKETCHECK'
      }
    }

    return null
  } catch (error) {
    console.error('❌ [MARKETCHECK] Error:', error)
    return null
  }
}

// Get enhanced vehicle specification from DVLA with derivative mapping
async function getDvlaEnhancedSpecification(registration: string): Promise<VehicleSpecification | null> {
  if (!VEHICLE_SPEC_CONFIG.dvla.enabled) {
    return null
  }

  try {
    console.log(`🔍 [DVLA-ENHANCED] Looking up ${registration}`)

    const response = await fetch(VEHICLE_SPEC_CONFIG.dvla.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VEHICLE_SPEC_CONFIG.dvla.apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        registrationNumber: registration.replace(/\s/g, '')
      })
    })

    if (!response.ok) {
      console.log(`⚠️ [DVLA-ENHANCED] API returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.make && data.model) {
      // Enhanced derivative mapping based on common UK vehicle patterns
      const derivative = getDerivativeFromDvlaData(data)

      return {
        registration: registration.toUpperCase().replace(/\s/g, ''),
        make: data.make,
        model: data.model,
        derivative: derivative,
        year: data.yearOfManufacture,
        engineSize: data.engineCapacity ? `${data.engineCapacity}cc` : undefined,
        fuelType: data.fuelType,
        colour: data.colour,
        co2Emissions: data.co2Emissions,
        euroStatus: data.euroStatus,
        source: 'DVLA_ENHANCED'
      }
    }

    return null
  } catch (error) {
    console.error('❌ [DVLA-ENHANCED] Error:', error)
    return null
  }
}

// Enhanced derivative mapping based on DVLA data and common patterns
function getDerivativeFromDvlaData(dvlaData: any): string {
  const make = dvlaData.make?.toUpperCase()
  const model = dvlaData.model?.toUpperCase()
  const engineCapacity = dvlaData.engineCapacity
  const fuelType = dvlaData.fuelType?.toUpperCase()
  const year = dvlaData.yearOfManufacture

  // Common derivative patterns for popular UK vehicles
  const derivativePatterns: Record<string, Record<string, string[]>> = {
    'FORD': {
      'FIESTA': ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND'],
      'FOCUS': ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'RS', 'ST'],
      'KUGA': ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE'],
      'MONDEO': ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE'],
      'TRANSIT': ['TREND', 'LIMITED', 'SPORT']
    },
    'VOLKSWAGEN': {
      'GOLF': ['S', 'SE', 'SEL', 'R-LINE', 'GTI', 'R', 'GTD'],
      'POLO': ['S', 'SE', 'SEL', 'R-LINE', 'GTI'],
      'PASSAT': ['S', 'SE', 'SEL', 'R-LINE', 'ALLTRACK'],
      'TIGUAN': ['S', 'SE', 'SEL', 'R-LINE'],
      'TOURAN': ['S', 'SE', 'SEL']
    },
    'AUDI': {
      'A3': ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S3', 'RS3'],
      'A4': ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S4', 'RS4'],
      'A6': ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S6', 'RS6'],
      'Q3': ['SE', 'SPORT', 'S LINE', 'BLACK EDITION'],
      'Q5': ['SE', 'SPORT', 'S LINE', 'BLACK EDITION']
    },
    'BMW': {
      '1 SERIES': ['SE', 'SPORT', 'M SPORT', 'M135I'],
      '3 SERIES': ['SE', 'SPORT', 'M SPORT', 'M3'],
      '5 SERIES': ['SE', 'SPORT', 'M SPORT', 'M5'],
      'X1': ['SE', 'SPORT', 'M SPORT'],
      'X3': ['SE', 'SPORT', 'M SPORT'],
      'X5': ['SE', 'SPORT', 'M SPORT']
    },
    'MERCEDES-BENZ': {
      'A CLASS': ['SE', 'SPORT', 'AMG LINE', 'AMG'],
      'C CLASS': ['SE', 'SPORT', 'AMG LINE', 'AMG'],
      'E CLASS': ['SE', 'SPORT', 'AMG LINE', 'AMG'],
      'GLA': ['SE', 'SPORT', 'AMG LINE'],
      'GLC': ['SE', 'SPORT', 'AMG LINE']
    },
    'TOYOTA': {
      'YARIS': ['ICON', 'DESIGN', 'EXCEL', 'GR'],
      'COROLLA': ['ICON', 'DESIGN', 'EXCEL', 'GR'],
      'RAV4': ['ICON', 'DESIGN', 'EXCEL'],
      'PRIUS': ['ACTIVE', 'BUSINESS EDITION', 'EXCEL'],
      'AYGO': ['X', 'X-PLAY', 'X-CITE', 'X-CLUSIV']
    },
    'HONDA': {
      'CIVIC': ['S', 'SE', 'SR', 'EX', 'TYPE R'],
      'CR-V': ['S', 'SE', 'SR', 'EX'],
      'JAZZ': ['S', 'SE', 'SR', 'EX'],
      'HR-V': ['S', 'SE', 'SR', 'EX']
    },
    'NISSAN': {
      'MICRA': ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'],
      'JUKE': ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'],
      'QASHQAI': ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'],
      'X-TRAIL': ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA']
    },
    'VAUXHALL': {
      'CORSA': ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION'],
      'ASTRA': ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION'],
      'INSIGNIA': ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION'],
      'MOKKA': ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION']
    }
  }

  // Try to match derivative based on patterns
  if (make && model && derivativePatterns[make]?.[model]) {
    const possibleDerivatives = derivativePatterns[make][model]

    // For now, return the most common derivative (first in list)
    // In a real implementation, you'd use additional data to determine the exact derivative
    return possibleDerivatives[0]
  }

  // Fallback based on engine size and fuel type
  if (engineCapacity && fuelType) {
    if (fuelType.includes('ELECTRIC')) return 'ELECTRIC'
    if (fuelType.includes('HYBRID')) return 'HYBRID'
    if (engineCapacity >= 2000) return 'HIGH PERFORMANCE'
    if (engineCapacity >= 1600) return 'SPORT'
    return 'STANDARD'
  }

  return 'STANDARD'
}

// Extract derivative from model name using intelligent parsing
function extractDerivativeFromModel(make: string, model: string, engineCapacity?: number, fuelType?: string): string {
  if (!make || !model) return 'STANDARD'

  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()

  // Common derivative patterns found in UK vehicle data
  const derivativePatterns = [
    // Ford patterns
    { make: 'FORD', model: 'FIESTA', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'STYLE', 'EDGE'] },
    { make: 'FORD', model: 'FOCUS', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE', 'ACTIVE', 'TREND', 'STYLE', 'EDGE', 'RS', 'ST'] },
    { make: 'FORD', model: 'KUGA', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE'] },
    { make: 'FORD', model: 'MONDEO', patterns: ['ZETEC', 'TITANIUM', 'ST-LINE', 'VIGNALE'] },

    // Volkswagen patterns
    { make: 'VOLKSWAGEN', model: 'GOLF', patterns: ['MATCH', 'SE', 'SEL', 'R-LINE', 'GTI', 'R', 'GTD', 'BLUEMOTION', 'TSI', 'TDI'] },
    { make: 'VOLKSWAGEN', model: 'POLO', patterns: ['MATCH', 'SE', 'SEL', 'R-LINE', 'GTI', 'BLUEMOTION', 'TSI', 'TDI'] },
    { make: 'VOLKSWAGEN', model: 'PASSAT', patterns: ['SE', 'SEL', 'R-LINE', 'ALLTRACK', 'BLUEMOTION', 'TSI', 'TDI'] },
    { make: 'VOLKSWAGEN', model: 'TIGUAN', patterns: ['SE', 'SEL', 'R-LINE', 'BLUEMOTION', 'TSI', 'TDI'] },

    // Audi patterns
    { make: 'AUDI', model: 'A3', patterns: ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S3', 'RS3', 'TFSI', 'TDI'] },
    { make: 'AUDI', model: 'A4', patterns: ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S4', 'RS4', 'TFSI', 'TDI'] },
    { make: 'AUDI', model: 'A6', patterns: ['SE', 'SPORT', 'S LINE', 'BLACK EDITION', 'S6', 'RS6', 'TFSI', 'TDI'] },

    // BMW patterns
    { make: 'BMW', model: '1 SERIES', patterns: ['SE', 'SPORT', 'M SPORT', 'M135I', 'M140I'] },
    { make: 'BMW', model: '3 SERIES', patterns: ['SE', 'SPORT', 'M SPORT', 'M3'] },
    { make: 'BMW', model: '5 SERIES', patterns: ['SE', 'SPORT', 'M SPORT', 'M5'] },

    // Mercedes patterns
    { make: 'MERCEDES-BENZ', model: 'A CLASS', patterns: ['SE', 'SPORT', 'AMG LINE', 'AMG'] },
    { make: 'MERCEDES-BENZ', model: 'C CLASS', patterns: ['SE', 'SPORT', 'AMG LINE', 'AMG'] },
    { make: 'MERCEDES-BENZ', model: 'E CLASS', patterns: ['SE', 'SPORT', 'AMG LINE', 'AMG'] },

    // Toyota patterns
    { make: 'TOYOTA', model: 'YARIS', patterns: ['ICON', 'DESIGN', 'EXCEL', 'GR', 'VVT-I'] },
    { make: 'TOYOTA', model: 'COROLLA', patterns: ['ICON', 'DESIGN', 'EXCEL', 'GR'] },
    { make: 'TOYOTA', model: 'AYGO', patterns: ['X', 'X-PLAY', 'X-CITE', 'X-CLUSIV', 'VVT-I'] },

    // Honda patterns
    { make: 'HONDA', model: 'CIVIC', patterns: ['S', 'SE', 'SR', 'EX', 'TYPE R', 'VTEC'] },
    { make: 'HONDA', model: 'JAZZ', patterns: ['S', 'SE', 'SR', 'EX', 'DSI', 'VTEC'] },

    // Nissan patterns
    { make: 'NISSAN', model: 'MICRA', patterns: ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'] },
    { make: 'NISSAN', model: 'JUKE', patterns: ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'] },
    { make: 'NISSAN', model: 'QASHQAI', patterns: ['VISIA', 'ACENTA', 'N-CONNECTA', 'TEKNA'] },

    // Vauxhall patterns
    { make: 'VAUXHALL', model: 'CORSA', patterns: ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION', 'ECOFLEX'] },
    { make: 'VAUXHALL', model: 'ASTRA', patterns: ['DESIGN', 'SRI', 'ELITE', 'LIMITED EDITION', 'ECOFLEX'] },
  ]

  // Find matching patterns for this make/model
  const matchingPattern = derivativePatterns.find(p =>
    p.make === makeUpper && p.model === modelUpper
  )

  if (matchingPattern) {
    // Look for derivative patterns in the model string
    for (const pattern of matchingPattern.patterns) {
      if (modelUpper.includes(pattern)) {
        return pattern
      }
    }
  }

  // Generic patterns that work across makes
  const genericPatterns = [
    'BLUEMOTION TECHNOLOGY', 'BLUEMOTION', 'TECHNOLOGY',
    'TSI', 'TDI', 'TFSI', 'VTEC', 'VVT-I', 'DSI',
    'SPORT', 'SE', 'SEL', 'S LINE', 'R-LINE', 'AMG LINE',
    'TITANIUM', 'ZETEC', 'TREND', 'STYLE', 'EDGE',
    'ICON', 'DESIGN', 'EXCEL', 'ACTIVE', 'VIGNALE',
    'ECOFLEX', 'ECOBOOST', 'HYBRID', 'ELECTRIC'
  ]

  // Look for generic patterns
  for (const pattern of genericPatterns) {
    if (modelUpper.includes(pattern)) {
      return pattern
    }
  }

  // Engine-based derivative detection
  if (engineCapacity && fuelType) {
    const fuelUpper = fuelType.toUpperCase()

    if (fuelUpper.includes('ELECTRIC')) return 'ELECTRIC'
    if (fuelUpper.includes('HYBRID')) return 'HYBRID'

    if (engineCapacity >= 2000) {
      return fuelUpper.includes('DIESEL') ? 'TDI' : 'TSI'
    } else if (engineCapacity >= 1600) {
      return 'SPORT'
    } else if (engineCapacity <= 1000) {
      return 'ECO'
    }
  }

  return 'STANDARD'
}

// Cache vehicle specification in database
async function cacheVehicleSpecification(spec: VehicleSpecification): Promise<void> {
  try {
    // Convert engine size from string like "1395cc" to numeric value
    const engineSizeNumeric = spec.engineSize ?
      parseInt(spec.engineSize.replace(/[^\d]/g, '')) || null : null

    // Use only the columns that exist in the current schema
    await sql`
      INSERT INTO vehicles (
        registration, vin, make, model, derivative, year, engine_size,
        fuel_type, color, updated_at
      ) VALUES (
        ${spec.registration}, ${spec.vin}, ${spec.make}, ${spec.model},
        ${spec.derivative}, ${spec.year}, ${engineSizeNumeric}, ${spec.fuelType},
        ${spec.colour}, NOW()
      )
      ON CONFLICT (registration)
      DO UPDATE SET
        vin = EXCLUDED.vin,
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        derivative = EXCLUDED.derivative,
        year = EXCLUDED.year,
        engine_size = EXCLUDED.engine_size,
        fuel_type = EXCLUDED.fuel_type,
        color = EXCLUDED.color,
        updated_at = NOW()
    `
    console.log(`💾 [CACHE] Cached specification for ${spec.registration}`)
  } catch (error) {
    console.error('❌ [CACHE] Error caching specification:', error)
  }
}

// GET endpoint - retrieve vehicle specification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const registration = searchParams.get('registration')?.toUpperCase().replace(/\s/g, '')
    const vin = searchParams.get('vin')
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    if (!registration && !vin) {
      return NextResponse.json(
        { success: false, error: 'Registration or VIN is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 [VEHICLE-SPEC] Looking up specification for ${registration || vin}`)

    // Check cache first (unless force refresh)
    if (!forceRefresh && registration) {
      const cached = await sql`
        SELECT
          registration, vin, make, model, derivative, year, engine_size,
          fuel_type, color, updated_at
        FROM vehicles
        WHERE registration = ${registration}
        AND make IS NOT NULL
        AND derivative IS NOT NULL
        AND updated_at > NOW() - INTERVAL '30 days'
        LIMIT 1
      `

      if (cached.length > 0) {
        const vehicle = cached[0]
        console.log(`💾 [VEHICLE-SPEC] Using cached data for ${registration}`)

        return NextResponse.json({
          success: true,
          data: {
            registration: vehicle.registration,
            vin: vehicle.vin,
            make: vehicle.make,
            model: vehicle.model,
            derivative: vehicle.derivative,
            year: vehicle.year,
            engineSize: vehicle.engine_size,
            fuelType: vehicle.fuel_type,
            colour: vehicle.color,
            source: 'CACHED'
          },
          cached: true,
          lastUpdated: vehicle.updated_at
        })
      }
    }

    // Try multiple APIs in order of preference for UK vehicles
    let specification: VehicleSpecification | null = null

    console.log(`🔍 [VEHICLE-SPEC] Starting API calls for ${registration}`)

    // 1. Try MOT History API (Primary - most comprehensive for UK vehicles)
    if (registration && !specification) {
      console.log(`🔍 [VEHICLE-SPEC] Calling getMotHistorySpecification`)
      specification = await getMotHistorySpecification(registration)
      console.log(`🔍 [VEHICLE-SPEC] MOT History result:`, specification ? 'SUCCESS' : 'NULL')
      if (specification) {
        console.log(`🔍 [VEHICLE-SPEC] MOT History data:`, {
          make: specification.make,
          model: specification.model,
          derivative: specification.derivative,
          source: specification.source
        })
      }
    }

    // 2. Try DVLA API (Secondary - basic vehicle data)
    if (registration && !specification) {
      console.log(`🔍 [VEHICLE-SPEC] Calling getDvlaSpecification`)
      specification = await getDvlaSpecification(registration)
      console.log(`🔍 [VEHICLE-SPEC] DVLA result:`, specification ? 'SUCCESS' : 'NULL')
    }

    // 3. Try SWS/Haynes Pro API for detailed vehicle specification including derivative
    if (registration && !specification) {
      console.log(`🔍 [VEHICLE-SPEC] Calling getSWSHaynesSpecification`)
      specification = await getSWSHaynesSpecification(registration)
      console.log(`🔍 [VEHICLE-SPEC] SWS result:`, specification ? 'SUCCESS' : 'NULL')
    }

    console.log(`🔍 [VEHICLE-SPEC] Final specification:`, specification ? 'FOUND' : 'NOT FOUND')

    if (!specification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle specification not found',
          message: 'Unable to retrieve vehicle specification from any available source'
        },
        { status: 404 }
      )
    }

    // Cache the result
    await cacheVehicleSpecification(specification)

    console.log(`✅ [VEHICLE-SPEC] Found specification for ${specification.registration}: ${specification.make} ${specification.model} ${specification.derivative}`)

    console.log(`🔍 [VEHICLE-SPEC] Final response data:`, {
      make: specification.make,
      model: specification.model,
      derivative: specification.derivative,
      source: specification.source,
      fullSpec: specification
    })

    return NextResponse.json({
      success: true,
      data: specification,
      cached: false,
      source: specification.source
    })

  } catch (error) {
    console.error('❌ [VEHICLE-SPEC] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve vehicle specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint - batch lookup or force refresh
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrations, vins, forceRefresh = false } = body

    if (!registrations && !vins) {
      return NextResponse.json(
        { success: false, error: 'Registrations or VINs array is required' },
        { status: 400 }
      )
    }

    const results: Array<{ input: string; success: boolean; data?: VehicleSpecification; error?: string }> = []
    const inputs = registrations || vins || []

    console.log(`🔍 [VEHICLE-SPEC-BATCH] Processing ${inputs.length} vehicles`)

    for (const input of inputs) {
      try {
        const isVin = input.length === 17
        const searchParams = new URLSearchParams()

        if (isVin) {
          searchParams.set('vin', input)
        } else {
          searchParams.set('registration', input)
        }

        if (forceRefresh) {
          searchParams.set('force_refresh', 'true')
        }

        // Call our own GET endpoint
        const response = await GET(new NextRequest(`${request.url}?${searchParams}`))
        const result = await response.json()

        if (result.success) {
          results.push({
            input,
            success: true,
            data: result.data
          })
        } else {
          results.push({
            input,
            success: false,
            error: result.error
          })
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        results.push({
          input,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ [VEHICLE-SPEC-BATCH] Completed: ${successCount}/${inputs.length} successful`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: inputs.length,
        successful: successCount,
        failed: inputs.length - successCount
      }
    })

  } catch (error) {
    console.error('❌ [VEHICLE-SPEC-BATCH] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process batch request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
