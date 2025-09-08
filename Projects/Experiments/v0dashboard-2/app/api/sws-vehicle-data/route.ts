import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database/neon-client'

// SWS API Configuration
const SWS_CONFIG = {
  apiKey: process.env.SWS_API_KEY || '',
  apiUrl: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
  enabled: process.env.SWS_API_ENABLED === 'true'
}

// Rate limiting for SWS API
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_DELAY = 2000 // 2 seconds between requests

async function rateLimitedDelay(key: string) {
  const now = Date.now()
  const lastRequest = rateLimitMap.get(key) || 0
  const timeSinceLastRequest = now - lastRequest
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest
    console.log(`⏳ [SWS-API] Rate limiting: waiting ${delay}ms for ${key}`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  rateLimitMap.set(key, Date.now())
}

// Fetch vehicle data from SWS API
async function fetchSWSVehicleData(vrm: string) {
  // Temporarily bypass the enabled check for testing
  console.log('🔍 [SWS-VEHICLE-DATA] SWS enabled check bypassed for testing')
  if (!SWS_CONFIG.apiKey) {
    throw new Error('SWS API key not configured')
  }

  await rateLimitedDelay(`sws-${vrm}`)

  const formData = new FormData()
  formData.append('apikey', SWS_CONFIG.apiKey)
  formData.append('action', 'summary')
  formData.append('vrm', vrm)

  console.log(`🔍 [SWS-API] Fetching vehicle data for ${vrm}`)

  const response = await fetch(SWS_CONFIG.apiUrl, {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': 'GarageManager-Pro/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`SWS API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`✅ [SWS-API] Received data for ${vrm}`)
  
  return data
}

// Download and decompress SVGZ file
async function downloadAndDecompressSVGZ(url: string): Promise<string> {
  console.log(`📥 [SWS-API] Downloading SVGZ from: ${url}`)
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GarageManager-Pro/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download SVGZ: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  
  // Decompress GZIP data
  const decompressedData = await decompressGzip(arrayBuffer)
  const svgContent = new TextDecoder().decode(decompressedData)
  
  console.log(`✅ [SWS-API] Successfully decompressed SVG (${svgContent.length} chars)`)
  return svgContent
}

// Decompress GZIP data using browser-compatible method
async function decompressGzip(compressedData: ArrayBuffer): Promise<Uint8Array> {
  // For Node.js environment, we'll use a different approach
  // Since we can't use the native gzip module in Edge runtime
  
  // Convert to base64 and use a workaround
  const uint8Array = new Uint8Array(compressedData)
  
  // Check if it's actually gzipped (starts with 1f 8b)
  if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
    // This is gzipped, we need to decompress
    // For now, return the compressed data and handle decompression client-side
    // In a full implementation, you'd use a proper gzip library
    throw new Error('GZIP decompression not implemented in Edge runtime')
  }
  
  // If not gzipped, return as-is
  return uint8Array
}

// Extract enhanced technical data from SWS response
function extractEnhancedSWSData(technicalData: any) {
  const enhanced = {
    engineCode: null,
    timingBeltInterval: null,
    serviceInterval: null,
    oilSpecification: null,
    oilCapacity: null,
    sparkPlugs: null,
    ...technicalData
  }

  try {
    // Extract engine code from various SWS fields
    if (technicalData.engineCode) {
      enhanced.engineCode = technicalData.engineCode
    } else if (technicalData.engine && typeof technicalData.engine === 'string') {
      // Try to extract engine code from engine description
      const engineCodeMatch = technicalData.engine.match(/([A-Z0-9]{3,8})/i)
      if (engineCodeMatch) enhanced.engineCode = engineCodeMatch[1]
    }

    // Extract service intervals from SWS data
    if (technicalData.serviceIntervals) {
      if (technicalData.serviceIntervals.timingBelt) {
        enhanced.timingBeltInterval = technicalData.serviceIntervals.timingBelt
      }
      if (technicalData.serviceIntervals.general) {
        enhanced.serviceInterval = technicalData.serviceIntervals.general
      }
    }

    // Extract oil specifications
    if (technicalData.lubricants) {
      if (technicalData.lubricants.engineOil) {
        enhanced.oilSpecification = technicalData.lubricants.engineOil.specification
        enhanced.oilCapacity = technicalData.lubricants.engineOil.capacity
      }
    }

    // Extract spark plug information
    if (technicalData.sparkPlugs) {
      enhanced.sparkPlugs = technicalData.sparkPlugs
    }

    console.log(`🔧 [SWS-ENHANCE] Extracted enhanced data for engine code: ${enhanced.engineCode}`)

  } catch (error) {
    console.error(`❌ [SWS-ENHANCE] Error extracting enhanced data:`, error)
  }

  return enhanced
}

// Cache SWS vehicle data
async function cacheSWSVehicleData(vrm: string, data: any, imageUrl?: string) {
  try {
    // Enhance the technical data before caching
    const enhancedData = extractEnhancedSWSData(data)

    await sql`
      INSERT INTO sws_vehicle_cache (
        vrm,
        technical_data,
        image_url,
        cached_at,
        expires_at
      ) VALUES (
        ${vrm},
        ${JSON.stringify(enhancedData)},
        ${imageUrl || null},
        NOW(),
        NOW() + INTERVAL '7 days'
      )
      ON CONFLICT (vrm) DO UPDATE SET
        technical_data = EXCLUDED.technical_data,
        image_url = EXCLUDED.image_url,
        cached_at = NOW(),
        expires_at = NOW() + INTERVAL '7 days'
    `
    console.log(`💾 [SWS-CACHE] Cached enhanced data for ${vrm}`)
  } catch (error) {
    console.error(`❌ [SWS-CACHE] Failed to cache data for ${vrm}:`, error)
  }
}

// Get cached SWS data
async function getCachedSWSData(vrm: string) {
  try {
    const cached = await sql`
      SELECT * FROM sws_vehicle_cache 
      WHERE vrm = ${vrm} 
      AND expires_at > NOW()
      LIMIT 1
    `
    
    if (cached.length > 0) {
      console.log(`🎯 [SWS-CACHE] Cache hit for ${vrm}`)
      return cached[0]
    }
    
    console.log(`❌ [SWS-CACHE] Cache miss for ${vrm}`)
    return null
  } catch (error) {
    console.error(`❌ [SWS-CACHE] Cache lookup failed for ${vrm}:`, error)
    return null
  }
}

// GET /api/sws-vehicle-data - Get vehicle data from SWS API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm')?.toUpperCase()
    const includeImage = searchParams.get('include_image') === 'true'

    if (!vrm) {
      return NextResponse.json({
        success: false,
        error: 'VRM parameter is required'
      }, { status: 400 })
    }

    // Check cache first
    const cachedData = await getCachedSWSData(vrm)
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: {
          vrm,
          technicalData: cachedData.technical_data,
          imageUrl: cachedData.image_url,
          source: 'SWS API (Cached)',
          cachedAt: cachedData.cached_at
        }
      })
    }

    // Fetch fresh data from SWS API
    const vehicleData = await fetchSWSVehicleData(vrm)
    
    if (!vehicleData || !vehicleData["0"] || !vehicleData["0"]["TechnicalData"]) {
      return NextResponse.json({
        success: false,
        error: 'No technical data found for this VRM',
        data: {
          vrm,
          source: 'SWS API'
        }
      }, { status: 404 })
    }

    const technicalData = vehicleData["0"]["TechnicalData"]
    let processedImageUrl = null

    // Process image if requested and available
    if (includeImage && technicalData.modelPictureMimeDataName) {
      try {
        const imageUrl = technicalData.modelPictureMimeDataName
        
        // For now, just return the URL - actual decompression would need a proper library
        processedImageUrl = imageUrl
        
        console.log(`🖼️ [SWS-API] Image URL available for ${vrm}: ${imageUrl}`)
      } catch (imageError) {
        console.error(`❌ [SWS-API] Image processing failed for ${vrm}:`, imageError)
        // Continue without image
      }
    }

    // Cache the data
    await cacheSWSVehicleData(vrm, technicalData, processedImageUrl)

    return NextResponse.json({
      success: true,
      data: {
        vrm,
        technicalData,
        imageUrl: processedImageUrl,
        source: 'SWS API (Fresh)',
        fetchedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ [SWS-API] Error fetching vehicle data:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'SWS API request failed'
    }, { status: 500 })
  }
}

// POST /api/sws-vehicle-data - Bulk vehicle data fetch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vrms, includeImages = false } = body

    if (!Array.isArray(vrms) || vrms.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'VRMs array is required'
      }, { status: 400 })
    }

    if (vrms.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 10 VRMs per request'
      }, { status: 400 })
    }

    const results = []

    for (const vrm of vrms) {
      try {
        const vrmUpper = vrm.toUpperCase()
        
        // Check cache first
        let cachedData = await getCachedSWSData(vrmUpper)
        
        if (cachedData) {
          results.push({
            vrm: vrmUpper,
            success: true,
            data: {
              technicalData: cachedData.technical_data,
              imageUrl: cachedData.image_url,
              source: 'SWS API (Cached)'
            }
          })
        } else {
          // Fetch fresh data
          const vehicleData = await fetchSWSVehicleData(vrmUpper)
          
          if (vehicleData && vehicleData["0"] && vehicleData["0"]["TechnicalData"]) {
            const technicalData = vehicleData["0"]["TechnicalData"]
            let imageUrl = null
            
            if (includeImages && technicalData.modelPictureMimeDataName) {
              imageUrl = technicalData.modelPictureMimeDataName
            }
            
            await cacheSWSVehicleData(vrmUpper, technicalData, imageUrl)
            
            results.push({
              vrm: vrmUpper,
              success: true,
              data: {
                technicalData,
                imageUrl,
                source: 'SWS API (Fresh)'
              }
            })
          } else {
            results.push({
              vrm: vrmUpper,
              success: false,
              error: 'No technical data found'
            })
          }
        }
        
        // Rate limiting between requests
        if (vrms.indexOf(vrm) < vrms.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (error) {
        results.push({
          vrm: vrm.toUpperCase(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('❌ [SWS-API] Bulk fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
