import { NextRequest, NextResponse } from 'next/server'
import zlib from 'zlib'

// Your exact working implementation
async function fetchVehicleImageSVG(apiKey: string, vrm: string): Promise<string | null> {
  try {
    console.log(`🔍 [WORKING-SWS] Fetching vehicle image SVG for ${vrm} using TSB action`)

    // Use the exact working request format from your example
    const requestBody = JSON.stringify({
      apikey: apiKey,
      action: 'TSB',
      vrm: vrm
    })

    const response = await fetch("https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey, // Try both 'x-api-key' and 'apikey' if needed
        'User-Agent': 'GarageManagerPro/1.0',
        // Add other headers here if required by SWS
      },
      body: requestBody
    })

    if (!response.ok) {
      console.error(`❌ [WORKING-SWS] API call failed: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      throw new Error(`SWS API returned ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const responseText = await response.text()
    console.log(`📄 [WORKING-SWS] Response length: ${responseText.length} chars`)

    let swsData
    try {
      swsData = JSON.parse(responseText)
    } catch (parseError) {
      console.log(`❌ [WORKING-SWS] JSON parse error for ${vrm}:`, parseError)
      throw new Error(`Failed to parse SWS response as JSON: ${responseText.substring(0, 200)}`)
    }

    const carData = swsData?.["0"]?.TechnicalData
    const imageUrl = carData?.modelPictureMimeDataName

    if (!imageUrl || !imageUrl.endsWith(".svgz")) {
      console.warn(`⚠️ [WORKING-SWS] No SVGZ image found for vehicle: ${vrm}`)
      return null
    }

    console.log(`📥 [WORKING-SWS] Found SVGZ image URL: ${imageUrl}`)

    // Download and decompress the SVGZ file
    const compressedResponse = await fetch(imageUrl, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'GarageAssistant/1.0'
      }
    })

    if (!compressedResponse.ok) {
      console.error(`❌ [WORKING-SWS] Failed to download SVGZ: ${compressedResponse.status}`)
      throw new Error(`Failed to download SVGZ: ${compressedResponse.status}`)
    }

    const compressedData = await compressedResponse.arrayBuffer()
    const decompressedBuffer = zlib.gunzipSync(Buffer.from(compressedData))
    const svgString = decompressedBuffer.toString("utf-8")

    console.log(`✅ [WORKING-SWS] SVGZ Decompressed: ${svgString.length} chars`)
    return svgString

  } catch (error: any) {
    console.error(`❌ [WORKING-SWS] Error fetching SVGZ image:`, error.message || error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vrm = searchParams.get('vrm') || 'LS06YLW'
    const apiKey = searchParams.get('apikey') || process.env.SWS_API_KEY || 'C94A0F3F12E88DB916C008B069E34F65'

    console.log(`🧪 [WORKING-SWS] Testing your exact working implementation for ${vrm}`)
    console.log(`🔑 [WORKING-SWS] Using API key: ${apiKey.substring(0, 8)}...`)

    const startTime = Date.now()
    const svgString = await fetchVehicleImageSVG(apiKey, vrm)
    const endTime = Date.now()

    if (svgString) {
      // Convert SVG to data URL for immediate display
      const base64Svg = Buffer.from(svgString).toString('base64')
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`

      return NextResponse.json({
        success: true,
        message: '🎉 Your working SWS implementation is successful!',
        data: {
          vrm,
          imageUrl: dataUrl,
          svgLength: svgString.length,
          svgPreview: svgString.substring(0, 300) + '...',
          source: 'SWS TSB API - Real Vehicle Image',
          processingTime: `${endTime - startTime}ms`
        },
        proof: {
          message: 'This proves your SWS TSB implementation works perfectly',
          apiEndpoint: 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Module.php',
          action: 'TSB',
          isValidSvg: svgString.includes('<svg'),
          hasVehicleGraphics: svgString.includes('path') || svgString.includes('rect') || svgString.includes('circle'),
          compressionWorking: true
        },
        integration: {
          status: 'Ready for integration',
          steps: [
            '✅ SWS TSB API call working',
            '✅ SVGZ download working', 
            '✅ Decompression working',
            '✅ SVG extraction working',
            '🚀 Ready to integrate into main system'
          ]
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No SVGZ image found for this vehicle',
        data: {
          vrm,
          apiKey: apiKey.substring(0, 8) + '...',
          message: 'Vehicle exists but no image available'
        }
      })
    }

  } catch (error: any) {
    console.error('❌ [WORKING-SWS] Test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      debug: {
        errorType: error.constructor?.name || 'Unknown',
        message: error.message || 'Unknown error',
        stack: error.stack?.split('\n').slice(0, 3) // First 3 lines of stack
      },
      troubleshooting: [
        'Check if the API key is valid and active',
        'Verify the VRM exists in the SWS database',
        'Ensure the vehicle has an associated SVGZ image',
        'Check network connectivity to SWS servers'
      ]
    }, { status: 500 })
  }
}
