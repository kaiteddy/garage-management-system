import { NextRequest, NextResponse } from "next/server"

// Oil and lubricants data interface
export interface VehicleOilData {
  vin: string
  make: string
  model: string
  year: string
  engineCode?: string
  engineSize?: string
  fuelType?: string

  // Oil specifications
  engineOil: {
    viscosity: string // e.g., "5W-30", "0W-20"
    specification: string // e.g., "ACEA A3/B4", "API SN"
    capacity: number // in liters
    brand?: string
    partNumber?: string
    changeInterval: number // in miles or km
  }

  // Transmission oil
  transmissionOil?: {
    type: string // e.g., "ATF", "Manual Transmission Oil"
    viscosity: string
    specification: string
    capacity: number
    brand?: string
    partNumber?: string
    changeInterval: number
  }

  // Differential oil
  differentialOil?: {
    viscosity: string
    specification: string
    capacity: number
    brand?: string
    partNumber?: string
    changeInterval: number
  }

  // Brake fluid
  brakeFluid: {
    type: string // e.g., "DOT 4", "DOT 5.1"
    specification: string
    capacity: number
    brand?: string
    partNumber?: string
    changeInterval: number
  }

  // Power steering fluid
  powerSteeringFluid?: {
    type: string
    specification: string
    capacity: number
    brand?: string
    partNumber?: string
    changeInterval: number
  }

  // Coolant
  coolant: {
    type: string // e.g., "G12+", "G13"
    specification: string
    capacity: number
    brand?: string
    partNumber?: string
    changeInterval: number
  }

  // Additional lubricants
  additionalLubricants?: {
    [key: string]: {
      type: string
      specification: string
      capacity: number
      brand?: string
      partNumber?: string
      changeInterval?: number
    }
  }
}

// Mock database of oil specifications by VIN patterns
const getOilDataByVIN = (vin: string): VehicleOilData | null => {
  // Extract manufacturer from VIN (first 3 characters are World Manufacturer Identifier)
  const wmi = vin.substring(0, 3).toUpperCase()

  // Mock data based on VIN patterns - in production, this would query a real database
  const oilDatabase: { [key: string]: Partial<VehicleOilData> } = {
    // Volkswagen Group (WVW, WV1, etc.)
    'WVW': {
      make: 'Volkswagen',
      engineOil: {
        viscosity: '5W-30',
        specification: 'VW 504.00/507.00',
        capacity: 4.3,
        brand: 'Castrol',
        partNumber: 'G052183M2',
        changeInterval: 10000
      },
      transmissionOil: {
        type: 'ATF',
        viscosity: 'G 060162 A2',
        specification: 'VW G 060162',
        capacity: 7.0,
        brand: 'Febi',
        partNumber: '39070',
        changeInterval: 60000
      },
      brakeFluid: {
        type: 'DOT 4',
        specification: 'ISO 4925 Class 4',
        capacity: 1.0,
        brand: 'ATE',
        partNumber: '03.9901-6402.2',
        changeInterval: 24000
      },
      coolant: {
        type: 'G13',
        specification: 'VW TL 774-J',
        capacity: 6.5,
        brand: 'Febi',
        partNumber: '39324',
        changeInterval: 150000
      }
    },

    // BMW (WBA, WBS, etc.)
    'WBA': {
      make: 'BMW',
      engineOil: {
        viscosity: '0W-20',
        specification: 'BMW Longlife-17 FE+',
        capacity: 5.2,
        brand: 'Castrol',
        partNumber: '83212365950',
        changeInterval: 15000
      },
      transmissionOil: {
        type: 'ATF',
        viscosity: 'ATF 3+',
        specification: 'BMW ATF 3+',
        capacity: 8.5,
        brand: 'ZF',
        partNumber: 'S671090255',
        changeInterval: 100000
      },
      brakeFluid: {
        type: 'DOT 4',
        specification: 'BMW Quality',
        capacity: 1.0,
        brand: 'ATE',
        partNumber: '83132405977',
        changeInterval: 24000
      },
      coolant: {
        type: 'BMW Coolant',
        specification: 'BMW Quality',
        capacity: 7.0,
        brand: 'BMW',
        partNumber: '83192211191',
        changeInterval: 150000
      }
    },

    // Mercedes-Benz (WDD, WDC, etc.)
    'WDD': {
      make: 'Mercedes-Benz',
      engineOil: {
        viscosity: '5W-30',
        specification: 'MB 229.52',
        capacity: 6.5,
        brand: 'Mobil 1',
        partNumber: 'A000989920811',
        changeInterval: 15000
      },
      transmissionOil: {
        type: 'ATF',
        viscosity: 'MB 236.15',
        specification: 'Mercedes ATF 134',
        capacity: 9.0,
        brand: 'Mercedes',
        partNumber: 'A001989240310',
        changeInterval: 80000
      },
      brakeFluid: {
        type: 'DOT 4+',
        specification: 'MB 331.0',
        capacity: 1.0,
        brand: 'ATE',
        partNumber: 'A000989080807',
        changeInterval: 24000
      },
      coolant: {
        type: 'MB 325.0',
        specification: 'Mercedes Coolant',
        capacity: 8.5,
        brand: 'Mercedes',
        partNumber: 'A000989082511',
        changeInterval: 150000
      }
    },

    // Ford (1FA, 1FB, etc.)
    '1FA': {
      make: 'Ford',
      engineOil: {
        viscosity: '5W-20',
        specification: 'Ford WSS-M2C945-A',
        capacity: 4.7,
        brand: 'Motorcraft',
        partNumber: 'XO-5W20-QSP',
        changeInterval: 10000
      },
      transmissionOil: {
        type: 'ATF',
        viscosity: 'Mercon LV',
        specification: 'Ford Mercon LV',
        capacity: 13.1,
        brand: 'Motorcraft',
        partNumber: 'XT-10-QLVC',
        changeInterval: 150000
      },
      brakeFluid: {
        type: 'DOT 3',
        specification: 'Ford ESA-M6C25-A',
        capacity: 1.0,
        brand: 'Motorcraft',
        partNumber: 'PM-1-C',
        changeInterval: 24000
      },
      powerSteeringFluid: {
        type: 'ATF',
        specification: 'Ford Mercon V',
        capacity: 1.1,
        brand: 'Motorcraft',
        partNumber: 'XT-5-QM',
        changeInterval: 100000
      },
      coolant: {
        type: 'Ford Orange',
        specification: 'Ford WSS-M97B44-D2',
        capacity: 6.9,
        brand: 'Motorcraft',
        partNumber: 'VC-3DIL-B',
        changeInterval: 160000
      }
    },

    // Ford WF0 (European Ford)
    'WF0': {
      make: 'Ford',
      engineOil: {
        viscosity: '5W-30',
        specification: 'Ford WSS-M2C913-D',
        capacity: 4.5,
        brand: 'Castrol',
        partNumber: 'WSS-M2C913-D',
        changeInterval: 10000
      },
      transmissionOil: {
        type: 'ATF',
        viscosity: 'Dexron VI',
        specification: 'GM Dexron VI',
        capacity: 7.2,
        brand: 'Castrol',
        partNumber: 'TQ-D',
        changeInterval: 60000
      },
      brakeFluid: {
        type: 'DOT 4',
        specification: 'ISO 4925 Class 4',
        capacity: 1.1,
        brand: 'ATE',
        partNumber: 'DOT4-1L',
        changeInterval: 24000
      },
      powerSteeringFluid: {
        type: 'ATF',
        specification: 'Dexron III',
        capacity: 1.2,
        brand: 'Castrol',
        partNumber: 'ATF-DEX3',
        changeInterval: 80000
      },
      coolant: {
        type: 'Universal',
        specification: 'G12++',
        capacity: 6.1,
        brand: 'Castrol',
        partNumber: 'G12PP-5L',
        changeInterval: 100000
      }
    }
  }

  // Try to match VIN pattern
  for (const pattern in oilDatabase) {
    if (vin.startsWith(pattern)) {
      return {
        vin,
        make: oilDatabase[pattern].make || 'Unknown',
        model: 'Unknown', // Would be determined from VIN decode
        year: 'Unknown',
        ...oilDatabase[pattern]
      } as VehicleOilData
    }
  }

  // Default/fallback oil specifications
  return {
    vin,
    make: 'Unknown',
    model: 'Unknown',
    year: 'Unknown',
    engineOil: {
      viscosity: '5W-30',
      specification: 'ACEA A3/B4',
      capacity: 4.5,
      brand: 'Generic',
      partNumber: 'N/A',
      changeInterval: 10000
    },
    transmissionOil: {
      type: 'ATF',
      viscosity: 'Dexron VI',
      specification: 'GM Dexron VI',
      capacity: 7.2,
      brand: 'Generic',
      partNumber: 'N/A',
      changeInterval: 60000
    },
    brakeFluid: {
      type: 'DOT 4',
      specification: 'ISO 4925 Class 4',
      capacity: 1.0,
      brand: 'Generic',
      partNumber: 'N/A',
      changeInterval: 24000
    },
    powerSteeringFluid: {
      type: 'ATF',
      specification: 'Dexron III',
      capacity: 1.2,
      brand: 'Generic',
      partNumber: 'N/A',
      changeInterval: 80000
    },
    coolant: {
      type: 'Universal',
      specification: 'BS 6580:2010',
      capacity: 6.0,
      brand: 'Generic',
      partNumber: 'N/A',
      changeInterval: 100000
    },
    additionalLubricants: {
      airConRefrigerant: {
        type: 'R134a',
        specification: 'HFC-134a',
        capacity: 650, // grams
        brand: 'Generic',
        partNumber: 'N/A'
      }
    }
  }
}

// Enhanced VIN decoder (simplified version)
const decodeVIN = (vin: string) => {
  if (vin.length !== 17) {
    throw new Error('Invalid VIN length. VIN must be 17 characters.')
  }

  const wmi = vin.substring(0, 3) // World Manufacturer Identifier
  const vds = vin.substring(3, 9) // Vehicle Descriptor Section
  const vis = vin.substring(9, 17) // Vehicle Identifier Section
  const modelYear = vin.charAt(9) // 10th character is model year

  // Basic manufacturer mapping
  const manufacturers: { [key: string]: string } = {
    'WVW': 'Volkswagen',
    'WV1': 'Volkswagen',
    'WBA': 'BMW',
    'WBS': 'BMW',
    'WDD': 'Mercedes-Benz',
    'WDC': 'Mercedes-Benz',
    '1FA': 'Ford',
    '1FB': 'Ford',
    '1FC': 'Ford',
    'SAJ': 'Jaguar',
    'SAL': 'Land Rover',
    'VF1': 'Renault',
    'VF3': 'Peugeot',
    'VF7': 'Citroën'
  }

  return {
    wmi,
    vds,
    vis,
    manufacturer: manufacturers[wmi] || 'Unknown',
    modelYear
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vin, make, model, year, engineSize, fuelType } = await request.json()

    if (!vin) {
      return NextResponse.json(
        { success: false, error: "VIN is required" },
        { status: 400 }
      )
    }

    console.log(`🛢️ [VEHICLE-OILS] Fetching oil data for VIN: ${vin}`)

    // Decode VIN for additional information
    let vinInfo
    try {
      vinInfo = decodeVIN(vin)
      console.log(`🔍 [VEHICLE-OILS] VIN decoded:`, vinInfo)
    } catch (error) {
      console.warn(`⚠️ [VEHICLE-OILS] VIN decode failed: ${error}`)
      vinInfo = { manufacturer: 'Unknown' }
    }

    // Get oil data based on VIN
    const oilData = getOilDataByVIN(vin)

    if (!oilData) {
      return NextResponse.json(
        { success: false, error: "No oil data found for this VIN" },
        { status: 404 }
      )
    }

    // Enhance with provided vehicle information
    const enhancedOilData: VehicleOilData = {
      ...oilData,
      make: make || vinInfo.manufacturer || oilData.make,
      model: model || oilData.model,
      year: year || oilData.year,
      engineSize: engineSize,
      fuelType: fuelType
    }

    console.log(`✅ [VEHICLE-OILS] Oil data found for ${enhancedOilData.make} ${enhancedOilData.model}`)

    return NextResponse.json({
      success: true,
      data: enhancedOilData,
      message: `Oil specifications retrieved for ${enhancedOilData.make} ${enhancedOilData.model}`
    })

  } catch (error) {
    console.error('❌ [VEHICLE-OILS] Error fetching oil data:', error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch oil data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const vin = searchParams.get('vin')

  if (!vin) {
    return NextResponse.json(
      { success: false, error: "VIN parameter is required" },
      { status: 400 }
    )
  }

  // Reuse POST logic for GET requests
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ vin }),
    headers: { 'Content-Type': 'application/json' }
  }))
}
