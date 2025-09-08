import { NextRequest, NextResponse } from 'next/server'

const SWS_API_CONFIG = {
  apiKey: process.env.SWS_API_KEY || "C94A0F3F12E88DB916C008B069E34F65",
  username: process.env.SWS_USERNAME || "GarageAssistantGA4",
  password: process.env.SWS_PASSWORD || "HGu76XT5sI1L0XgH816X72F34R991Zd_4g",
  technicalDataUrl: "https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php"
}

const HAYNESPRO_ASSETS_BASE = "https://www.haynespro-assets.com/workshop/images"

// Common vehicle diagram IDs based on make/model patterns
const VEHICLE_DIAGRAM_PATTERNS = {
  'VOLKSWAGEN': {
    'GOLF': ['vw_golf_outline', 'golf_mk7_diagram', 'vw_golf_engine_bay'],
    'POLO': ['vw_polo_outline', 'polo_diagram'],
    'PASSAT': ['vw_passat_outline', 'passat_diagram'],
    'TIGUAN': ['vw_tiguan_outline', 'tiguan_suv_diagram']
  },
  'AUDI': {
    'A3': ['audi_a3_outline', 'a3_diagram'],
    'A4': ['audi_a4_outline', 'a4_diagram'],
    'Q5': ['audi_q5_outline', 'q5_suv_diagram']
  },
  'BMW': {
    '3 SERIES': ['bmw_3series_outline', 'bmw_e90_diagram'],
    '5 SERIES': ['bmw_5series_outline', 'bmw_f10_diagram'],
    'X3': ['bmw_x3_outline', 'x3_suv_diagram']
  },
  'FORD': {
    'FOCUS': ['ford_focus_outline', 'focus_mk3_diagram'],
    'FIESTA': ['ford_fiesta_outline', 'fiesta_diagram'],
    'TRANSIT': ['ford_transit_outline', 'transit_van_diagram']
  }
}

// Function to get vehicle info from DVLA API
async function getVehicleInfo(vrm: string) {
  try {
    const response = await fetch(`/api/dvla-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registration: vrm })
    })
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Error getting vehicle info:', error)
    return null
  }
}

// Function to generate potential diagram IDs
function generateDiagramIds(make: string, model: string, year?: string): string[] {
  const diagrams: string[] = []
  
  // Add make-specific patterns
  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()
  
  // Generic patterns
  diagrams.push(
    `${make.toLowerCase()}_${model.toLowerCase()}_outline`,
    `${make.toLowerCase()}_${model.toLowerCase()}_diagram`,
    `${make.toLowerCase()}_${model.toLowerCase()}_engine`,
    `${makeUpper}_${modelUpper}_OUTLINE`,
    `${makeUpper}_${modelUpper}_DIAGRAM`
  )
  
  // Year-specific patterns if available
  if (year) {
    diagrams.push(
      `${make.toLowerCase()}_${model.toLowerCase()}_${year}`,
      `${makeUpper}_${modelUpper}_${year}`
    )
  }
  
  // Check predefined patterns
  if (VEHICLE_DIAGRAM_PATTERNS[makeUpper] && VEHICLE_DIAGRAM_PATTERNS[makeUpper][modelUpper]) {
    diagrams.push(...VEHICLE_DIAGRAM_PATTERNS[makeUpper][modelUpper])
  }
  
  // Generic vehicle diagrams
  diagrams.push(
    'generic_car_outline',
    'vehicle_diagram_generic',
    'car_outline_standard',
    'automotive_diagram_base'
  )
  
  return [...new Set(diagrams)] // Remove duplicates
}

// Function to check if SVG exists and download it
async function downloadSvgDiagram(diagramId: string): Promise<string | null> {
  try {
    const svgzUrl = `${HAYNESPRO_ASSETS_BASE}/${diagramId}.svgz`
    const svgUrl = `${HAYNESPRO_ASSETS_BASE}/${diagramId}.svg`
    
    // Try SVGZ first (compressed)
    let response = await fetch(svgzUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/svg+xml,image/*,*/*'
      }
    })
    
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      // Decompress SVGZ (gzip compressed SVG)
      const decompressed = await decompressGzip(buffer)
      return decompressed
    }
    
    // Try regular SVG
    response = await fetch(svgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/svg+xml,image/*,*/*'
      }
    })
    
    if (response.ok) {
      return await response.text()
    }
    
    return null
  } catch (error) {
    console.error(`Error downloading diagram ${diagramId}:`, error)
    return null
  }
}

// Function to decompress GZIP data
async function decompressGzip(buffer: ArrayBuffer): Promise<string> {
  try {
    // Use Node.js zlib for decompression
    const zlib = await import('zlib')
    const compressed = Buffer.from(buffer)
    const decompressed = zlib.gunzipSync(compressed)
    return decompressed.toString('utf-8')
  } catch (error) {
    console.error('Error decompressing GZIP:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')
    
    if (!vrm) {
      return NextResponse.json({
        success: false,
        error: 'VRM parameter is required'
      }, { status: 400 })
    }
    
    console.log(`🎨 [VEHICLE-DIAGRAMS] Searching for diagrams for ${vrm}`)
    
    // Get vehicle information
    const vehicleInfo = await getVehicleInfo(vrm)
    if (!vehicleInfo) {
      return NextResponse.json({
        success: false,
        error: 'Could not retrieve vehicle information'
      }, { status: 404 })
    }
    
    const { make, model, yearOfManufacture } = vehicleInfo
    console.log(`🚗 [VEHICLE-DIAGRAMS] Vehicle: ${make} ${model} (${yearOfManufacture})`)
    
    // Generate potential diagram IDs
    const diagramIds = generateDiagramIds(make, model, yearOfManufacture?.toString())
    console.log(`🔍 [VEHICLE-DIAGRAMS] Checking ${diagramIds.length} potential diagrams`)
    
    // Try to download diagrams
    const foundDiagrams: Array<{id: string, svg: string}> = []
    
    for (const diagramId of diagramIds.slice(0, 10)) { // Limit to first 10 to avoid timeout
      const svg = await downloadSvgDiagram(diagramId)
      if (svg) {
        foundDiagrams.push({ id: diagramId, svg })
        console.log(`✅ [VEHICLE-DIAGRAMS] Found diagram: ${diagramId}`)
        
        // Stop after finding 3 diagrams to avoid too many requests
        if (foundDiagrams.length >= 3) break
      }
    }
    
    if (foundDiagrams.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No vehicle diagrams found',
        searchedIds: diagramIds.slice(0, 10)
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      vrm,
      vehicle: { make, model, year: yearOfManufacture },
      diagrams: foundDiagrams,
      searchedIds: diagramIds.slice(0, 10)
    })
    
  } catch (error) {
    console.error('❌ [VEHICLE-DIAGRAMS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
