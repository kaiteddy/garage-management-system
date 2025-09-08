import { NextRequest, NextResponse } from 'next/server'
import zlib from 'zlib'

/**
 * Your exact working SWS API implementation
 * @param {string} action - API action (e.g., 'GETMOTHISTORY', 'TSB')
 * @param {string} vrm - Vehicle Registration Mark (e.g., 'S31STK')
 * @returns {Promise<any>} - API response (text or parsed JSON)
 */
async function callSWS(action: string, vrm: string): Promise<any> {
  const endpoint = 'https://www.sws-solutions.co.uk/API-V4/VRM_Lookup.php'

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc=',
    'User-Agent': 'GarageManagerPro/1.0'
  }

  const body = new URLSearchParams({
    ACTION: action,
    VRM: vrm,
    APIKEY: "C94A0F3F12E88DB916C008B069E34F65"
  })

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body
  })

  const text = await res.text()

  try {
    return JSON.parse(text) // Try to parse as JSON if possible
  } catch {
    return { raw: text } // Return raw string if not JSON
  }
}

// Complete vehicle image extraction using your working implementation
async function fetchVehicleImageSVG(vrm: string): Promise<{
  success: boolean
  svgString?: string
  vehicleData?: any
  imageUrl?: string
  error?: string
}> {
  try {
    console.log(`🔍 [WORKING-FINAL] Fetching vehicle image SVG for ${vrm}`)

    // Use your exact working SWS call
    const swsData = await callSWS('TSB', vrm)

    // Check for raw response (usually indicates an error)
    if (swsData?.raw) {
      console.log(`⚠️ [WORKING-FINAL] Got raw response for ${vrm}:`, swsData.raw.substring(0, 200))
      return {
        success: false,
        error: `Raw response received: ${swsData.raw.substring(0, 100)}...`
      }
    }

    // Check for API errors
    if (swsData?.["0"]?.reply === "Error") {
      return {
        success: false,
        error: `SWS API Error: ${swsData["0"].code || 'Unknown error'}`
      }
    }

    const carData = swsData?.["0"]?.TechnicalData
    if (!carData) {
      return {
        success: false,
        error: 'No technical data found for this vehicle'
      }
    }

    const imageUrl = carData.modelPictureMimeDataName

    if (!imageUrl || !imageUrl.endsWith(".svgz")) {
      return {
        success: false,
        error: 'No SVGZ image available for this vehicle',
        vehicleData: carData
      }
    }

    console.log(`📥 [WORKING-FINAL] Found SVGZ image URL: ${imageUrl}`)

    // Download and decompress the SVGZ file
    const compressedResponse = await fetch(imageUrl, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'GarageManagerPro/1.0'
      }
    })

    if (!compressedResponse.ok) {
      return {
        success: false,
        error: `Failed to download SVGZ: ${compressedResponse.status}`,
        vehicleData: carData,
        imageUrl
      }
    }

    const compressedData = await compressedResponse.arrayBuffer()
    const decompressedBuffer = zlib.gunzipSync(Buffer.from(compressedData))
    const svgString = decompressedBuffer.toString("utf-8")

    console.log(`✅ [WORKING-FINAL] SVGZ Decompressed: ${svgString.length} chars`)

    return {
      success: true,
      svgString,
      vehicleData: carData,
      imageUrl
    }

  } catch (error: any) {
    console.error(`❌ [WORKING-FINAL] Error:`, error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'S31STK'

    console.log(`🧪 [WORKING-FINAL] Testing complete vehicle image extraction for ${vrm}`)

    const startTime = Date.now()
    const result = await fetchVehicleImageSVG(vrm)
    const endTime = Date.now()

    if (result.success && result.svgString) {
      // Convert SVG to data URL for immediate display
      const base64Svg = Buffer.from(result.svgString).toString('base64')
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`

      return NextResponse.json({
        success: true,
        message: '🎉 Complete vehicle image extraction successful!',
        data: {
          vrm,
          imageUrl: dataUrl,
          svgLength: result.svgString.length,
          svgPreview: result.svgString.substring(0, 300) + '...',
          originalImageUrl: result.imageUrl,
          vehicleDetails: {
            id: result.vehicleData?.id,
            fullName: result.vehicleData?.fullName,
            make: result.vehicleData?.make,
            model: result.vehicleData?.model,
            year: result.vehicleData?.year
          },
          processingTime: `${endTime - startTime}ms`,
          source: 'SWS VRM_Lookup TSB - Real Vehicle Image'
        },
        proof: {
          message: 'Your complete SWS implementation is working perfectly!',
          endpoint: 'https://www.sws-solutions.co.uk/API-V4/VRM_Lookup.php',
          action: 'TSB',
          authentication: 'Basic Auth working',
          svgExtraction: 'SVGZ decompression successful',
          isValidSvg: result.svgString.includes('<svg'),
          hasVehicleGraphics: result.svgString.includes('path') || result.svgString.includes('rect'),
          systemReady: true
        },
        integration: {
          status: '✅ COMPLETE - Ready for production',
          steps: [
            '✅ SWS VRM_Lookup API working',
            '✅ Basic Authentication working',
            '✅ TSB action working',
            '✅ SVGZ download working',
            '✅ Decompression working',
            '✅ Real vehicle image extracted',
            '🚀 System fully operational!'
          ]
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Unknown error',
        data: {
          vrm,
          vehicleData: result.vehicleData,
          originalImageUrl: result.imageUrl,
          processingTime: `${endTime - startTime}ms`
        },
        debug: {
          hasVehicleData: !!result.vehicleData,
          hasImageUrl: !!result.imageUrl,
          errorType: result.error?.includes('API Error') ? 'SWS API Error' : 
                     result.error?.includes('No technical data') ? 'Vehicle Not Found' :
                     result.error?.includes('No SVGZ image') ? 'No Image Available' : 'Unknown'
        }
      })
    }

  } catch (error: any) {
    console.error('❌ [WORKING-FINAL] Test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      debug: {
        errorType: error.constructor?.name || 'Unknown'
      }
    }, { status: 500 })
  }
}

// Test multiple VRMs to find ones with images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const testVrms = body.vrms || ['S31STK', 'BJ11XWZ', 'LS06YLW', 'LN64XFG']

    console.log(`🧪 [WORKING-FINAL-BULK] Testing multiple VRMs for image availability`)

    const results = []

    for (const vrm of testVrms.slice(0, 5)) { // Limit to 5 VRMs
      try {
        const result = await fetchVehicleImageSVG(vrm)
        
        results.push({
          vrm,
          success: result.success,
          hasImage: result.success && !!result.svgString,
          vehicleName: result.vehicleData?.fullName || 'Unknown',
          imageUrl: result.imageUrl || null,
          error: result.error || null,
          svgLength: result.svgString?.length || 0
        })

        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          vrm,
          success: false,
          hasImage: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bulk VRM image test completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        withImages: results.filter(r => r.hasImage).length,
        withoutImages: results.filter(r => r.success && !r.hasImage).length,
        errors: results.filter(r => !r.success).length
      },
      bestResults: results.filter(r => r.hasImage).slice(0, 3) // Show top 3 with images
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
