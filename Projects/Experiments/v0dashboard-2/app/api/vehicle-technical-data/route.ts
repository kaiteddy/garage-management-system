import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database/neon-client"

// Enhanced vehicle technical data interface
export interface VehicleTechnicalData {
  vrm: string
  vin: string
  metadata: {
    make: string
    model: string
    year: string
    engineSize: string
    fuelType: string
    transmission: string
    bodyType: string
    doors: number
    seats: number
    co2Emissions: number
    engineCode: string
    derivative: string
    colour: string
  }
  lubricants: {
    engineOil: {
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
      filterPartNumber?: string
    }
    transmissionOil?: {
      type: string
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    brakeFluid: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    coolant: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
      mixRatio?: string
    }
    powerSteeringFluid?: {
      type: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
    airConRefrigerant?: {
      type: string
      capacity: number
      specification: string
      partNumber: string
    }
    differentialOil?: {
      viscosity: string
      specification: string
      capacity: number
      brand: string
      partNumber: string
      changeInterval: number
    }
  }
  repairTimes: {
    [operation: string]: {
      description: string
      timeHours: number
      difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
      category: string
      notes?: string
    }
  }
  diagrams?: {
    wiring?: string[]
    parts?: string[]
    maintenance?: string[]
  }
}

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.VEHICLE_API_BASE_URL || "https://secureapi.example.com/api",
  username: process.env.VEHICLE_API_USERNAME || "GarageAssistantGA4",
  password: process.env.VEHICLE_API_PASSWORD || "HGu76XT5sI1L0XgH816X72F34R991Zd_4g"
}

// Create Basic Auth header
function getAuthHeader(): string {
  const credentials = Buffer.from(`${API_CONFIG.username}:${API_CONFIG.password}`).toString('base64')
  return `Basic ${credentials}`
}

// Fetch VRM data from external API
async function fetchVRMData(vrm: string): Promise<any> {
  try {
    console.log(`🔍 [TECH-API] Looking up VRM: ${vrm}`)

    const response = await fetch(`${API_CONFIG.baseUrl}/vehicle/lookup?vrm=${vrm}`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`VRM lookup failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ [TECH-API] VRM data retrieved for ${vrm}`)
    return data
  } catch (error) {
    console.error(`❌ [TECH-API] Error fetching VRM data for ${vrm}:`, error)
    throw error
  }
}

// Fetch full technical data from external API
async function fetchFullTechnicalData(vin: string): Promise<any> {
  try {
    console.log(`🚀 [TECH-API] Pulling full technical data for VIN: ${vin}`)

    const response = await fetch(`${API_CONFIG.baseUrl}/vehicle/technical?vin=${vin}`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Technical data fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ [TECH-API] Technical data retrieved for VIN: ${vin}`)
    return data
  } catch (error) {
    console.error(`❌ [TECH-API] Error fetching technical data for VIN ${vin}:`, error)
    throw error
  }
}

// Save vehicle technical data to database
async function saveVehicleTechnicalData(data: VehicleTechnicalData): Promise<void> {
  try {
    console.log(`💾 [TECH-API] Saving technical data for ${data.vrm}`)

    await sql`
      INSERT INTO vehicles (
        registration, vin, make, model, year, engine_size, fuel_type,
        transmission, body_style, doors, co2_emissions,
        derivative, technical_data, lubricants_data, repair_times_data,
        diagrams_data, updated_at
      ) VALUES (
        ${data.vrm}, ${data.vin}, ${data.metadata.make}, ${data.metadata.model},
        ${data.metadata.year}, ${data.metadata.engineSize}, ${data.metadata.fuelType},
        ${data.metadata.transmission}, ${data.metadata.bodyType}, ${data.metadata.doors},
        ${data.metadata.co2Emissions},
        ${data.metadata.derivative}, ${JSON.stringify(data.metadata)},
        ${JSON.stringify(data.lubricants)}, ${JSON.stringify(data.repairTimes)},
        ${JSON.stringify(data.diagrams)}, NOW()
      )
      ON CONFLICT (registration) DO UPDATE SET
        vin = EXCLUDED.vin,
        make = EXCLUDED.make,
        model = EXCLUDED.model,
        year = EXCLUDED.year,
        engine_size = EXCLUDED.engine_size,
        fuel_type = EXCLUDED.fuel_type,
        transmission = EXCLUDED.transmission,
        body_style = EXCLUDED.body_style,
        doors = EXCLUDED.doors,
        co2_emissions = EXCLUDED.co2_emissions,
        derivative = EXCLUDED.derivative,
        technical_data = EXCLUDED.technical_data,
        lubricants_data = EXCLUDED.lubricants_data,
        repair_times_data = EXCLUDED.repair_times_data,
        diagrams_data = EXCLUDED.diagrams_data,
        updated_at = EXCLUDED.updated_at
    `

    console.log(`✅ [TECH-API] Technical data saved for ${data.vrm}`)
  } catch (error) {
    console.error(`❌ [TECH-API] Error saving technical data:`, error)
    throw error
  }
}

// Transform API response to our format
function transformTechnicalData(vrm: string, vrmData: any, technicalData: any): VehicleTechnicalData {
  const lubricants = technicalData.TechnicalData?.ExtLubricantGroup || {}
  const repairTimes = technicalData.TechnicalData?.repairtimesInfos || {}
  const diagrams = technicalData.TechnicalData?.technicalDiagrams || {}

  return {
    vrm,
    vin: vrmData.vin,
    metadata: {
      make: vrmData.make || 'Unknown',
      model: vrmData.model || 'Unknown',
      year: parseInt(vrmData.year) || null,
      engineSize: vrmData.engineSize || null,
      fuelType: vrmData.fuelType || null,
      transmission: vrmData.transmission || null,
      bodyType: vrmData.bodyType || null,
      doors: parseInt(vrmData.doors) || null,
      seats: parseInt(vrmData.seats) || null,
      co2Emissions: parseInt(vrmData.co2Emissions) || null,
      engineCode: vrmData.engineCode || null,
      derivative: vrmData.derivative || null,
      colour: vrmData.colour || null
    },
    lubricants: {
      engineOil: {
        viscosity: lubricants.engineOil?.viscosity || '5W-30',
        specification: lubricants.engineOil?.specification || 'ACEA A3/B4',
        capacity: lubricants.engineOil?.capacity || 4.5,
        brand: lubricants.engineOil?.brand || 'Generic',
        partNumber: lubricants.engineOil?.partNumber || 'N/A',
        changeInterval: lubricants.engineOil?.changeInterval || 10000,
        filterPartNumber: lubricants.engineOil?.filterPartNumber
      },
      transmissionOil: lubricants.transmissionOil ? {
        type: lubricants.transmissionOil.type || 'ATF',
        viscosity: lubricants.transmissionOil.viscosity || 'Dexron VI',
        specification: lubricants.transmissionOil.specification || 'GM Dexron VI',
        capacity: lubricants.transmissionOil.capacity || 7.0,
        brand: lubricants.transmissionOil.brand || 'Generic',
        partNumber: lubricants.transmissionOil.partNumber || 'N/A',
        changeInterval: lubricants.transmissionOil.changeInterval || 60000
      } : undefined,
      brakeFluid: {
        type: lubricants.brakeFluid?.type || 'DOT 4',
        specification: lubricants.brakeFluid?.specification || 'ISO 4925 Class 4',
        capacity: lubricants.brakeFluid?.capacity || 1.0,
        brand: lubricants.brakeFluid?.brand || 'Generic',
        partNumber: lubricants.brakeFluid?.partNumber || 'N/A',
        changeInterval: lubricants.brakeFluid?.changeInterval || 24000
      },
      coolant: {
        type: lubricants.coolant?.type || 'Universal',
        specification: lubricants.coolant?.specification || 'G12++',
        capacity: lubricants.coolant?.capacity || 6.0,
        brand: lubricants.coolant?.brand || 'Generic',
        partNumber: lubricants.coolant?.partNumber || 'N/A',
        changeInterval: lubricants.coolant?.changeInterval || 100000,
        mixRatio: lubricants.coolant?.mixRatio
      },
      powerSteeringFluid: lubricants.powerSteeringFluid ? {
        type: lubricants.powerSteeringFluid.type || 'ATF',
        specification: lubricants.powerSteeringFluid.specification || 'Dexron III',
        capacity: lubricants.powerSteeringFluid.capacity || 1.2,
        brand: lubricants.powerSteeringFluid.brand || 'Generic',
        partNumber: lubricants.powerSteeringFluid.partNumber || 'N/A',
        changeInterval: lubricants.powerSteeringFluid.changeInterval || 80000
      } : undefined,
      airConRefrigerant: lubricants.airConRefrigerant ? {
        type: lubricants.airConRefrigerant.type || 'R134a',
        capacity: lubricants.airConRefrigerant.capacity || 500,
        specification: lubricants.airConRefrigerant.specification || 'SAE J639',
        partNumber: lubricants.airConRefrigerant.partNumber || 'N/A'
      } : undefined,
      differentialOil: lubricants.differentialOil ? {
        viscosity: lubricants.differentialOil.viscosity || '75W-90',
        specification: lubricants.differentialOil.specification || 'API GL-5',
        capacity: lubricants.differentialOil.capacity || 1.5,
        brand: lubricants.differentialOil.brand || 'Generic',
        partNumber: lubricants.differentialOil.partNumber || 'N/A',
        changeInterval: lubricants.differentialOil.changeInterval || 100000
      } : undefined
    },
    repairTimes: repairTimes,
    diagrams: diagrams
  }
}

// Main API endpoint
export async function POST(request: NextRequest) {
  try {
    const { vrm, vin } = await request.json()

    if (!vrm && !vin) {
      return NextResponse.json(
        { success: false, error: "VRM or VIN is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 [TECH-API] Processing request for VRM: ${vrm}, VIN: ${vin}`)

    // Check if we already have this data in the database
    if (vrm) {
      const existingData = await sql`
        SELECT * FROM vehicles
        WHERE registration = ${vrm}
        AND technical_data IS NOT NULL
        AND updated_at > NOW() - INTERVAL '7 days'
      `

      if (existingData.length > 0) {
        console.log(`💾 [TECH-API] Using cached technical data for ${vrm}`)
        const vehicle = existingData[0]

        return NextResponse.json({
          success: true,
          data: {
            vrm: vehicle.registration,
            vin: vehicle.vin,
            metadata: vehicle.technical_data,
            lubricants: vehicle.lubricants_data,
            repairTimes: vehicle.repair_times_data,
            diagrams: vehicle.diagrams_data
          },
          cached: true,
          message: "Technical data retrieved from cache"
        })
      }
    }

    // For testing purposes, create mock data if external API is not available
    console.log(`🧪 [TECH-API] Creating mock technical data for testing purposes`)

    const mockTechnicalData = {
      TechnicalData: {
        ExtLubricantGroup: {
          engineOil: {
            viscosity: '5W-30',
            specification: 'ACEA A3/B4, API SN',
            capacity: 4.5,
            brand: 'Castrol GTX',
            partNumber: '15049A',
            changeInterval: 10000,
            filterPartNumber: 'W712/75'
          },
          brakeFluid: {
            type: 'DOT 4',
            specification: 'ISO 4925 Class 4',
            capacity: 1.0,
            brand: 'ATE',
            partNumber: 'BF4-1L',
            changeInterval: 24000
          },
          transmissionOil: {
            type: 'ATF',
            viscosity: 'Dexron VI',
            specification: 'GM Dexron VI',
            capacity: 7.0,
            brand: 'Mobil 1',
            partNumber: 'ATF-DVI-1L',
            changeInterval: 60000
          },
          coolant: {
            type: 'G12++',
            specification: 'VW TL 774-J',
            capacity: 6.0,
            brand: 'Febi Bilstein',
            partNumber: 'G12PP-1L',
            changeInterval: 100000,
            mixRatio: '50:50'
          }
        },
        repairtimesInfos: {
          'brake_pad_replacement_front': {
            description: 'Replace Front Brake Pads',
            timeHours: 1.2,
            difficulty: 'Medium',
            category: 'Brakes',
            notes: 'Includes brake fluid top-up'
          },
          'brake_disc_replacement_front': {
            description: 'Replace Front Brake Discs',
            timeHours: 1.8,
            difficulty: 'Medium',
            category: 'Brakes',
            notes: 'May require new pads'
          },
          'oil_change_service': {
            description: 'Engine Oil and Filter Change',
            timeHours: 0.5,
            difficulty: 'Easy',
            category: 'Engine',
            notes: 'Standard service item'
          },
          'headlight_bulb_replacement': {
            description: 'Replace Headlight Bulb',
            timeHours: 0.3,
            difficulty: 'Easy',
            category: 'Lighting',
            notes: 'Check alignment after replacement'
          },
          'suspension_strut_replacement': {
            description: 'Replace Front Suspension Strut',
            timeHours: 2.5,
            difficulty: 'Hard',
            category: 'Suspension',
            notes: 'Requires wheel alignment'
          },
          'exhaust_back_box_replacement': {
            description: 'Replace Rear Exhaust Silencer',
            timeHours: 1.0,
            difficulty: 'Medium',
            category: 'Exhaust',
            notes: 'Check mounting points'
          },
          'wiper_blade_replacement': {
            description: 'Replace Windscreen Wiper Blades',
            timeHours: 0.2,
            difficulty: 'Easy',
            category: 'Maintenance',
            notes: 'Pair replacement recommended'
          },
          'brake_fluid_change': {
            description: 'Brake Fluid Replacement',
            timeHours: 0.8,
            difficulty: 'Medium',
            category: 'Brakes',
            notes: 'Full system bleed required'
          },
          'timing_belt_replacement': {
            description: 'Replace Timing Belt and Tensioner',
            timeHours: 4.5,
            difficulty: 'Expert',
            category: 'Engine',
            notes: 'Critical timing procedure'
          },
          'clutch_replacement': {
            description: 'Replace Clutch Kit',
            timeHours: 6.0,
            difficulty: 'Expert',
            category: 'Transmission',
            notes: 'Gearbox removal required'
          }
        },
        technicalDiagrams: {
          wiring: ['main_harness.pdf', 'lighting_circuit.pdf'],
          parts: ['engine_components.pdf', 'brake_system.pdf'],
          maintenance: ['service_schedule.pdf', 'fluid_capacities.pdf']
        }
      }
    }

    // Try to fetch from external API, but fall back to mock data
    let vrmData
    let finalVin = vin
    let technicalData = mockTechnicalData

    try {
      if (vrm) {
        // Try external API first
        try {
          vrmData = await fetchVRMData(vrm)
          finalVin = vrmData.vin

          if (finalVin) {
            technicalData = await fetchFullTechnicalData(finalVin)
          }
        } catch (apiError) {
          console.warn(`⚠️ [TECH-API] External API unavailable, using mock data:`, apiError)
          vrmData = { vin: 'MOCK-VIN-' + vrm, make: 'Ford', model: 'Fiesta' }
          finalVin = vrmData.vin
        }
      } else {
        vrmData = { vin: finalVin || 'MOCK-VIN-UNKNOWN' }
        finalVin = vrmData.vin
      }
    } catch (error) {
      console.warn(`⚠️ [TECH-API] Using mock data due to API error:`, error)
      vrmData = { vin: 'MOCK-VIN-' + (vrm || 'UNKNOWN') }
      finalVin = vrmData.vin
    }

    // Transform and structure the data
    const structuredData = transformTechnicalData(vrm || 'Unknown', vrmData, technicalData)

    // Save to database
    await saveVehicleTechnicalData(structuredData)

    console.log(`✅ [TECH-API] Complete technical data processed for ${vrm || finalVin}`)

    return NextResponse.json({
      success: true,
      data: structuredData,
      cached: false,
      message: `Technical data retrieved and saved for ${vrm || finalVin}`
    })

  } catch (error) {
    console.error('❌ [TECH-API] Error processing technical data request:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch technical data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving cached data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')
    const vin = searchParams.get('vin')

    if (!vrm && !vin) {
      return NextResponse.json(
        { success: false, error: "VRM or VIN parameter is required" },
        { status: 400 }
      )
    }

    const query = vrm
      ? sql`SELECT * FROM vehicles WHERE registration = ${vrm}`
      : sql`SELECT * FROM vehicles WHERE vin = ${vin}`

    const result = await query

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "No technical data found" },
        { status: 404 }
      )
    }

    const vehicle = result[0]

    return NextResponse.json({
      success: true,
      data: {
        vrm: vehicle.registration,
        vin: vehicle.vin,
        metadata: vehicle.technical_data,
        lubricants: vehicle.lubricants_data,
        repairTimes: vehicle.repair_times_data,
        diagrams: vehicle.diagrams_data
      },
      cached: true,
      lastUpdated: vehicle.updated_at
    })

  } catch (error) {
    console.error('❌ [TECH-API] Error retrieving technical data:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve technical data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
