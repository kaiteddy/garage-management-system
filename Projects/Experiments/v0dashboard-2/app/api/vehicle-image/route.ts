import { NextRequest, NextResponse } from 'next/server'

// Vehicle image sources and APIs
const IMAGE_SOURCES = {
  // Free stock photo sources
  UNSPLASH: 'https://source.unsplash.com',
  // Could add more sources like:
  // PIXABAY: 'https://pixabay.com/api/',
  // PEXELS: 'https://api.pexels.com/v1/search',
}

// Common vehicle image patterns
const VEHICLE_IMAGE_PATTERNS = {
  'VOLKSWAGEN': {
    'GOLF': ['volkswagen-golf', 'vw-golf', 'golf-hatchback'],
    'POLO': ['volkswagen-polo', 'vw-polo', 'polo-car'],
    'PASSAT': ['volkswagen-passat', 'vw-passat', 'passat-sedan'],
    'TIGUAN': ['volkswagen-tiguan', 'vw-tiguan', 'tiguan-suv']
  },
  'BMW': {
    '3 SERIES': ['bmw-3-series', 'bmw-320i', 'bmw-sedan'],
    '5 SERIES': ['bmw-5-series', 'bmw-520i', 'bmw-executive'],
    'X3': ['bmw-x3', 'bmw-suv', 'x3-crossover']
  },
  'AUDI': {
    'A3': ['audi-a3', 'audi-hatchback', 'a3-sportback'],
    'A4': ['audi-a4', 'audi-sedan', 'a4-avant'],
    'Q5': ['audi-q5', 'audi-suv', 'q5-quattro']
  },
  'FORD': {
    'FOCUS': ['ford-focus', 'focus-hatchback', 'ford-compact'],
    'FIESTA': ['ford-fiesta', 'fiesta-car', 'ford-small'],
    'TRANSIT': ['ford-transit', 'transit-van', 'ford-commercial']
  },
  'MERCEDES': {
    'C-CLASS': ['mercedes-c-class', 'mercedes-benz-c', 'c-class-sedan'],
    'E-CLASS': ['mercedes-e-class', 'mercedes-benz-e', 'e-class-executive'],
    'GLC': ['mercedes-glc', 'glc-suv', 'mercedes-crossover']
  }
}

// Function to get DVLA vehicle data
async function getVehicleData(vrm: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dvla-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registration: vrm })
    })
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Error getting vehicle data:', error)
    return null
  }
}

// Function to generate search terms for vehicle images
function generateImageSearchTerms(make: string, model: string, year?: string): string[] {
  const terms: string[] = []
  
  const makeUpper = make.toUpperCase()
  const modelUpper = model.toUpperCase()
  
  // Add specific patterns if available
  if (VEHICLE_IMAGE_PATTERNS[makeUpper] && VEHICLE_IMAGE_PATTERNS[makeUpper][modelUpper]) {
    terms.push(...VEHICLE_IMAGE_PATTERNS[makeUpper][modelUpper])
  }
  
  // Add generic patterns
  terms.push(
    `${make} ${model}`,
    `${make} ${model} car`,
    `${make} ${model} vehicle`,
    `${make.toLowerCase()}-${model.toLowerCase()}`,
    `${make} car`,
    `${model} car`
  )
  
  // Add year-specific terms if available
  if (year) {
    terms.unshift(
      `${year} ${make} ${model}`,
      `${make} ${model} ${year}`
    )
  }
  
  return terms
}

// Function to get vehicle image using multiple sources
async function getVehicleImageUrl(make: string, model: string, vrm: string, year?: string): Promise<{ url: string, source: string }> {
  // Try different image sources in order of preference

  try {
    // First, try to use our custom SVG generator (always works)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const svgUrl = `${baseUrl}/api/vehicle-image-svg?vrm=${encodeURIComponent(vrm)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${year ? `&year=${encodeURIComponent(year)}` : ''}`

    return {
      url: svgUrl,
      source: 'Generated SVG'
    }

  } catch (error) {
    console.error(`Error generating vehicle image:`, error)

    // Ultimate fallback - simple placeholder
    return {
      url: `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f3f4f6"/>
          <rect x="50" y="50" width="300" height="100" fill="#6b7280" rx="10"/>
          <text x="200" y="95" text-anchor="middle" font-family="Arial" font-size="14" fill="white">${make}</text>
          <text x="200" y="115" text-anchor="middle" font-family="Arial" font-size="14" fill="white">${model}</text>
          <text x="200" y="135" text-anchor="middle" font-family="Arial" font-size="12" fill="white">${vrm}</text>
        </svg>
      `).toString('base64')}`,
      source: 'Fallback'
    }
  }
}

// Function to get a fallback generic car image
function getGenericCarImage(): string {
  return `${IMAGE_SOURCES.UNSPLASH}/800x600/?car,automobile,vehicle`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')
    const make = searchParams.get('make')
    const model = searchParams.get('model')
    const year = searchParams.get('year')
    
    if (!vrm) {
      return NextResponse.json({
        success: false,
        error: 'VRM parameter is required'
      }, { status: 400 })
    }
    
    console.log(`🖼️ [VEHICLE-IMAGE] Fetching image for ${vrm}`)
    
    let vehicleMake = make
    let vehicleModel = model
    let vehicleYear = year
    
    // If make/model not provided, try to get from DVLA
    if (!vehicleMake || !vehicleModel) {
      console.log(`🔍 [VEHICLE-IMAGE] Getting vehicle data from DVLA for ${vrm}`)
      const vehicleData = await getVehicleData(vrm)
      if (vehicleData) {
        vehicleMake = vehicleData.make || vehicleMake
        vehicleModel = vehicleData.model || vehicleModel
        vehicleYear = vehicleData.yearOfManufacture?.toString() || vehicleYear
        console.log(`✅ [VEHICLE-IMAGE] Got vehicle data: ${vehicleMake} ${vehicleModel} (${vehicleYear})`)
      }
    }
    
    if (!vehicleMake || !vehicleModel) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine vehicle make/model'
      }, { status: 404 })
    }
    
    // Generate search terms
    const searchTerms = generateImageSearchTerms(vehicleMake, vehicleModel, vehicleYear)
    console.log(`🔍 [VEHICLE-IMAGE] Searching with terms: ${searchTerms.slice(0, 3).join(', ')}`)
    
    // Try to get vehicle image from HaynesPro first
    let imageUrl: string
    let source: string

    try {
      console.log(`🔍 [VEHICLE-IMAGE] Trying HaynesPro for ${vrm}`)
      const haynesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/haynes-vehicle-image?vrm=${vrm}`)
      const haynesData = await haynesResponse.json()

      if (haynesData.success && haynesData.imageUrl) {
        imageUrl = haynesData.imageUrl
        source = haynesData.source
        console.log(`✅ [VEHICLE-IMAGE] Found HaynesPro image for ${vrm}`)
      } else {
        throw new Error('No HaynesPro image found')
      }
    } catch (error) {
      console.log(`⚠️ [VEHICLE-IMAGE] HaynesPro failed, using generated image: ${error}`)
      // Fall back to generated SVG
      const imageResult = await getVehicleImageUrl(vehicleMake, vehicleModel, vrm, vehicleYear)
      imageUrl = imageResult.url
      source = imageResult.source
    }
    
    console.log(`✅ [VEHICLE-IMAGE] Found image for ${vrm}: ${imageUrl}`)
    
    return NextResponse.json({
      success: true,
      vrm,
      imageUrl,
      source,
      make: vehicleMake,
      model: vehicleModel,
      year: vehicleYear,
      searchTerms: searchTerms.slice(0, 3)
    })
    
  } catch (error) {
    console.error('❌ [VEHICLE-IMAGE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'This endpoint only accepts GET requests'
  }, { status: 405 })
}
